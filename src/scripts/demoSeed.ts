/**
 * Seed a full demo dataset so dashboards/reports are populated. Run:
 *   npm run seed:demo
 * Idempotent: clears the operational collections, re-upserts users/roles.
 */
import "dotenv/config";
import { dbConnect } from "@/lib/dbConnect";
import { hashPassword } from "@/lib/password";
import {
  attendanceModel,
  bookingModel,
  customerModel,
  jobAssignmentModel,
  jobModel,
  permissionModel,
  reviewModel,
  roleModel,
  userModel,
} from "@/models";
import {
  allPermissions,
  appConfig,
  assignmentStatus,
  attendanceStatus,
  bookingStatus,
  defaultRolePermissions,
  jobStatus,
  permissionDescriptions,
  roleDescriptions,
  roles,
  satisfactionFromRating,
  tankType,
  userStatus,
} from "@/constants";

const TECH_PASSWORD = "Tech@12345";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function seedRefData() {
  await Promise.all(
    allPermissions.map((key) =>
      permissionModel.updateOne(
        { key },
        { $set: { key, description: permissionDescriptions[key] } },
        { upsert: true },
      ),
    ),
  );
  for (const name of Object.keys(
    defaultRolePermissions,
  ) as (keyof typeof defaultRolePermissions)[]) {
    await roleModel.updateOne(
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
    );
  }
}

async function upsertUser(
  name: string,
  email: string,
  phone: string,
  role: string,
  password: string,
) {
  const passwordHash = await hashPassword(password);
  const doc = await userModel.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        phone,
        role,
        status: userStatus.active,
        passwordHash,
      },
    },
    { upsert: true, new: true },
  );
  return doc!;
}

async function run() {
  await dbConnect();
  console.log("Seeding reference data (permissions, roles)…");
  await seedRefData();

  console.log("Clearing demo collections…");
  await Promise.all([
    customerModel.deleteMany({}),
    bookingModel.deleteMany({}),
    jobModel.deleteMany({}),
    jobAssignmentModel.deleteMany({}),
    attendanceModel.deleteMany({}),
    reviewModel.deleteMany({}),
  ]);

  console.log("Creating users…");
  const admin = await upsertUser(
    "Super Admin",
    process.env.SEED_ADMIN_EMAIL || "admin@watertank.local",
    "9999999999",
    roles.admin,
    ADMIN_PASSWORD,
  );
  const staff = await upsertUser(
    "Priya (Calling Staff)",
    "staff@watertank.local",
    "9888800000",
    roles.admin,
    ADMIN_PASSWORD,
  );

  const techDefs = [
    ["Asha Kumar", "asha@watertank.local", "9700000001"],
    ["Ravi Singh", "ravi@watertank.local", "9700000002"],
    ["Meena Joseph", "meena@watertank.local", "9700000003"],
    ["John Mathew", "john@watertank.local", "9700000004"],
  ];
  const techs = [];
  for (const [name, email, phone] of techDefs) {
    techs.push(
      await upsertUser(name, email, phone, roles.technician, TECH_PASSWORD),
    );
  }

  console.log("Creating customers…");
  const customerNames = [
    ["Anil Residency", "9810000001", "12 MG Road, Bengaluru 560001"],
    ["Sunrise Apartments", "9810000002", "45 Park Street, Bengaluru 560002"],
    ["Green Valley Villa", "9810000003", "7 Lake View, Bengaluru 560003"],
    ["Lotus Hospital", "9810000004", "9 Ring Road, Bengaluru 560004"],
    ["Sharma Family", "9810000005", "23 Brigade Lane, Bengaluru 560005"],
    ["TechPark Towers", "9810000006", "1 Outer Ring, Bengaluru 560006"],
    ["Riverside Cafe", "9810000007", "5 River Road, Bengaluru 560007"],
    ["Patel Bungalow", "9810000008", "88 Hill Street, Bengaluru 560008"],
  ];
  const tankTypes = Object.values(tankType);
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const [customerName, mobileNumber, address] = customerNames[i];
    customers.push(
      await customerModel.create({
        customerName,
        mobileNumber,
        address,
        googleMapLocation:
          i % 2 === 0 ? "https://maps.google.com/?q=12.97,77.59" : undefined,
        notes: i % 3 === 0 ? "Gate code 1234" : undefined,
        status: userStatus.active,
        createdBy: staff._id,
      }),
    );
  }

  console.log("Creating bookings + jobs…");
  // Status spread for jobs (one per booking where a job is created).
  const jobStatusPlan = [
    jobStatus.completed,
    jobStatus.completed,
    jobStatus.completed,
    jobStatus.completed,
    jobStatus.scheduled,
    jobStatus.assigned,
    jobStatus.reachedSite,
    jobStatus.beforePhotoPendingApproval,
    jobStatus.cleaningInProgress,
    jobStatus.afterPhotoPendingApproval,
    jobStatus.cancelled,
  ];

  let seq = 0;
  const completedJobs: {
    jobId: unknown;
    completedAt?: Date;
    customerId: unknown;
    techId: unknown;
  }[] = [];

  for (let i = 0; i < jobStatusPlan.length; i++) {
    const customer = pick(customers, i);
    const tech = pick(techs, i);
    const status = jobStatusPlan[i];

    // schedule date: mix of today, recent past (completed), near future
    let scheduledDate: Date;
    if (status === jobStatus.completed)
      scheduledDate = daysAgo((i % 6) * 5 + 2);
    else if (i % 3 === 0)
      scheduledDate = new Date(); // today
    else scheduledDate = daysAgo(-(i % 4)); // upcoming
    const scheduledTime = pick(["09:00", "11:30", "14:00", "16:30"], i);

    const bookingTanks = [
      {
        name: `Tank ${i + 1}`,
        tankType: pick(tankTypes, i),
        capacityLitres: pick([500, 1000, 2000, 5000], i),
        quantity: (i % 3) + 1,
        cleaningCharge: pick([600, 900, 1500, 2500], i),
      },
    ];
    const bookingTotal = bookingTanks.reduce(
      (s, t) => s + (t.cleaningCharge ?? 0) * (t.quantity ?? 1),
      0,
    );
    const booking = await bookingModel.create({
      customerId: customer._id,
      tanks: bookingTanks,
      totalCharge: bookingTotal,
      scheduledDate,
      scheduledTime,
      specialInstructions: i % 2 === 0 ? "Use side entrance" : undefined,
      bookingStatus:
        status === jobStatus.cancelled
          ? bookingStatus.cancelled
          : bookingStatus.scheduled,
      statusHistory: [
        { status: bookingStatus.pending, at: daysAgo(10), by: staff._id },
        { status: bookingStatus.scheduled, at: daysAgo(9), by: staff._id },
      ],
      createdBy: staff._id,
    });

    seq += 1;
    const jobCode = `${appConfig.jobCodePrefix}-${dateKey(new Date()).replace(/-/g, "")}-${String(
      seq,
    ).padStart(4, "0")}`;

    const assignedStates: string[] = [
      jobStatus.assigned,
      jobStatus.reachedSite,
      jobStatus.beforePhotoPendingApproval,
      jobStatus.cleaningInProgress,
      jobStatus.afterPhotoPendingApproval,
      jobStatus.completed,
    ];
    const hasTech = assignedStates.includes(status);
    const completedAt =
      status === jobStatus.completed ? scheduledDate : undefined;

    const job = await jobModel.create({
      jobCode,
      booking: booking._id,
      customer: customer._id,
      assignedTechnicians: hasTech ? [tech._id] : [],
      tanks: bookingTanks,
      totalCharge: bookingTotal,
      scheduledDate,
      scheduledTime,
      status,
      statusHistory: [
        { status: jobStatus.pending, at: daysAgo(9), by: admin._id },
        { status, at: scheduledDate, by: admin._id },
      ],
      startedAt: completedAt ? scheduledDate : undefined,
      completedAt,
      completionNotes: completedAt ? "Tank cleaned and sanitised." : undefined,
      createdBy: admin._id,
    });

    if (hasTech) {
      await jobAssignmentModel.create({
        job: job._id,
        technician: tech._id,
        assignedBy: admin._id,
        assignedAt: daysAgo(5),
        scheduledDate,
        scheduledTime,
        status: assignmentStatus.active,
      });
    }

    if (status === jobStatus.completed) {
      completedJobs.push({
        jobId: job._id,
        completedAt: job.completedAt,
        customerId: customer._id,
        techId: tech._id,
      });
    }
  }

  // A few bookings still awaiting a job — these show the "Create job" action.
  console.log("Creating pending bookings (no job yet)…");
  for (let i = 0; i < 3; i++) {
    const customer = pick(customers, i + 4);
    const pendingTanks = [
      {
        name: "Overhead tank",
        tankType: pick(tankTypes, i + 1),
        capacityLitres: pick([500, 1000, 2000], i),
        quantity: (i % 2) + 1,
        cleaningCharge: pick([700, 1200, 1800], i),
      },
    ];
    await bookingModel.create({
      customerId: customer._id,
      tanks: pendingTanks,
      totalCharge: pendingTanks.reduce(
        (s, t) => s + (t.cleaningCharge ?? 0) * (t.quantity ?? 1),
        0,
      ),
      scheduledDate: daysAgo(-(i + 1)),
      scheduledTime: pick(["10:00", "13:00", "15:30"], i),
      specialInstructions: "Call before arriving",
      bookingStatus: bookingStatus.pending,
      statusHistory: [
        { status: bookingStatus.pending, at: new Date(), by: staff._id },
      ],
      createdBy: staff._id,
    });
  }

  console.log("Creating attendance…");
  const attStatuses = [
    attendanceStatus.present,
    attendanceStatus.present,
    attendanceStatus.late,
    attendanceStatus.present,
    attendanceStatus.halfDay,
    attendanceStatus.present,
    attendanceStatus.late,
    attendanceStatus.present,
  ];
  // Seed days 1..8 (past) and leave TODAY open so technicians can check in live.
  for (const tech of techs) {
    for (let d = 1; d <= attStatuses.length; d++) {
      const day = daysAgo(d);
      const checkIn = new Date(day);
      checkIn.setHours(9, d === 2 ? 30 : 5, 0, 0); // some late
      const status = pick(attStatuses, d + techs.indexOf(tech));
      const checkOut = new Date(day);
      const hours = status === attendanceStatus.halfDay ? 3.5 : 8;
      checkOut.setHours(checkIn.getHours() + Math.floor(hours), 0, 0, 0);
      await attendanceModel.create({
        userId: tech._id,
        date: dateKey(day),
        checkInTime: checkIn,
        checkOutTime: checkOut,
        workingHours: hours,
        status,
      });
    }
  }

  console.log("Creating reviews…");
  const comments = [
    "Excellent service, very thorough.",
    "On time and professional.",
    "Good job, tank looks clean.",
    "Satisfactory, could be quicker.",
  ];
  for (let i = 0; i < completedJobs.length; i++) {
    const c = completedJobs[i];
    const starRating = pick([5, 4, 5, 3], i);
    await reviewModel.create({
      jobId: c.jobId,
      customerId: c.customerId,
      technicianId: c.techId,
      starRating,
      reviewComment: pick(comments, i),
      satisfactionStatus: satisfactionFromRating(starRating),
      reviewDate: c.completedAt ?? daysAgo(i + 1),
      collectedBy: staff._id,
      source: "phone",
    });
  }

  console.log("\n✅ Demo data seeded.\n");
  console.log("Login credentials:");
  console.log(
    `  ADMIN       ${process.env.SEED_ADMIN_EMAIL || "admin@watertank.local"} / ${ADMIN_PASSWORD}`,
  );
  console.log(`  CALLING STAFF staff@watertank.local / ${ADMIN_PASSWORD}`);
  for (const [name, email] of techDefs) {
    console.log(`  TECHNICIAN  ${email} / ${TECH_PASSWORD}   (${name})`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
