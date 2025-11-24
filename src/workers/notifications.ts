import { Queue, Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";

// ------------------------------
// Redis Connection
// ------------------------------
const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,   // ← REQUIRED FOR BULLMQ
});

// ------------------------------
// Prisma Client
// ------------------------------
const prisma = new PrismaClient();

// ------------------------------
// Job Queue
// ------------------------------
export const notificationQueue = new Queue("notifications", {
  connection,
});

// ------------------------------
// Worker: Processes Notifications
// ------------------------------
const worker = new Worker(
  "notifications",
  async (job: Job) => {
    console.log(`📨 Processing notification job: ${job.name}`);

    const {
      sessionId,
      appointmentId,
      type,
      payload,
      notifyPatient,
      notifyDoctor,
    } = job.data;

    // ------------------------------
    // Appointment Records For Logging
    // ------------------------------
    const appointment = appointmentId
      ? await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { patient: true, session: true },
        })
      : null;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { doctor: true },
    });

    // ------------------------------------
    // Fake Notification Logic (Replace later)
    // ------------------------------------
    if (notifyDoctor) {
      console.log(
        `🔔 [DOCTOR] Notify Dr.${session?.doctor?.name} — ${type}`,
        payload
      );
    }

    if (notifyPatient && appointment?.patient) {
      console.log(
        `🔔 [PATIENT] Notify ${appointment.patient.name} — ${type}`,
        payload
      );
    }

    console.log("✅ Notification job completed");
  },
  { connection }
);

// Log Worker State
worker.on("completed", (job) => {
  console.log(`🎉 Job complete: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});

console.log("🚀 Notification worker started… Waiting for jobs.");
