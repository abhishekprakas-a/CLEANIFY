import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDto, toDtoList } from "@/lib/serialize";
import { buildMeta } from "@/lib/pagination";
import { escapeRegex } from "@/lib/sanitize";
import { recordAudit } from "@/lib/audit";
import { jobStatus, userStatus } from "@/constants";
import { bookingModel, customerModel, jobModel } from "@/models";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/schemas/customerSchema";
import type {
  Booking,
  Customer,
  CustomerHistory,
  Job,
  ListQuery,
  PaginationMeta,
  SessionUser,
} from "@/types";

export const customerService = {
  /** Paginated list with free-text search (name/mobile/address) + status filter. */
  async list(
    query: ListQuery,
    filters: { status?: string } = {},
  ): Promise<{ items: Customer[]; meta: PaginationMeta }> {
    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (filters.status) filter.status = filters.status;
    if (query.q) {
      const rx = new RegExp(escapeRegex(query.q), "i");
      filter.$or = [
        { customerName: rx },
        { mobileNumber: rx },
        { address: rx },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      customerModel
        .find(filter)
        .sort(query.sort)
        .skip(skip)
        .limit(query.limit)
        .lean(),
      customerModel.countDocuments(filter),
    ]);

    return {
      items: toDtoList<Customer>(docs),
      meta: buildMeta(total, query.page, query.limit),
    };
  },

  async getById(id: string): Promise<Customer> {
    await dbConnect();
    const doc = await customerModel.findById(id).lean();
    if (!doc) throw ApiError.notFound("Customer not found");
    return toDto<Customer>(doc);
  },

  async create(
    input: CreateCustomerInput,
    user: SessionUser,
  ): Promise<Customer> {
    await dbConnect();

    // Soft uniqueness: warn on duplicate active mobile number.
    const existing = await customerModel.findOne({
      mobileNumber: input.mobileNumber,
      status: userStatus.active,
    });
    if (existing) {
      throw ApiError.conflict(
        "A customer with this mobile number already exists",
      );
    }

    const created = await customerModel.create({
      ...input,
      googleMapLocation: input.googleMapLocation || undefined,
      createdBy: user.id,
    });
    return toDto<Customer>(created.toObject());
  },

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    await dbConnect();
    const updated = await customerModel
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .lean();
    if (!updated) throw ApiError.notFound("Customer not found");
    return toDto<Customer>(updated);
  },

  /**
   * Soft delete: customers referenced by bookings/jobs must stay for history, so
   * "delete" deactivates (status = inactive) rather than removing the document.
   * A customer with no bookings is hard-deleted.
   */
  async remove(
    id: string,
    user: SessionUser,
  ): Promise<{ deleted: boolean; deactivated: boolean }> {
    await dbConnect();
    const customer = await customerModel.findById(id);
    if (!customer) throw ApiError.notFound("Customer not found");

    const hasBookings = await bookingModel.exists({ customerId: id });
    const result = hasBookings
      ? { deleted: false, deactivated: true }
      : { deleted: true, deactivated: false };

    if (hasBookings) {
      customer.status = userStatus.inactive;
      await customer.save();
    } else {
      await customer.deleteOne();
    }

    await recordAudit({
      actor: user.id,
      actorName: user.name,
      action: result.deactivated ? "customer.deactivate" : "customer.delete",
      entityType: "customer",
      entityId: id,
    });
    return result;
  },

  /** Customer detail + their bookings, jobs, and summary stats. */
  async getHistory(id: string): Promise<CustomerHistory> {
    await dbConnect();
    const customer = await customerModel.findById(id).lean();
    if (!customer) throw ApiError.notFound("Customer not found");

    const [bookings, jobs, completedJobs] = await Promise.all([
      bookingModel.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
      jobModel.find({ customer: id }).sort({ createdAt: -1 }).lean(),
      jobModel.countDocuments({ customer: id, status: jobStatus.completed }),
    ]);

    return {
      customer: toDto<Customer>(customer),
      bookings: toDtoList<Booking>(bookings),
      jobs: toDtoList<Job>(jobs),
      stats: {
        totalBookings: bookings.length,
        totalJobs: jobs.length,
        completedJobs,
      },
    };
  },
};
