"use client";

import { useTransition } from "react";
import { rejectClinicAction, suspendClinicAction, verifyClinicAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import type { ClinicStatus } from "@/generated/prisma/enums";

export function ClinicReviewButtons({ clinicId, status }: { clinicId: string; status: ClinicStatus }) {
  const [pending, start] = useTransition();
  function run(action: (fd: FormData) => Promise<unknown>, askReason: boolean) {
    const fd = new FormData();
    fd.set("clinicId", clinicId);
    if (askReason) {
      const reason = window.prompt("Reason (shown to the clinic):") ?? "";
      if (!reason.trim()) return;
      fd.set("reason", reason);
    }
    start(async () => {
      await action(fd);
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "VERIFIED" ? (
        <Button size="sm" disabled={pending} onClick={() => run(verifyClinicAction, false)}>
          Verify
        </Button>
      ) : null}
      {status === "PENDING" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(rejectClinicAction, true)}>
          Reject
        </Button>
      ) : null}
      {status === "VERIFIED" ? (
        <Button size="sm" variant="danger" disabled={pending} onClick={() => run(suspendClinicAction, true)}>
          Suspend
        </Button>
      ) : null}
    </div>
  );
}
