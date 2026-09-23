import type { Metadata } from "next";
import { RoleSelect } from "@/components/admin/role-select";
import { PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireUser("/admin/users");
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { pets: true, bookingsAsOwner: true } }, memberships: { where: { active: true }, include: { clinic: { select: { name: true } } } } },
  });
  return (
    <>
      <PageHeader title="Users" />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search by name or email" className="w-full max-w-sm rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        <button className="rounded-lg bg-slate-100 px-4 text-sm hover:bg-slate-200">Search</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Clinic</th>
              <th className="px-4 py-2">Pets</th>
              <th className="px-4 py-2">Bookings</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">
                  <p className="font-medium">{u.name ?? "—"}</p>
                  <p className="text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-2"><RoleSelect userId={u.id} role={u.role} disabled={u.id === me.id} /></td>
                <td className="px-4 py-2">{u.memberships[0]?.clinic.name ?? "—"}</td>
                <td className="px-4 py-2">{u._count.pets}</td>
                <td className="px-4 py-2">{u._count.bookingsAsOwner}</td>
                <td className="px-4 py-2">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
