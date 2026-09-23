import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Button, ButtonLink } from "@/components/ui/button";
import { getSessionUser, homeForRole } from "@/lib/auth-helpers";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">🐾</span>
          PetPass
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/search" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Find a vet
          </Link>
          {user ? (
            <>
              <ButtonLink href={homeForRole(user.role)} variant="secondary" size="sm">
                My dashboard
              </ButtonLink>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Sign up
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
