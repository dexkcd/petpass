import { Badge } from "@/components/ui/card";
import type { BookingStatus, ClinicStatus } from "@/generated/prisma/enums";
import { titleCase } from "@/lib/utils";

const bookingTones: Record<BookingStatus, "neutral" | "success" | "warning" | "danger" | "info" | "primary"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  DECLINED: "danger",
  CANCELLED_BY_OWNER: "neutral",
  CANCELLED_BY_PROVIDER: "neutral",
  COMPLETED: "info",
  NO_SHOW: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={bookingTones[status]}>{titleCase(status)}</Badge>;
}

const clinicTones: Record<ClinicStatus, "neutral" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
  SUSPENDED: "neutral",
};

export function ClinicStatusBadge({ status }: { status: ClinicStatus }) {
  return <Badge tone={clinicTones[status]}>{titleCase(status)}</Badge>;
}
