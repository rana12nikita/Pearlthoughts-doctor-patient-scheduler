"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const luxon_1 = require("luxon");
const notifications_1 = require("../workers/notifications");
let SchedulingService = class SchedulingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async expandSession({ sessionId, newStart, newEnd, strategy, userId, }) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: { appointments: true },
        });
        if (!session)
            throw new Error('Session not found');
        const oldStart = session.startTime;
        const oldEnd = session.endTime;
        const updatedStart = newStart ? new Date(newStart) : oldStart;
        const updatedEnd = newEnd ? new Date(newEnd) : oldEnd;
        const updatedSession = await this.prisma.session.update({
            where: { id: sessionId },
            data: {
                startTime: updatedStart,
                endTime: updatedEnd,
            },
        });
        await this.prisma.sessionChangeLog.create({
            data: {
                sessionId,
                userId,
                changeType: 'expand',
                oldStart,
                oldEnd,
                newStart: updatedStart,
                newEnd: updatedEnd,
                payload: { strategy },
            },
        });
        if (strategy === 'move_affected') {
            for (const appt of session.appointments) {
                const duration = appt.duration;
                const newStartTime = updatedStart;
                const newEndTime = luxon_1.DateTime.fromJSDate(newStartTime)
                    .plus({ minutes: duration })
                    .toJSDate();
                await this.prisma.appointment.update({
                    where: { id: appt.id },
                    data: { startTime: newStartTime, endTime: newEndTime },
                });
                await notifications_1.notificationQueue.add('appointment-moved', {
                    sessionId,
                    appointmentId: appt.id,
                    type: 'expand-move',
                    notifyPatient: true,
                    payload: { newStartTime },
                });
            }
        }
        return updatedSession;
    }
    async shrinkSession({ sessionId, newStart, newEnd, strategy, allowCompress, targetSlotDuration, userId, }) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: { appointments: true },
        });
        if (!session)
            throw new Error('Session not found');
        const oldStart = session.startTime;
        const oldEnd = session.endTime;
        const updatedStart = newStart ? new Date(newStart) : oldStart;
        const updatedEnd = newEnd ? new Date(newEnd) : oldEnd;
        const updatedSession = await this.prisma.session.update({
            where: { id: sessionId },
            data: {
                startTime: updatedStart,
                endTime: updatedEnd,
            },
        });
        await this.prisma.sessionChangeLog.create({
            data: {
                sessionId,
                userId,
                changeType: 'shrink',
                oldStart,
                oldEnd,
                newStart: updatedStart,
                newEnd: updatedEnd,
                payload: { strategy, allowCompress, targetSlotDuration },
            },
        });
        for (const appt of session.appointments) {
            const outside = appt.startTime < updatedStart || appt.endTime > updatedEnd;
            if (!outside)
                continue;
            if (strategy === 'compress_then_move' && allowCompress) {
                const newStartTime = updatedStart;
                const newEndTime = luxon_1.DateTime.fromJSDate(newStartTime)
                    .plus({ minutes: targetSlotDuration })
                    .toJSDate();
                await this.prisma.appointment.update({
                    where: { id: appt.id },
                    data: {
                        startTime: newStartTime,
                        endTime: newEndTime,
                        duration: targetSlotDuration,
                    },
                });
                await notifications_1.notificationQueue.add('appointment-compressed', {
                    sessionId,
                    appointmentId: appt.id,
                    type: 'compressed',
                    notifyPatient: true,
                    payload: { newStartTime, newEndTime },
                });
                continue;
            }
            if (strategy === 'move_affected') {
                const newStartTime = updatedEnd;
                const newEndTime = luxon_1.DateTime.fromJSDate(updatedEnd)
                    .plus({ minutes: appt.duration })
                    .toJSDate();
                await this.prisma.appointment.update({
                    where: { id: appt.id },
                    data: {
                        startTime: newStartTime,
                        endTime: newEndTime,
                    },
                });
                await notifications_1.notificationQueue.add('appointment-moved', {
                    sessionId,
                    appointmentId: appt.id,
                    notifyPatient: true,
                    type: 'shrink-move',
                    payload: { newStartTime },
                });
                continue;
            }
            if (strategy === 'cancel_excess') {
                await this.prisma.appointment.update({
                    where: { id: appt.id },
                    data: { status: 'cancelled' },
                });
                await notifications_1.notificationQueue.add('appointment-cancelled', {
                    sessionId,
                    appointmentId: appt.id,
                    notifyPatient: true,
                    type: 'cancelled',
                    payload: {},
                });
                continue;
            }
        }
        return updatedSession;
    }
};
exports.SchedulingService = SchedulingService;
exports.SchedulingService = SchedulingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulingService);
//# sourceMappingURL=scheduling.service.js.map