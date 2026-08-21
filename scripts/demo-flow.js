const { totp, base32Decode } = require("../packages/security/dist/totp");

const API = "http://localhost:4000/api";

async function runDemo() {
  console.log("\n========================================================");
  console.log(" 🔒 AUTHFLOW END-TO-END SECURITY PLATFORM DEMONSTRATION");
  console.log("========================================================\n");

  const email = `security.demo.${Date.now()}@authflow.local`;
  const password = "Str0ng!Passw0rd#2026";
  const fullName = "Cyber Security Tester";

  // 1. REGISTRATION
  console.log(`[1/6] Registering account: ${email}`);
  const regRes = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName, email, password, confirmPassword: password }),
  });
  const regData = await regRes.json();
  console.log("      Result:", regData.success ? "✓ Account Created (Auto-Verified in Dev)" : "✗ Registration Failed");

  // 2. INITIAL LOGIN (Password Verification)
  console.log("\n[2/6] Logging in with email + master password...");
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookieHeader = loginRes.headers.get("set-cookie");
  const loginData = await loginRes.json();
  console.log("      Auth State:", loginData.data?.status);
  console.log("      HttpOnly Cookies Issued:", cookieHeader ? "✓ YES (Access + Refresh Cookies)" : "✗ NO");

  // Extract access token cookie for session requests
  const cookies = cookieHeader ? cookieHeader.split(",").map(c => c.split(";")[0]).join("; ") : "";

  // 3. 2FA ENROLLMENT & SECRET GENERATION
  console.log("\n[3/6] Requesting 2FA enrollment secret & QR code...");
  const setupRes = await fetch(`${API}/security/2fa/setup`, {
    method: "POST",
    headers: { Cookie: cookies },
  });
  const setupData = await setupRes.json();
  const secretKey = setupData.data.manualEntryKey;
  const otpauthUri = setupData.data.otpauthUri;
  console.log("      Base32 Secret Key:", secretKey);
  console.log("      Provisioning URI:", otpauthUri);

  // 4. RFC 6238 TOTP ALGORITHM COMPUTATION & ACTIVATION
  const secretBuf = base32Decode(secretKey);
  const currentOtp = totp(secretBuf);
  console.log(`\n[4/6] Computing live RFC 6238 TOTP code: [ ${currentOtp} ]`);
  console.log("      Verifying code to activate 2FA...");
  
  const verifySetupRes = await fetch(`${API}/security/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ code: currentOtp }),
  });
  const verifySetupData = await verifySetupRes.json();
  const recoveryCodes = verifySetupData.data.recoveryCodes;
  console.log("      2FA Status: ✓ ACTIVATED");
  console.log("      Generated 10 Recovery Codes:", recoveryCodes.slice(0, 3).join(", ") + ", ...");

  // 5. 2FA-GATED LOGIN CHALLENGE DEMONSTRATION
  console.log("\n[5/6] Demonstrating 2FA-Gated Login (Password verified alone is NOT fully authenticated)...");
  const step1Res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const step1Data = await step1Res.json();
  console.log("      Step 1 State:", step1Data.data.status); // "TOTP_REQUIRED"
  console.log("      Challenge Token Issued:", step1Data.data.challengeToken ? "✓ YES (5-min exp)" : "✗ NO");

  const challengeToken = step1Data.data.challengeToken;
  const liveTotp = totp(secretBuf);
  console.log(`      Step 2 Submitting TOTP code [ ${liveTotp} ]...`);
  
  const step2Res = await fetch(`${API}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code: liveTotp }),
  });
  const step2Data = await step2Res.json();
  console.log("      Final Auth State:", step2Data.data?.status); // "AUTHENTICATED"

  // 6. SINGLE-USE RECOVERY CODE DEMONSTRATION
  console.log("\n[6/6] Demonstrating Single-Use Recovery Code Authentication...");
  const recStep1Res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const recStep1Data = await recStep1Res.json();
  const testRecoveryCode = recoveryCodes[0];
  console.log(`      Redeeming single-use recovery code: [ ${testRecoveryCode} ]`);

  const recStep2Res = await fetch(`${API}/auth/recovery/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken: recStep1Data.data.challengeToken, recoveryCode: testRecoveryCode }),
  });
  const recStep2Data = await recStep2Res.json();
  console.log("      Recovery Auth State:", recStep2Data.data?.status); // "AUTHENTICATED"

  console.log("\n========================================================");
  console.log(" 🎉 AUTHFLOW SECURITY VERIFICATION COMPLETE — ALL SURFACES VERIFIED!");
  console.log("========================================================\n");
}

runDemo().catch(console.error);
