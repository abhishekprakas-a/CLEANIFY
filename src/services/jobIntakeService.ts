import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { recordAudit } from "@/lib/audit";
import { bookingStatus, userStatus } from "@/constants";
import { totalChargeOf } from "@/models/tankSchema";
import { bookingModel, customerModel } from "@/models";
import { jobService } from "./jobService";
import { schedulingService } from "./schedulingService";
import type { JobIntakeInput } from "@/schemas/jobSchema";
import type { Job, SessionUser } from "@/types";

/**
 * Resolve the customer for an intake: use the selected existing customer, or
 * reuse an active customer with the same mobile, or create a new one.
 */
async function resolveCustomer(
  customer: JobIntakeInput["customer"],
  user: SessionUser,
): Promise<string> {
  if (customer.id) {
    const exists = await customerModel.exists({ _id: customer.id });
    if (!exists) throw ApiError.badRequest("Selected customer does not exist");
    return customer.id;
  }

  const name = customer.customerName?.trim();
  const mobile = customer.mobileNumber?.trim();
  if (!name || !mobile) {
    throw ApiError.badRequest("New customer needs a name and mobile number");
  }

  // Reuse an existing active customer on the same mobile rather than duplicating.
  const existing = await customerModel.findOne({
    mobileNumber: mobile,
    status: userStatus.active,
  });
  if (existing) return String(existing._id);

  const created = await customerModel.create({
    customerName: name,
    mobileNumber: mobile,
    address: customer.address?.trim() || "",
    googleMapLocation: customer.googleMapLocation?.trim() || undefined,
    notes: customer.notes?.trim() || undefined,
    status: userStatus.active,
    createdBy: user.id,
  });
  return String(created._id);
}

export const jobIntakeService = {
  /**
   * Unified "Job Card" intake — creates the customer (if new), a booking, and a
   * job in one step, then optionally assigns a crew. Reuses the existing
   * job/scheduling services so the state machine and guards stay identical.
   */
  async create(input: JobIntakeInput, user: SessionUser): Promise<Job> {
    await dbConnect();

    // Validate crew availability BEFORE creating anything, so a conflict/
    // capacity/inactive rejection can't leave an orphaned customer/booking/job.
    const technicianIds = [...new Set(input.technicianIds)];
    for (const technicianId of technicianIds) {
      await schedulingService.assertTechnicianAvailable(
        technicianId,
        input.scheduledDate,
        input.scheduledTime || undefined,
      );
    }

    const customerId = await resolveCustomer(input.customer, user);

    const tanks = input.tanks.map((t) => ({
      name: t.name?.trim() || undefined,
      tankType: t.tankType,
      capacityLitres: t.capacityLitres,
      quantity: t.quantity ?? 1,
      cleaningCharge: t.cleaningCharge,
    }));
    const totalCharge = totalChargeOf(tanks);

    // 1. Booking (pending) — createFromBooking flips it to scheduled.
    const booking = await bookingModel.create({
      customerId,
      tanks,
      totalCharge,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime || undefined,
      specialInstructions: input.specialInstructions || undefined,
      bookingStatus: bookingStatus.pending,
      statusHistory: [
        {
          status: bookingStatus.pending,
          at: new Date(),
          by: user.id,
          note: "Created via job card",
        },
      ],
      createdBy: user.id,
    });

    // 2. Job from the booking (pending → scheduled, copies tanks/charge).
    let job = await jobService.createFromBooking(
      {
        booking: String(booking._id),
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
      },
      user,
    );

    // 3. Optional crew assignment (scheduled → assigned).
    if (technicianIds.length > 0) {
      job = await schedulingService.assign(
        job.id,
        {
          technicianIds,
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
        },
        user,
      );
    }

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: "job.intake",
      entityType: "job",
      entityId: job.id,
      meta: {
        jobCode: job.jobCode,
        customerId,
        tanks: tanks.length,
        technicians: technicianIds.length,
      },
    });

    return job;
  },
};
