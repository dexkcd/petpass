"use client";

import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Button that asks for confirmation, then runs a server action.
 * The action is bound by the caller (e.g. `deleteThing.bind(null, id)`).
 */
export function ConfirmButton({
  action,
  confirm,
  children,
  variant = "ghost",
  size = "sm",
  className,
}: {
  action: () => Promise<unknown>;
  confirm?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const result = (await action()) as { ok?: boolean; error?: string } | undefined;
          if (result && result.ok === false && result.error) window.alert(result.error);
        });
      }}
    >
      {children}
    </Button>
  );
}
