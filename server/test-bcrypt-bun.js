const bcrypt = require("bcrypt");

async function test() {
  console.log("Testing bcrypt with Bun runtime...");

  const password = "testpassword123";

  console.log("1. Hashing password...");
  const hash = await bcrypt.hash(password, 10);
  console.log("   Hash created:", hash.substring(0, 20) + "...");

  console.log("2. Verifying password...");
  const isValid = await bcrypt.compare(password, hash);
  console.log("   Verification result:", isValid);

  console.log("3. Testing existing hash format compatibility...");
  const existingHash =
    "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const testExisting = await bcrypt.compare("password", existingHash);
  console.log("   Existing hash verification:", testExisting);

  if (!testExisting) {
    throw new Error("CRITICAL: Existing bcrypt hash did not verify under Bun.");
  }

  console.log("\n✅ All bcrypt tests passed!");
}

test().catch(err => {
  console.error("❌ bcrypt test failed:", err.message);
  process.exit(1);
});
