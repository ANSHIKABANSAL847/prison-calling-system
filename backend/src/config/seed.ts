import User from "../models/User";

/**
 * Seeds the admin user on server startup.
 * If the admin already exists, it skips creation.
 * Reads credentials from ADMIN_ID and ADMIN_PASS env vars.
 */
export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_ID;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminEmail || !adminPass) {
    console.warn("⚠️  ADMIN_ID or ADMIN_PASS not set in .env — skipping admin seed");
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail, role: "Admin" });

  if (existingAdmin) {
    console.log("ℹ️  Admin already exists — skipping seed");
    return;
  }

  await User.create({
    name: "Admin",
    email: adminEmail,
    password: adminPass,  // hashed automatically by pre-save hook
    role: "Admin",
    isActive: true,
  });

  console.log(`✅ Admin seeded: ${adminEmail}`);
}
