import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import { buildMeta } from "@/lib/pagination";
import {
  attendancePolicy,
  attendanceStatus,
  roles,
  userStatus,
  type AttendanceStatus,
} from "@/constants";
import { attendanceModel, userModel } from "@/models";
import type { CheckInInput, CheckOutInput } from "@/schemas/attendanceSchema";
import type {
  Attendance,
  AttendanceCounts,
  DailyAttendanceReport,
  GeoPoint,
  ListQuery,
  PaginationMeta,
  RangeAttendanceReport,
  SessionUser,
} from "@/types";

/** Local YYYY-MM-DD key (not UTC, so the "day" matches the user's timezone). */
function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Classify punctuality from the check-in time against the shift policy. */
function classifyCheckIn(checkInTime: Date): AttendanceStatus {
  const cutoff = new Date(checkInTime);
  cutoff.setHours(
    attendancePolicy.shiftStartHour,
    attendancePolicy.shiftStartMinute + attendancePolicy.lateGraceMinutes,
    0,
    0,
  );
  return checkInTime.getTime() > cutoff.getTime()
    ? attendanceStatus.late
    : attendanceStatus.present;
}

/** On check-out, demote to halfDay when worked hours fall below the threshold. */
function classifyOnCheckout(
  current: AttendanceStatus,
  workingHours: number,
): AttendanceStatus {
  if (workingHours < attendancePolicy.halfDayHours) {
    return attendanceStatus.halfDay;
  }
  return current;
}

function emptyCounts(): AttendanceCounts {
  return { present: 0, late: 0, halfDay: 0, absent: 0, total: 0 };
}

function tally(counts: AttendanceCounts, status: AttendanceStatus): void {
  counts[status] += 1;
  counts.total += 1;
}

/** Inclusive calendar range for a period anchored on a date. */
function periodRange(
  period: "weekly" | "monthly",
  anchor: Date,
): { from: string; to: string; days: number } {
  if (period === "monthly") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: dateKey(start), to: dateKey(end), days: end.getDate() };
  }
  // weekly: Monday..Sunday containing the anchor
  const day = anchor.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: dateKey(start), to: dateKey(end), days: 7 };
}

async function activeTechnicians() {
  return userModel
    .find({ role: roles.technician, status: userStatus.active })
    .select("name")
    .sort({ name: 1 })
    .lean();
}

export const attendanceService = {
  /**
   * Daily check-in. If already checked in (and not out), it's a no-op error. If
   * the day was already checked **out**, re-opens it (handles an accidental
   * check-out) — clears the check-out so the technician can resume.
   */
  async checkIn(input: CheckInInput, user: SessionUser): Promise<Attendance> {
    await dbConnect();
    const date = dateKey();

    const existing = await attendanceModel.findOne({ userId: user.id, date });
    if (existing) {
      if (!existing.checkOutTime) {
        throw ApiError.conflict("You are already checked in today");
      }
      // Re-open the day after an accidental check-out.
      await attendanceModel.updateOne(
        { _id: existing._id },
        {
          $unset: { checkOutTime: "", workingHours: "" },
          ...(input.location
            ? { $set: { "geoLocation.checkIn": input.location } }
            : {}),
        },
      );
      const reopened = await attendanceModel.findById(existing._id).lean();
      return toDto<Attendance>(reopened!);
    }

    const checkInTime = new Date();
    const created = await attendanceModel.create({
      userId: user.id,
      date,
      checkInTime,
      status: classifyCheckIn(checkInTime),
      geoLocation: input.location ? { checkIn: input.location } : undefined,
    });
    return toDto<Attendance>(created.toObject());
  },

  /** Daily check-out. Computes working hours and finalises the status. */
  async checkOut(input: CheckOutInput, user: SessionUser): Promise<Attendance> {
    await dbConnect();
    const date = dateKey();

    const record = await attendanceModel.findOne({ userId: user.id, date });
    if (!record) throw ApiError.notFound("No check-in found for today");
    if (record.checkOutTime) {
      throw ApiError.conflict("You have already checked out today");
    }

    const checkOutTime = new Date();
    const workingHours =
      Math.round(
        ((checkOutTime.getTime() - record.checkInTime.getTime()) / 3_600_000) *
          100,
      ) / 100;

    record.checkOutTime = checkOutTime;
    record.workingHours = workingHours;
    record.status = classifyOnCheckout(
      record.status as AttendanceStatus,
      workingHours,
    );
    if (input.location) {
      record.geoLocation = {
        ...record.geoLocation,
        checkOut: input.location as GeoPoint,
      };
    }
    await record.save();
    return toDto<Attendance>(record.toObject());
  },

  /** Today's record for the current user (drives the technician widget). */
  async today(user: SessionUser): Promise<Attendance | null> {
    await dbConnect();
    const record = await attendanceModel
      .findOne({ userId: user.id, date: dateKey() })
      .lean();
    return record ? toDto<Attendance>(record) : null;
  },

  /** Recent history for the current user (technician screen). */
  async history(user: SessionUser, limit = 30): Promise<Attendance[]> {
    await dbConnect();
    const docs = await attendanceModel
      .find({ userId: user.id })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    return toDtoList<Attendance>(docs);
  },

  /**
   * Daily report: one row per active technician (absent when no record). Used
   * by the admin dashboard.
   */
  async dailyReport(date: string): Promise<DailyAttendanceReport> {
    await dbConnect();
    const [techs, records] = await Promise.all([
      activeTechnicians(),
      attendanceModel.find({ date }).lean(),
    ]);

    const byUser = new Map(records.map((r) => [String(r.userId), r]));
    const counts = emptyCounts();

    const rows = techs.map((tech) => {
      const rec = byUser.get(String(tech._id));
      const status = (rec?.status ??
        attendanceStatus.absent) as AttendanceStatus;
      tally(counts, status);
      return {
        userId: String(tech._id),
        name: tech.name,
        status,
        checkInTime: rec?.checkInTime?.toISOString(),
        checkOutTime: rec?.checkOutTime?.toISOString(),
        workingHours: rec?.workingHours,
      };
    });

    return { date, counts, rows };
  },

  /**
   * Range report (weekly/monthly): per-technician aggregation of present/late/
   * half/absent days and total hours over the inclusive range.
   */
  async rangeReport(
    from: string,
    to: string,
    days: number,
    userId?: string,
  ): Promise<RangeAttendanceReport> {
    await dbConnect();
    const techFilter = userId ? { _id: userId } : {};
    const [techs, records] = await Promise.all([
      userModel
        .find({
          role: roles.technician,
          status: userStatus.active,
          ...techFilter,
        })
        .select("name")
        .sort({ name: 1 })
        .lean(),
      attendanceModel
        .find({ date: { $gte: from, $lte: to }, ...(userId ? { userId } : {}) })
        .lean(),
    ]);

    const grouped = new Map<
      string,
      { present: number; late: number; halfDay: number; hours: number }
    >();
    for (const rec of records) {
      const key = String(rec.userId);
      const g = grouped.get(key) ?? {
        present: 0,
        late: 0,
        halfDay: 0,
        hours: 0,
      };
      if (rec.status === attendanceStatus.present) g.present += 1;
      else if (rec.status === attendanceStatus.late) g.late += 1;
      else if (rec.status === attendanceStatus.halfDay) g.halfDay += 1;
      g.hours += rec.workingHours ?? 0;
      grouped.set(key, g);
    }

    const counts = emptyCounts();
    const rows = techs.map((tech) => {
      const g = grouped.get(String(tech._id)) ?? {
        present: 0,
        late: 0,
        halfDay: 0,
        hours: 0,
      };
      const recordedDays = g.present + g.late + g.halfDay;
      const absentDays = Math.max(0, days - recordedDays);
      counts.present += g.present;
      counts.late += g.late;
      counts.halfDay += g.halfDay;
      counts.absent += absentDays;
      counts.total += days;
      return {
        userId: String(tech._id),
        name: tech.name,
        presentDays: g.present,
        lateDays: g.late,
        halfDays: g.halfDay,
        absentDays,
        totalHours: Math.round(g.hours * 100) / 100,
      };
    });

    return { from, to, workingDays: days, counts, rows };
  },

  /** Paginated raw attendance records for admins (filter by user/date range). */
  async list(
    query: ListQuery,
    filters: { userId?: string; from?: string; to?: string } = {},
  ): Promise<{ items: Attendance[]; meta: PaginationMeta }> {
    await dbConnect();
    const filter: Record<string, unknown> = {};
    if (filters.userId) filter.userId = filters.userId;
    if (filters.from || filters.to) {
      filter.date = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      attendanceModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate("userId", "name phone")
        .lean(),
      attendanceModel.countDocuments(filter),
    ]);

    return {
      items: toDtoList<Attendance>(docs),
      meta: buildMeta(total, query.page, query.limit),
    };
  },

  /** Dispatch a daily / weekly / monthly report. */
  async getReport(
    period: "daily" | "weekly" | "monthly",
    dateStr?: string,
    userId?: string,
  ): Promise<DailyAttendanceReport | RangeAttendanceReport> {
    const anchor = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    if (period === "daily") {
      return attendanceService.dailyReport(dateKey(anchor));
    }
    const { from, to, days } = periodRange(period, anchor);
    return attendanceService.rangeReport(from, to, days, userId);
  },
};
