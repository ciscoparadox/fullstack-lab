async function testCompatibility() {
  console.log("Testing Bun.password against existing bcrypt hashes...");

  // Known Node bcrypt test vector
  const nodeBcryptHash =
    "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

  const isValid = await Bun.password.verify("password", nodeBcryptHash);
  console.log("Existing bcrypt hash verified by Bun.password:", isValid);

  if (!isValid) {
    console.error("❌ CRITICAL: Bun.password cannot verify existing bcrypt hashes.");
    console.error("   Stop migration here. Users would be locked out.");
    process.exit(1);
  }

  console.log("✅ Bun.password hash compatibility confirmed");
}

testCompatibility();
