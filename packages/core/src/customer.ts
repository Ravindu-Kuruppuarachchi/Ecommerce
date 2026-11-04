import { z } from "zod/v3";

/** Shared by checkout, customer profiles and the API for every template. */
export const customerAddressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  district: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(10).optional(),
});

export const customerProfileSchema = z.object({
  firstName: z.string().trim().max(60),
  lastName: z.string().trim().max(60),
  phone: z.string().trim().max(20),
  savedAddress: customerAddressSchema.nullable(),
});

export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  savedAddress: CustomerAddress | null;
}
