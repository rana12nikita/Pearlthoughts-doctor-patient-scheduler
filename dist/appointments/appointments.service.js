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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const luxon_1 = require("luxon");
const notifications_1 = require("../workers/notifications");
let AppointmentsService = class AppointmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(doctorId, patientId, dto) {
        if (!dto?.date)
            throw new common_1.BadRequestException('date is required');
        const dateObj = new Date(dto.date);
        const availability = await this.prisma.doctorAvailability.findFirst({
            where: { doctorId, date: dateObj },
        });
        if (!availability) {
            throw new common_1.NotFoundException('No availability for this doctor on that date');
        }
        if (!availability.session_start || !availability.session_end) {
            throw new common_1.ConflictException('Availability missing session_start/session_end');
        }
        const slotDuration = availability.slot_duration_min ?? 10;
        const startDT = luxon_1.DateTime.fromJSDate(availability.session_start);
        const endDT = luxon_1.DateTime.fromJSDate(availability.session_end);
        const booked = await this.prisma.appointment.findMany({
            where: { doctorId, date: dateObj },
            orderBy: { startTime: 'asc' },
        });
        let assignedStart = startDT;
        for (const b of booked) {
            const bStart = luxon_1.DateTime.fromJSDate(b.startTime);
            const bEnd = luxon_1.DateTime.fromJSDate(b.endTime);
            if (assignedStart >= bStart && assignedStart < bEnd) {
                assignedStart = bEnd;
            }
        }
        const assignedEnd = assignedStart.plus({ minutes: slotDuration });
        if (assignedEnd > endDT) {
            throw new common_1.ConflictException('No free slots available');
        }
        const session = await this.prisma.session.findFirst({
            where: {
                doctorId,
                date: dateObj,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Session not found for this availability');
        }
        const created = await this.prisma.appointment.create({
            data: {
                doctorId,
                patientId,
                availabilityId: availability.id,
                sessionId: session.id,
                date: dateObj,
                startTime: assignedStart.toJSDate(),
                endTime: assignedEnd.toJSDate(),
                duration: slotDuration,
            },
        });
        try {
            await notifications_1.notificationQueue.add('appointment-created', {
                appointmentId: created.id,
                doctorId,
                patientId,
            });
        }
        catch {
        }
        return created;
    }
    async getPatientAppointments(patientId) {
        return this.prisma.appointment.findMany({
            where: { patientId },
            orderBy: { startTime: 'asc' },
        });
    }
    async getDoctorAppointments(doctorId) {
        return this.prisma.appointment.findMany({
            where: { doctorId },
            orderBy: { startTime: 'asc' },
        });
    }
    async cancelAppointment(id) {
        const apt = await this.prisma.appointment.findUnique({ where: { id } });
        if (!apt)
            throw new common_1.NotFoundException('Appointment not found');
        return this.prisma.appointment.delete({ where: { id } });
    }
    async moveAppointment(id, newStart) {
        const apt = await this.prisma.appointment.findUnique({ where: { id } });
        if (!apt)
            throw new common_1.NotFoundException('Appointment not found');
        const startDT = luxon_1.DateTime.fromJSDate(newStart);
        const endDT = startDT.plus({ minutes: apt.duration });
        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                startTime: startDT.toJSDate(),
                endTime: endDT.toJSDate(),
            },
        });
        try {
            await notifications_1.notificationQueue.add('appointment-moved', {
                appointmentId: updated.id,
                doctorId: updated.doctorId,
                patientId: updated.patientId,
                type: 'manual-move',
                payload: {
                    newStart: updated.startTime,
                    newEnd: updated.endTime,
                },
            });
        }
        catch {
        }
        return updated;
    }
    async adjustSession(sessionId, body) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: { appointments: true },
        });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        if (body.action === 'expand') {
            return this.expandSession(session, body);
        }
        throw new common_1.BadRequestException('Invalid action');
    }
    async expandSession(session, opts) {
        const sessionId = session.id;
        const doctorId = session.doctorId;
        const sessionDate = session.date;
        const oldStart = session.startTime;
        const oldEnd = session.endTime;
        const requestedStart = opts?.newStart ? new Date(opts.newStart) : oldStart;
        const requestedEnd = opts?.newEnd ? new Date(opts.newEnd) : oldEnd;
        const strategy = opts?.strategy ?? 'push_all';
        const userId = opts?.userId ?? null;
        const day = luxon_1.DateTime.fromJSDate(sessionDate);
        const dayStartLimit = day.set({
            hour: 7,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const dayEndLimit = day.set({
            hour: 21,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const reqStartDT = luxon_1.DateTime.fromJSDate(requestedStart);
        const reqEndDT = luxon_1.DateTime.fromJSDate(requestedEnd);
        if (reqStartDT < dayStartLimit || reqEndDT > dayEndLimit) {
            throw new common_1.BadRequestException('Requested expansion is outside doctor working hours (07:00–21:00)');
        }
        let expandedStart = requestedStart < oldStart ? requestedStart : oldStart;
        let expandedEnd = requestedEnd > oldEnd ? requestedEnd : oldEnd;
        const overlappingSessions = await this.prisma.session.findMany({
            where: {
                doctorId,
                date: sessionDate,
                NOT: { id: sessionId },
                AND: [
                    { startTime: { lt: expandedEnd } },
                    { endTime: { gt: expandedStart } },
                ],
            },
            include: { appointments: true },
        });
        const mergedSessionIds = [];
        if (overlappingSessions.length > 0) {
            for (const s of overlappingSessions) {
                if (s.startTime < expandedStart)
                    expandedStart = s.startTime;
                if (s.endTime > expandedEnd)
                    expandedEnd = s.endTime;
                mergedSessionIds.push(s.id);
            }
        }
        const expandedStartDT = luxon_1.DateTime.fromJSDate(expandedStart);
        const expandedEndDT = luxon_1.DateTime.fromJSDate(expandedEnd);
        const defaultSlotMinutes = session.slotDuration ?? 10;
        const updatedSession = await this.prisma.session.update({
            where: { id: sessionId },
            data: {
                startTime: expandedStart,
                endTime: expandedEnd,
            },
        });
        await this.prisma.sessionChangeLog.create({
            data: {
                sessionId,
                userId,
                changeType: 'expand',
                oldStart,
                oldEnd,
                newStart: expandedStart,
                newEnd: expandedEnd,
                payload: {
                    strategy,
                    mergedSessionIds,
                },
            },
        });
        if (strategy === 'no_change') {
            return updatedSession;
        }
        if (strategy !== 'push_all' && strategy !== 'move_affected') {
            return updatedSession;
        }
        const allSessionIds = [sessionId, ...mergedSessionIds];
        const allAppointments = await this.prisma.appointment.findMany({
            where: { sessionId: { in: allSessionIds } },
            orderBy: { startTime: 'asc' },
        });
        if (!allAppointments.length) {
            if (mergedSessionIds.length) {
                await this.prisma.session.deleteMany({
                    where: { id: { in: mergedSessionIds } },
                });
            }
            return updatedSession;
        }
        if (mergedSessionIds.length) {
            await this.prisma.appointment.updateMany({
                where: { sessionId: { in: mergedSessionIds } },
                data: { sessionId },
            });
        }
        const locked = allAppointments.filter((a) => a.locked);
        const movable = allAppointments.filter((a) => !a.locked);
        const reserved = locked
            .map((a) => ({
            id: a.id,
            start: luxon_1.DateTime.fromJSDate(a.startTime),
            end: luxon_1.DateTime.fromJSDate(a.endTime),
        }))
            .sort((a, b) => a.start.toMillis() - b.start.toMillis());
        const lunchStart = day.set({
            hour: 13,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const lunchEnd = day.set({
            hour: 14,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        if (lunchEnd > expandedStartDT && lunchStart < expandedEndDT) {
            reserved.push({
                id: 'lunch-break',
                start: lunchStart,
                end: lunchEnd,
            });
        }
        reserved.sort((a, b) => a.start.toMillis() - b.start.toMillis());
        const findSlot = (cursorStart, durationMin) => {
            let cursor = cursorStart;
            while (true) {
                const slotEnd = cursor.plus({ minutes: durationMin });
                if (slotEnd > expandedEndDT) {
                    return null;
                }
                const overlap = reserved.find((r) => {
                    const noOverlap = slotEnd <= r.start || cursor >= r.end;
                    return !noOverlap;
                });
                if (!overlap) {
                    return cursor;
                }
                cursor = overlap.end;
            }
        };
        let cursor = expandedStartDT;
        for (const appt of movable) {
            const duration = appt.duration ?? defaultSlotMinutes;
            const slotStartDT = findSlot(cursor, duration);
            if (!slotStartDT) {
                await this.prisma.appointment.update({
                    where: { id: appt.id },
                    data: {
                        status: 'overflow',
                        sessionId,
                    },
                });
                try {
                    await notifications_1.notificationQueue.add('appointment-overflow', {
                        appointmentId: appt.id,
                        sessionId,
                        type: 'expand-overflow',
                        notifyPatient: true,
                        payload: {
                            oldStart: appt.startTime,
                            oldEnd: appt.endTime,
                        },
                    });
                }
                catch (err) {
                    console.warn('Notify enqueue failed (overflow)', err);
                }
                continue;
            }
            const slotEndDT = slotStartDT.plus({ minutes: duration });
            const updatedAppt = await this.prisma.appointment.update({
                where: { id: appt.id },
                data: {
                    startTime: slotStartDT.toJSDate(),
                    endTime: slotEndDT.toJSDate(),
                    sessionId,
                },
            });
            reserved.push({
                id: appt.id,
                start: slotStartDT,
                end: slotEndDT,
            });
            reserved.sort((a, b) => a.start.toMillis() - b.start.toMillis());
            cursor = slotEndDT;
            try {
                await notifications_1.notificationQueue.add('appointment-moved', {
                    appointmentId: appt.id,
                    sessionId,
                    type: 'expand-reflow',
                    notifyPatient: true,
                    payload: {
                        newStart: updatedAppt.startTime,
                        newEnd: updatedAppt.endTime,
                    },
                });
            }
            catch (err) {
                console.warn('Notify enqueue failed (expand-reflow)', err);
            }
        }
        if (mergedSessionIds.length) {
            await this.prisma.session.deleteMany({
                where: { id: { in: mergedSessionIds } },
            });
        }
        return updatedSession;
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map