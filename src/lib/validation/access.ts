import { z } from "zod";
import { AccessScope } from "@/generated/prisma/enums";

export const GrantSchema = z.object({
  petId: z.string().min(1),
  clinicId: z.string().min(1, "Choose a clinic"),
  scope: z.enum(AccessScope).default("READ_WRITE"),
  expiresInDays: z.enum(["30", "90", "365", "never"]).default("90"),
});

export const GrantIdSchema = z.object({ petId: z.string().min(1), grantId: z.string().min(1) });
