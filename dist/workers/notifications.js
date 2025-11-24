"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = void 0;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
});
const prisma = new client_1.PrismaClient();
exports.notificationQueue = new bullmq_1.Queue("notifications", {
    connection,
});
const worker = new bullmq_1.Worker("notifications", async (job) => {
    console.log(`📨 Processing notification job: ${job.name}`);
    const { sessionId, appointmentId, type, payload, notifyPatient, notifyDoctor, } = job.data;
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
    if (notifyDoctor) {
        console.log(`🔔 [DOCTOR] Notify Dr.${session?.doctor?.name} — ${type}`, payload);
    }
    if (notifyPatient && appointment?.patient) {
        console.log(`🔔 [PATIENT] Notify ${appointment.patient.name} — ${type}`, payload);
    }
    console.log("✅ Notification job completed");
}, { connection });
worker.on("completed", (job) => {
    console.log(`🎉 Job complete: ${job.id}`);
});
worker.on("failed", (job, err) => {
    console.error(`❌ Job failed: ${job?.id}`, err);
});
console.log("🚀 Notification worker started… Waiting for jobs.");
//# sourceMappingURL=notifications.js.map