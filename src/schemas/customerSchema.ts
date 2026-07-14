import { z } from "zod";

/**
 * Shared geo point schema. Kept here (rather than customer-specific) because the
 * attendance and photo schemas import it for capture coordinates.
 */
export const geoSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^[+]?[0-9\s-]{8,15}$/, "Enter a valid mobile number");

// Location links are a convenience field. Accept anything a user might paste —
// full URLs, protocol-less short links (maps.app.goo.gl/…), or links shared from
// WhatsApp/Maps — rather than rejecting valid links that fail strict URL parsing.
const googleMapLocationSchema = z
  .string()
  .trim()
  .max(500, "Link is too long")
  .optional()
  .or(z.literal(""));

export const createCustomerSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  mobileNumber: mobileNumberSchema,
  address: z.string().trim().min(5, "Address is required"),
  googleMapLocation: googleMapLocationSchema,
  notes: z.string().trim().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

/** Query params for the customer list (search + filter + pagination handled in lib). */
export const customerQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
