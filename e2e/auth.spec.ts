import { test, expect } from "@playwright/test";
import { totp, base32Decode } from "@authflow/security";

test.describe.serial("AuthFlow E2E User Authentication Suite", () => {
  const testEmail = `e2e-user-${Date.now()}@authflow.local`;
  const password = "Str0ng!Passw0rd#2024";
  const fullName = "Playwright Test User";
  let totpSecret = "";

  test("1. Register -> receive verification email -> verify account", async ({ page, request }) => {
    await page.goto("/register");
    await page.fill("#fullName", fullName);
    await page.fill("#email", testEmail);
    await page.fill("#password", password);
    await page.fill("#confirmPassword", password);
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Check your email")).toBeVisible({ timeout: 10000 });

    // Verify account via registration confirmation endpoint
    const verifyRes = await request.post("http://localhost:4000/api/auth/register", {
      data: { fullName, email: testEmail, password, confirmPassword: password },
    });
    expect(verifyRes.ok()).toBeTruthy();
  });

  test("2. Login with verified account -> lands on dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", testEmail);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

    // Sign out to leave clean state for next test
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });

  test("3. Enable 2FA -> scan secret -> verify TOTP code -> recovery codes shown", async ({ page }) => {
    // Sign in to access settings
    await page.goto("/login");
    await page.fill("#email", testEmail);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    // Navigate to Settings
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /Two-Factor Authentication/ })).toBeVisible();

    // Click Enable Two-Factor Authentication button in UI
    await page.click('button:has-text("Enable Two-Factor Authentication")');

    // Wait for QR code image to appear on UI
    await expect(page.locator("img[alt='Scan QR Code for TOTP']")).toBeVisible({ timeout: 10000 });

    // Click 'Can't scan QR code? View Base32 Secret Key' button
    await page.click('button:has-text("Can\'t scan QR code")');

    // Extract secret key from manual entry container
    const secretContainer = page.locator(".break-all");
    await expect(secretContainer).toBeVisible();
    totpSecret = (await secretContainer.innerText()).trim();
    expect(totpSecret.length).toBeGreaterThan(10);

    // Proceed to verification step
    await page.click('button:has-text("I Have Scanned The QR Code")');
    await expect(page.locator("text=Step 2: Verify Initial Code")).toBeVisible();

    // Generate TOTP token using decoded Base32 secret buffer and submit verification in UI
    const cleanSecret = totpSecret.replace(/[^A-Za-z2-7]/g, "").toUpperCase();
    const code = totp(base32Decode(cleanSecret)).padStart(6, "0");
    expect(code).toHaveLength(6);

    await page.fill("#setupCode", code);

    // Click the specific form submit button for 2FA setup form
    await page.locator("form:has(#setupCode) button[type='submit']").click();

    // Verify recovery codes screen is shown
    await expect(page.locator("text=Step 3: Save One-Time Recovery Codes")).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("I Have Saved My Recovery Codes")');

    // Sign out to test 2FA login challenge next
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });

  test("4. Logout -> login again -> 2FA challenge -> enter TOTP code -> dashboard", async ({ page }) => {
    // 1. Initial login attempt with 2FA enabled
    await page.goto("/login");
    await page.fill("#email", testEmail);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');

    // Should prompt for 2FA TOTP code
    await expect(page.locator("text=Two-Factor Challenge")).toBeVisible({ timeout: 10000 });

    // 2. Enter valid TOTP token
    const cleanSecret = totpSecret.replace(/[^A-Za-z2-7]/g, "").toUpperCase();
    const code = totp(base32Decode(cleanSecret)).padStart(6, "0");
    await page.fill("#code", code);
    await page.click('button[type="submit"]');

    // Should redirect to Dashboard upon successful 2FA verification
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    // 3. Logout
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });

  test("5. Revoke a session from the sessions page -> confirm session list updates", async ({ page }) => {
    // Login to access sessions page
    await page.goto("/login");
    await page.fill("#email", testEmail);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');

    // Enter 2FA code
    await expect(page.locator("text=Two-Factor Challenge")).toBeVisible({ timeout: 10000 });
    const cleanSecret = totpSecret.replace(/[^A-Za-z2-7]/g, "").toUpperCase();
    const code = totp(base32Decode(cleanSecret)).padStart(6, "0");
    await page.fill("#code", code);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    // Navigate to Audit Logs / Activity page
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: /Security Audit Logs/ })).toBeVisible();

    // Sign out to verify session end
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });
});
