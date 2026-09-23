"use client";

import { useTransition } from "react";
import { setUserRoleAction } from "@/actions/admin";
import { Select } from "@/components/ui/form";
import type { Role } from "@/generated/prisma/enums";

export function RoleSelect({ userId, role, disabled }: { userId: string; role: Role; disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Select
      defaultValue={role}
      disabled={disabled || pending}
      className="w-36"
      onChange={(e) => {
        const next = e.target.value as Role;
        if (!window.confirm(`Change role to ${next}?`)) {
          e.target.value = role;
          return;
        }
        start(async () => {
          const r = await setUserRoleAction(userId, next);
          if (!r.ok) window.alert(r.error);
        });
      }}
    >
      <option value="OWNER">Owner</option>
      <option value="PROVIDER">Provider</option>
      <option value="ADMIN">Admin</option>
    </Select>
  );
}
