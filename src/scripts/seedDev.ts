/**
 * Seed clearly-labelled DEV test accounts (1 admin + 2 technicians) with a known
 * password, for developer testing. Idempotent (upsert). Run:  npm run seed:dev
 *
 * These accounts are NOT hidden — they appear in Staff, prefixed "DEV", so they
 * can be deleted when you're done. Remove them with the admin UI or a cleanup.
 */
import "dotenv/config";
import { dbConnect } from "@/lib/dbConnect";
import { hashPassword } from "@/lib/password";
import { userModel } from "@/models";
import { roles, userStatus } from "@/constants";

const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD || "Cleanify@Dev1";

const accounts = [
  { name: "DEV Admin", email: "dev.admin@cleanify.dev", phone: "9000000001", role: roles.admin },
  { name: "DEV Worker One", email: "dev.worker1@cleanify.dev", phone: "9000000002", role: roles.technician },
  { name: "DEV Worker Two", email: "dev.worker2@cleanify.dev", phone: "9000000003", role: roles.technician },
];

async function run() {
  await dbConnect();
  const passwordHash = await hashPassword(DEV_PASSWORD);
  for (const a of accounts) {
    await userModel.updateOne(
      { email: a.email },
      {
        $set: {
          name: a.name,
          email: a.email,
          phone: a.phone,
          role: a.role,
          status: userStatus.active,
          passwordHash,
        },
      },
      { upsert: true },
    );
    console.log(`  [${a.role}] ${a.email}`);
  }
  console.log(`\n✅ DEV accounts ready. Password for all: ${DEV_PASSWORD}\n`);
  process.exit(0);
}
run().catch((e) => {
  console.error("Dev seed failed:", e);
  process.exit(1);
});
