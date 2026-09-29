import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const password = process.env.HCS_DEV_PASSWORD;
if (!password)
  throw new Error(
    "Set HCS_DEV_PASSWORD for explicitly seeded synthetic accounts",
  );
async function login(page: Page, account = "admin") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${account}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
}
test("authenticated overview, registration, update, archive and session logout", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText("Live facility data")).toBeVisible();
  await page
    .getByRole("link", { name: "Register patient", exact: true })
    .click();
  const name = `Browser Synthetic ${Date.now()}`;
  await page.getByLabel("Full name *", { exact: true }).fill(name);
  await page.getByLabel("Date of birth *").fill("1991-05-06");
  await page.getByLabel("Gender (self-described) *").fill("Not specified");
  await page.getByLabel("Contact number *").fill("+12025550199");
  await page.getByLabel("Email address *").fill(`e2e${Date.now()}@example.com`);
  await page
    .getByLabel("Address *", { exact: true })
    .fill("Synthetic browser test address");
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page
    .getByLabel("Address", { exact: true })
    .fill("Updated browser test address");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Updated browser test address", { exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive patient" }).click();
  await expect(
    page.getByRole("heading", { name: "Patient directory", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
test("server-backed availability, booking and cancellation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/appointments/new");
  await page
    .getByRole("combobox", { name: "Patient *", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "Clinician *", exact: true })
    .selectOption({ index: 1 });
  await expect(page.locator(".window-list button").first()).toBeVisible();
  await page.locator(".window-list button").nth(3).click();
  await page.getByRole("button", { name: "Confirm appointment" }).click();
  await expect(
    page.getByRole("heading", { name: "Booking information" }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await expect(page.getByText("CANCELLED", { exact: true })).toBeVisible();
});
test("billing draft is not payment and supports a recorded dispute", async ({
  page,
}) => {
  await login(page, "patient");
  await page.goto("/billing");
  await page.getByRole("link", { name: "Open invoice draft" }).first().click();
  await expect(
    page.getByText("No payment collection", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Reason", { exact: true })
    .fill("Synthetic browser test dispute");
  await page.getByRole("button", { name: "Record dispute" }).click();
  await expect(
    page.getByText("Dispute recorded. No external case has been opened."),
  ).toBeVisible();
  await page.goto("/clinical-ai");
  await expect(
    page.getByRole("heading", { name: "No approved model configured" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This tool provides informational decision support and does not provide a medical diagnosis. Clinical decisions must be made by qualified healthcare professionals.",
    ),
  ).toBeVisible();
});
test("auditor reads append-only trail and cannot browse patient directory", async ({
  page,
}) => {
  await login(page, "auditor");
  await page.goto("/audit");
  await expect(
    page.getByRole("heading", { name: "Facility audit events" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.goto("/patients");
  await expect(
    page.getByText("Access is restricted", { exact: true }),
  ).toBeVisible();
});
test("mobile navigation and accessible structure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Patients", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Patient directory", exact: true }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(results.violations).toEqual([]);
});

test("desktop login and dashboard accessibility scans", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto("/login");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await login(page);
  await expect(page.locator(".appointment-row").first()).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("facility management, channel preferences and account security are real API screens", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/manage");
  await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Staff roster" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const name = `Synthetic department ${Date.now()}`;
  await page.getByLabel("New department name").fill(name);
  await page
    .getByRole("button", { name: "Create department", exact: true })
    .click();
  await expect(
    page.locator(".session-row").filter({ hasText: name }),
  ).toBeVisible();
  await page.goto("/notification-settings");
  await page.getByLabel("Email preference").selectOption("yes");
  await page
    .getByRole("button", { name: "Save notification preferences" })
    .click();
  await page.reload();
  await expect(page.getByLabel("Email preference")).toHaveValue("yes");
  await page.goto("/security");
  await expect(
    page.getByRole("heading", { name: "Authenticator protection" }),
  ).toBeVisible();
  await expect(page.getByText("Not enabled", { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("CSV preview approval executes atomically through the real worker and export downloads", async ({
  page,
}) => {
  await login(page);
  await page.goto("/exchange");
  const n = Date.now();
  const name = `Worker Synthetic ${n}`;
  await page
    .getByLabel("Patient CSV", { exact: true })
    .fill(
      `full_name,date_of_birth,gender,contact_number,email,address\n${name},1990-02-01,Not specified,+12025550198,worker${n}@example.com,Synthetic worker address\n`,
    );
  await page
    .getByRole("button", { name: "Validate and stage preview" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Import preview", exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Approve reviewed import" }).click();
  await expect(
    page
      .locator("tbody tr")
      .filter({ hasText: "IMPORT" })
      .first()
      .getByText("SUCCEEDED", { exact: true }),
  ).toBeVisible({ timeout: 25000 });
  await page
    .getByLabel("Authorized export purpose")
    .fill(`Synthetic browser export ${n}`);
  await page.getByRole("button", { name: "Queue encrypted export" }).click();
  const exportRow = page
    .locator("tbody tr")
    .filter({ hasText: "EXPORT" })
    .first();
  await expect(exportRow.getByText("SUCCEEDED", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  const download = page.waitForEvent("download");
  await exportRow.getByRole("button", { name: "Download export" }).click();
  expect((await download).suggestedFilename()).toBe("hcs-patients.csv");
  await page.goto("/patients");
  await expect(page.getByText(name, { exact: true })).toBeVisible();
});

test("patient snapshot history and preservation hold lifecycle", async ({
  page,
}) => {
  await login(page);
  await page.goto("/patients");
  await page.getByRole("link", { name: /Open / }).first().click();
  await page
    .getByRole("link", { name: "View profile history & preservation holds" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profile version history" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const reason = `Synthetic browser preservation ${Date.now()}`;
  await page.getByLabel("Preservation reason").fill(reason);
  await page.getByRole("button", { name: "Record preservation hold" }).click();
  const row = page.locator(".session-row").filter({ hasText: reason });
  await expect(row).toBeVisible();
  page.on("dialog", (dialog) =>
    dialog.accept("Synthetic authorized browser release"),
  );
  await row.getByRole("button", { name: "Record hold release" }).click();
  await expect(
    page.getByText("Released hold", { exact: true }).first(),
  ).toBeVisible();
});

test("assigned clinician uploads to quarantine; unavailable scanner never releases a document", async ({
  page,
}) => {
  await login(page, "doctor");
  await page.goto("/patients");
  await page.getByRole("link", { name: /Open / }).first().click();
  await page.getByRole("link", { name: "View protected documents" }).click();
  await expect(
    page.getByRole("heading", { name: "Document quarantine" }),
  ).toBeVisible();
  const filename = `synthetic-${Date.now()}.pdf`;
  await page.getByLabel("Synthetic document file").setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% Synthetic structural sample only\n%%EOF"),
  });
  await page
    .getByRole("button", { name: "Upload to quarantine", exact: true })
    .click();
  const row = page.locator("tbody tr").filter({ hasText: filename });
  await expect(row.getByText("QUARANTINED", { exact: true })).toBeVisible();
  await expect(row.getByText("NOT_CONFIGURED", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(row.getByRole("button", { name: "Download file" })).toHaveCount(
    0,
  );
  const retryKeys: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/retry-scan") && r.request().method() === "POST",
    );
    await row.getByRole("button", { name: "Retry scanner" }).click();
    const queued = await response;
    expect(queued.status()).toBe(200);
    retryKeys.push(queued.request().headers()["idempotency-key"]);
    expect((await queued.json()).data.scan_status).toBe("PENDING");
    await expect(
      row.getByRole("button", { name: "Retry scanner" }),
    ).toBeEnabled({ timeout: 20000 });
  }
  expect(new Set(retryKeys).size).toBe(2);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
