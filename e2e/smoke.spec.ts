import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Password123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]:has-text('Log in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("public search ranks the nearest clinic first and filters by category", async ({ page }) => {
  await page.goto("/search?lat=14.5547&lng=121.0244");
  const names = page.locator("ol li p.font-semibold");
  await expect(names.first()).toHaveText("Makati Paws Veterinary Clinic");
  await page.goto("/search?lat=14.5547&lng=121.0244&category=exotic-reptile");
  await expect(names).toHaveCount(1);
  await expect(names.first()).toHaveText("Quezon City Exotics & Avian");
});

test("owner can book, clinic confirms with a meeting link, owner sees the join button", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await login(owner, "owner@petpass.dev");

  await owner.goto("/clinics/makati-paws-veterinary-clinic");
  await owner.locator("li:has-text('Online video consultation') a:has-text('Book')").click();
  await owner.waitForURL(/\/owner\/book\//);

  // pick the first weekday at least 3 days out
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  await owner.fill("#date", d.toISOString().slice(0, 10));
  await owner.locator("[role=radio]").last().click();
  await owner.selectOption("#petId", { index: 1 });
  await owner.click("button:has-text('Request booking')");
  await owner.waitForURL(/\/owner\/bookings\/[a-z0-9]+\?new=1/);
  const bookingId = new URL(owner.url()).pathname.split("/").pop()!;
  await expect(owner.getByText("Waiting for the clinic to confirm")).toBeVisible();

  const clinicCtx = await browser.newContext();
  const clinic = await clinicCtx.newPage();
  clinic.on("dialog", (dialog) => dialog.accept());
  await login(clinic, "provider1@petpass.dev");
  await clinic.goto(`/provider/bookings/${bookingId}`);
  await clinic.click("button:has-text('Confirm')");
  await expect(clinic.getByText("Add the video meeting link")).toBeVisible();
  await clinic.fill("#meetingUrl", "https://meet.google.com/e2e-smoke");
  await clinic.click("button:has-text('Save'):near(#meetingUrl)");
  await expect(clinic.getByText("Meeting link saved")).toBeVisible();

  await owner.goto(`/owner/bookings/${bookingId}`);
  await expect(owner.locator("a:has-text('Join video call')")).toHaveAttribute("href", "https://meet.google.com/e2e-smoke");

  // clean up: owner cancels (more than 24h ahead)
  owner.on("dialog", (dialog) => dialog.accept(""));
  await owner.click("button:has-text('Cancel booking')");
  await expect(owner.getByText("Cancelled By Owner")).toBeVisible();

  await ownerCtx.close();
  await clinicCtx.close();
});

test("record sharing gives a clinic access that revocation removes", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  owner.on("dialog", (dialog) => dialog.accept());
  await login(owner, "owner@petpass.dev");
  await owner.goto("/owner/pets");
  await owner.click("a:has-text('Mochi')");
  await owner.waitForURL(/\/owner\/pets\//);
  const petId = new URL(owner.url()).pathname.split("/").pop()!;

  await owner.goto(`/owner/pets/${petId}/sharing`);
  const pasig = await owner.locator("#clinicId option", { hasText: "Pasig Grooming" }).getAttribute("value");
  await owner.selectOption("#clinicId", pasig!);
  await owner.click("button:has-text('Share records')");
  await expect(owner.getByText("Access granted")).toBeVisible();

  const clinicCtx = await browser.newContext();
  const clinic = await clinicCtx.newPage();
  await login(clinic, "provider4@petpass.dev");
  await clinic.goto("/provider/patients");
  await expect(clinic.getByText("Mochi")).toBeVisible();

  await owner.click("li:has-text('Pasig Grooming') button:has-text('Revoke')");
  await expect(owner.locator("li:has-text('Pasig Grooming') :text('Active')")).toHaveCount(0);
  const res = await clinic.goto(`/provider/patients/${petId}`);
  expect(res?.status()).toBe(404);

  await ownerCtx.close();
  await clinicCtx.close();
});
