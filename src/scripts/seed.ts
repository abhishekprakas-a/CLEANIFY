/**
 * Seed reference data + the initial admin account. Run with: npm run seed
 * Idempotent: upserts permissions, roles, and the admin user.
 */
import "dotenv/config";
import { dbConnect } from "@/lib/dbConnect";
import { hashPassword } from "@/lib/password";
import { permissionModel, roleModel, userModel } from "@/models";
import {
  allPermissions,
  defaultRolePermissions,
  permissionDescriptions,
  roleDescriptions,
  roles,
  userStatus,
} from "@/constants";

async function seedPermissions() {
  await Promise.all(
    allPermissions.map((key) =>
      permissionModel.updateOne(
        { key },
        { $set: { key, description: permissionDescriptions[key] } },
        { upsert: true },
      ),
    ),
  );
  console.log(`Seeded ${allPermissions.length} permissions`);
}

async function seedRoles() {
  await Promise.all(
    (
      Object.keys(
        defaultRolePermissions,
      ) as (keyof typeof defaultRolePermissions)[]
    ).map((name) =>
      roleModel.updateOne(
        { name },
        {
          $set: {
            name,
            description: roleDescriptions[name],
            permissions: defaultRolePermissions[name],
            isSystem: true,
          },
        },
        { upsert: true },
      ),
    ),
  );
  console.log(`Seeded ${Object.keys(defaultRolePermissions).length} roles`);
}

async function seedAdmin() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = (
    process.env.SEED_ADMIN_EMAIL || "admin@watertank.local"
  ).toLowerCase();
  const phone = process.env.SEED_ADMIN_PHONE || "9999999999";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123";
  const passwordHash = await hashPassword(password);

  const existing = await userModel.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.status = userStatus.active;
    await existing.save();
    console.log(`Updated existing admin: ${email}`);
  } else {
    await userModel.create({
      name,
      email,
      phone,
      passwordHash,
      role: roles.admin,
      status: userStatus.active,
    });
    console.log(`Created admin: ${email}`);
  }
}

async function seed() {
  await dbConnect();
  await seedPermissions();
  await seedRoles();
  await seedAdmin();
  console.log("Seed complete. Log in and change the password immediately.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
