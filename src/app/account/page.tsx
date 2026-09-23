import { redirect } from "next/navigation";
import { homeForRole, requireUser } from "@/lib/auth-helpers";

/** Post-login landing: sends each role to its own dashboard. */
export default async function AccountPage() {
  const user = await requireUser("/account");
  redirect(homeForRole(user.role));
}
