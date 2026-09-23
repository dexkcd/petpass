import { z } from "zod";
import { MembershipRole, ServiceKind, ServiceMode, Species } from "@/generated/prisma/enums";
import { isValidTimeZone } from "@/lib/utils";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const ClinicSchema = z.object({
  name: z.string().trim().min(2, "Enter the clinic or business name").max(120),
  description: optionalText(2000),
  email: z.string().trim().email("Enter a valid email").optional(),
  phone: optionalText(40),
  website: z.string().trim().url("Enter a full URL, e.g. https://example.com").optional(),
  addressLine1: z.string().trim().min(3, "Enter the street address").max(160),
  addressLine2: optionalText(160),
  city: z.string().trim().min(1, "Enter the city").max(80),
  region: optionalText(80),
  postalCode: optionalText(20),
  country: z.string().trim().length(2, "Use a 2-letter country code").toUpperCase().default("GB"),
  placeId: optionalText(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid time zone"),
});
export type ClinicInput = z.infer<typeof ClinicSchema>;

export const ServiceSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  name: z.string().trim().min(2, "Enter a service name").max(120),
  description: optionalText(2000),
  price: z.coerce.number().min(0, "Price cannot be negative").max(100000),
  currency: z.string().trim().length(3).toUpperCase().default("GBP"),
  durationMin: z.coerce.number().int().min(5, "At least 5 minutes").max(480, "At most 8 hours"),
  bufferMin: z.coerce.number().int().min(0).max(120).default(0),
  mode: z.enum(ServiceMode),
  species: z.array(z.enum(Species)).default([]),
  active: z.coerce.boolean().default(true),
});
export type ServiceInput = z.infer<typeof ServiceSchema>;

export const StaffInviteSchema = z.object({
  email: z.string().trim().email("Enter the staff member's account email"),
  role: z.enum(MembershipRole).default("STAFF"),
  title: optionalText(80),
});

export const ClinicReviewSchema = z.object({
  clinicId: z.string().min(1),
  reason: optionalText(500),
});

export const CategorySchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  name: z.string().trim().min(2).max(80),
  kind: z.enum(ServiceKind),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  icon: optionalText(8),
});
