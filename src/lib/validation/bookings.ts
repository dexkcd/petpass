import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/enums";

const timeRange = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startMinutes: z.coerce.number().int().min(0).max(24 * 60),
    endMinutes: z.coerce.number().int().min(0).max(24 * 60),
  })
  .refine((r) => r.endMinutes > r.startMinutes, { message: "End must be after start", path: ["endMinutes"] });

export const WeeklyAvailabilitySchema = z.object({
  staffId: z.string().optional(),
  rules: z.array(timeRange).max(50),
});

export const BlockSchema = z
  .object({
    staffId: z.string().optional(),
    startsAt: z.string().min(1, "Start is required"), // local datetime input
    endsAt: z.string().min(1, "End is required"),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.endsAt > b.startsAt, { message: "End must be after start", path: ["endsAt"] });

export const SlotsQuerySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  staffId: z.string().optional(),
});

export const CreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  petId: z.string().min(1, "Choose a pet"),
  startsAt: z.string().datetime({ message: "Pick a time slot" }),
  staffId: z.string().optional(),
  ownerNotes: z.string().trim().max(2000).optional(),
});

export const TransitionSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(BookingStatus),
  reason: z.string().trim().max(500).optional(),
});

export const MeetingUrlSchema = z.object({
  bookingId: z.string().min(1),
  meetingUrl: z
    .string()
    .trim()
    .url("Enter the full meeting link, e.g. https://meet.google.com/...")
    .refine((u) => u.startsWith("https://"), "Meeting links must start with https://"),
});

export const ProviderNotesSchema = z.object({
  bookingId: z.string().min(1),
  providerNotes: z.string().trim().max(4000).optional(),
});

export const MAX_BOOKING_DAYS_AHEAD = 60;
