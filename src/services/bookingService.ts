import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import { buildMeta } from "@/lib/pagination";
import { escapeRegex } from "@/lib/sanitize";
import { bookingStatus } from "@/constants";
import { bookingModel, customerModel } from "@/models";
import type {
  CancelBookingInput,
  CreateBookingInput,
  RescheduleBookingInput,
  UpdateBookingInput,
} from "@/schemas/bookingSchema";
import type { Booking, ListQuery, PaginationMeta, SessionUser } from "@/types";

/** Statuses that can no longer be edited / rescheduled / cancelled. */
const terminalStatuses: string[] = [
  bookingStatus.cancelled,
  bookingStatus.completed,
];

function statusEvent(status: string, user: SessionUser, note?: string) {
  return { status, at: new Date(), by: user.id, note };
}

export const bookingService = {
  /** Paginated list with status/date filters and customer-name search. */
  async list(
    query: ListQuery,
    filters: { status?: string; from?: string; to?: string } = {},
  ): Promise<{ items: Booking[]; meta: PaginationMeta }> {
    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (filters.status) filter.bookingStatus = filters.status;
    if (filters.from || filters.to) {
      filter.scheduledDate = {
        ...(filters.from ? { $gte: new Date(filters.from) } : {}),
        ...(filters.to ? { $lte: new Date(`${filters.to}T23:59:59`) } : {}),
      };
    }

    // Search by customer name/mobile → resolve matching customer ids first.
    if (query.q) {
      const rx = new RegExp(escapeRegex(query.q), "i");
      const customerIds = await customerModel
        .find({ $or: [{ customerName: rx }, { mobileNumber: rx }] })
        .select("_id")
        .lean();
      filter.customerId = { $in: customerIds.map((c) => c._id) };
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      bookingModel
        .find(filter)
        .sort(query.sort)
        .skip(skip)
        .limit(query.limit)
        .populate("customerId", "customerName mobileNumber")
        .lean(),
      bookingModel.countDocuments(filter),
    ]);

    return {
      items: toDtoList<Booking>(docs),
      meta: buildMeta(total, query.page, query.limit),
    };
  },

  async getById(id: string): Promise<Booking> {
    await dbConnect();
    const doc = await bookingModel
      .findById(id)
      .populate("customerId", "customerName mobileNumber address")
      .lean();
    if (!doc) throw ApiError.notFound("Booking not found");
    return toDto<Booking>(doc);
  },

  async create(input: CreateBookingInput, user: SessionUser): Promise<Booking> {
    await dbConnect();

    const customer = await customerModel.exists({ _id: input.customerId });
    if (!customer) throw ApiError.badRequest("Customer does not exist");

    const created = await bookingModel.create({
      ...input,
      scheduledTime: input.scheduledTime || undefined,
      bookingStatus: bookingStatus.pending,
      statusHistory: [statusEvent(bookingStatus.pending, user, "Created")],
      createdBy: user.id,
    });
    return toDto<Booking>(created.toObject());
  },

  /** Edit booking details (not a status transition). */
  async update(id: string, input: UpdateBookingInput): Promise<Booking> {
    await dbConnect();
    const booking = await bookingModel.findById(id);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (terminalStatuses.includes(booking.bookingStatus)) {
      throw ApiError.conflict(
        `A ${booking.bookingStatus} booking can no longer be edited`,
      );
    }

    Object.assign(booking, input);
    if (input.scheduledTime === "") booking.scheduledTime = undefined;
    await booking.save();
    return toDto<Booking>(booking.toObject());
  },

  /** Move the scheduled date/time; marks the booking rescheduled. */
  async reschedule(
    id: string,
    input: RescheduleBookingInput,
    user: SessionUser,
  ): Promise<Booking> {
    await dbConnect();
    const booking = await bookingModel.findById(id);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (terminalStatuses.includes(booking.bookingStatus)) {
      throw ApiError.conflict(
        `A ${booking.bookingStatus} booking cannot be rescheduled`,
      );
    }

    booking.scheduledDate = input.scheduledDate;
    booking.scheduledTime = input.scheduledTime || undefined;
    booking.bookingStatus = bookingStatus.rescheduled;
    booking.statusHistory.push(
      statusEvent(
        bookingStatus.rescheduled,
        user,
        input.note ?? "Rescheduled",
      ) as never,
    );
    await booking.save();
    return toDto<Booking>(booking.toObject());
  },

  /** Cancel with a reason. */
  async cancel(
    id: string,
    input: CancelBookingInput,
    user: SessionUser,
  ): Promise<Booking> {
    await dbConnect();
    const booking = await bookingModel.findById(id);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (terminalStatuses.includes(booking.bookingStatus)) {
      throw ApiError.conflict(
        `This booking is already ${booking.bookingStatus}`,
      );
    }

    booking.bookingStatus = bookingStatus.cancelled;
    booking.cancellationReason = input.reason;
    booking.statusHistory.push(
      statusEvent(bookingStatus.cancelled, user, input.reason) as never,
    );
    await booking.save();
    return toDto<Booking>(booking.toObject());
  },

  /** The booking plus its status-change audit trail. */
  async history(id: string): Promise<Booking> {
    return bookingService.getById(id);
  },
};
