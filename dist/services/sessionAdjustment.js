"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionAdjustmentService = void 0;
const client_1 = require("@prisma/client");
const luxon_1 = require("luxon");
const notifications_1 = require("../workers/notifications");
const prisma = new client_1.PrismaClient();
class SessionAdjustmentService {
    static async expandSession({ sessionId, newStart, newEnd, strategy, userId, }) {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { appointments: true },
        });
        if (!session)
            throw new Error("Session not found");
        const oldStart = session.startTime;
        const oldEnd = session.endTime;
        const updatedStart = newStart ? new Date(newStart) : oldStart;
        const updatedEnd = newEnd ? new Date(newEnd) : oldEnd;
        const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: {
                startTime: updatedStart,
                endTime: updatedEnd,
            },
        });
        await prisma.sessionChangeLog.create({
            data: {
                sessionId,
                userId,
                changeType: "expand",
                oldStart,
                oldEnd,
                newStart: updatedStart,
                newEnd: updatedEnd,
                payload: { strategy },
            },
        });
        if (strategy === "move_affected") {
            const appointments = session.appointments;
            for (const appt of appointments) {
                if (appt.startTime < updatedStart || appt.endTime > oldEnd) {
                    const duration = appt.duration;
                    const newStartTime = updatedStart;
                    const newEndTime = luxon_1.DateTime.fromJSDate(newStartTime)
                        .plus({ minutes: duration })
                        .toJSDate();
                    await prisma.appointment.update({
                        where: { id: appt.id },
                        data: { startTime: newStartTime, endTime: newEndTime },
                    });
                    await notifications_1.notificationQueue.add("appointment-moved", {
                        sessionId,
                        appointmentId: appt.id,
                        type: "expand-move",
                        notifyPatient: true,
                        payload: { newStartTime },
                    });
                }
            }
        }
        return updatedSession;
    }
    static async shrinkSession({ sessionId, newStart, newEnd, strategy, allowCompress, targetSlotDuration, userId, }) {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { appointments: true },
        });
        if (!session)
            throw new Error("Session not found");
        const oldStart = session.startTime;
        const oldEnd = session.endTime;
        const updatedStart = newStart ? new Date(newStart) : oldStart;
        const updatedEnd = newEnd ? new Date(newEnd) : oldEnd;
        const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: {
                startTime: updatedStart,
                endTime: updatedEnd,
            },
        });
        await prisma.sessionChangeLog.create({
            data: {
                sessionId,
                userId,
                changeType: "shrink",
                oldStart,
                oldEnd,
                newStart: updatedStart,
                newEnd: updatedEnd,
                payload: { strategy, allowCompress, targetSlotDuration },
            },
        });
        const appointments = session.appointments;
        for (const appt of appointments) {
            const isOutside = appt.startTime < updatedStart || appt.endTime > updatedEnd;
            if (!isOutside)
                continue;
            if (strategy === "compress_then_move" && allowCompress) {
                const newStartTime = updatedStart;
                const newEndTime = luxon_1.DateTime.fromJSDate(newStartTime)
                    .plus({ minutes: targetSlotDuration })
                    .toJSDate();
                await prisma.appointment.update({
                    where: { id: appt.id },
                    data: {
                        startTime: newStartTime,
                        endTime: newEndTime,
                        duration: targetSlotDuration,
                    },
                });
                await notifications_1.notificationQueue.add("appointment-compressed", {
                    sessionId,
                    appointmentId: appt.id,
                    type: "compressed",
                    notifyPatient: true,
                    payload: { newStartTime, newEndTime },
                });
                continue;
            }
            if (strategy === "move_affected") {
                const newStartTime = updatedEnd;
                const newEndTime = luxon_1.DateTime.fromJSDate(updatedEnd)
                    .plus({ minutes: appt.duration })
                    .toJSDate();
                await prisma.appointment.update({
                    where: { id: appt.id },
                    data: {
                        startTime: newStartTime,
                        endTime: newEndTime,
                    },
                });
                await notifications_1.notificationQueue.add("appointment-moved", {
                    sessionId,
                    appointmentId: appt.id,
                    type: "shrink-move",
                    notifyPatient: true,
                    payload: { newStartTime },
                });
                continue;
            }
            if (strategy === "cancel_excess") {
                await prisma.appointment.update({
                    where: { id: appt.id },
                    data: { status: "cancelled" },
                });
                await notifications_1.notificationQueue.add("appointment-cancelled", {
                    sessionId,
                    appointmentId: appt.id,
                    type: "cancelled",
                    notifyPatient: true,
                    payload: {},
                });
                continue;
            }
        }
        return updatedSession;
    }
}
exports.SessionAdjustmentService = SessionAdjustmentService;
//# sourceMappingURL=sessionAdjustment.js.map