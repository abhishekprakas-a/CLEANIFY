import { z } from "zod";
import { allRoles } from "@/constants";

/**
 * Email is normalized (trim + lowercase) BEFORE validation, so a stray space or
 * a mobile-keyboard auto-capitalized first letter can never cause a login to
 * miss the stored (already trimmed + lowercased) account. Applied identically on
 * create and login so the two sides always match.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Public self-registration. Always creates a technician pending verification. */
export const signupSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: emailSchema,
    phone: z.string().trim().min(8, "Enter a valid phone number"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: emailSchema,
  phone: z.string().trim().min(8, "Enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(allRoles as [string, ...string[]]),
});

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })
  .extend({
    status: z.enum(["active", "inactive", "pending"]).optional(),
    password: z.string().min(6).optional(),
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
