/**
 * Attendance classification. `present` / `late` / `halfDay` are stored on a
 * record; `absent` is **derived** for reporting (an active technician with no
 * record for the day) and never stored.
 */
export const attendanceStatus = {
  present: "present",
  late: "late",
  halfDay: "halfDay",
  absent: "absent",
} as const;

export type AttendanceStatus =
  (typeof attendanceStatus)[keyof typeof attendanceStatus];

export const allAttendanceStatuses: AttendanceStatus[] =
  Object.values(attendanceStatus);

/**
 * Attendance policy used to auto-classify status. Tunable in one place.
 * - Check-in at/after `shiftStart` + `lateGraceMinutes` ⇒ `late`.
 * - Worked hours below `halfDayHours` (on checkout) ⇒ `halfDay`.
 * - `fullDayHours` is informational (target hours for a full day).
 */
export const attendancePolicy = {
  shiftStartHour: 9, // 09:00 local
  shiftStartMinute: 0,
  lateGraceMinutes: 15, // late after 09:15
  halfDayHours: 4,
  fullDayHours: 8,
} as const;
