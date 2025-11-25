import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateTime } from 'luxon';
import { notificationQueue } from '../workers/notifications';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // ----------------------------
  // CREATE appointment
  // ----------------------------
  async create(doctorId: number, patientId: number, dto: any) {
    if (!dto?.date) throw new BadRequestException('date is required');

    const dateObj = new Date(dto.date);

    const availability = await this.prisma.doctorAvailability.findFirst({
      where: { doctorId, date: dateObj },
    });

    if (!availability) {
      throw new NotFoundException('No availability for this doctor on that date');
    }

    if (!availability.session_start || !availability.session_end) {
      throw new ConflictException(
        'Availability missing session_start/session_end',
      );
    }

    const slotDuration = availability.slot_duration_min ?? 10;

    const startDT = DateTime.fromJSDate(availability.session_start);
    const endDT = DateTime.fromJSDate(availability.session_end);

    const booked = await this.prisma.appointment.findMany({
      where: { doctorId, date: dateObj },
      orderBy: { startTime: 'asc' },
    });

    let assignedStart = startDT;

    for (const b of booked) {
      const bStart = DateTime.fromJSDate(b.startTime);
      const bEnd = DateTime.fromJSDate(b.endTime);

      if (assignedStart >= bStart && assignedStart < bEnd) {
        assignedStart = bEnd;
      }
    }

    const assignedEnd = assignedStart.plus({ minutes: slotDuration });

    if (assignedEnd > endDT) {
      throw new ConflictException('No free slots available');
    }

    // find matching session for that doctor/date
    const session = await this.prisma.session.findFirst({
      where: {
        doctorId,
        date: dateObj,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found for this availability');
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
      await notificationQueue.add('appointment-created', {
        appointmentId: created.id,
        doctorId,
        patientId,
      });
    } catch {
      // notifications are best-effort
    }

    return created;
  }

  // ----------------------------
  // GET patient appointments
  // ----------------------------
  async getPatientAppointments(patientId: number) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { startTime: 'asc' },
    });
  }

  // ----------------------------
  // GET doctor appointments
  // ----------------------------
  async getDoctorAppointments(doctorId: number) {
    return this.prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { startTime: 'asc' },
    });
  }

  // ----------------------------
  // CANCEL appointment
  // ----------------------------
  async cancelAppointment(id: number) {
    const apt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!apt) throw new NotFoundException('Appointment not found');

    const deleted = await this.prisma.appointment.delete({ where: { id } });

    try {
      await notificationQueue.add('appointment-cancelled', {
        appointmentId: id,
        doctorId: deleted.doctorId,
        patientId: deleted.patientId,
      });
    } catch {
      // ignore notification failure
    }

    return deleted;
  }

  // ----------------------------
  // MOVE appointment
  // ----------------------------
  async moveAppointment(id: number, newStart: Date) {
    const apt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!apt) throw new NotFoundException('Appointment not found');

    const startDT = DateTime.fromJSDate(newStart);
    const endDT = startDT.plus({ minutes: apt.duration });

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        startTime: startDT.toJSDate(),
        endTime: endDT.toJSDate(),
      },
    });

    try {
      await notificationQueue.add('appointment-moved', {
        appointmentId: id,
        doctorId: updated.doctorId,
        patientId: updated.patientId,
        type: 'manual-move',
        payload: { newStart: updated.startTime, newEnd: updated.endTime },
      });
    } catch {
      // ignore notification failure
    }

    return updated;
  }

  // ----------------------------
  // ADJUST session entrypoint
  // ----------------------------
  async adjustSession(sessionId: number, body: any) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { appointments: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const action = body?.action;

    if (action === 'expand') {
      return this.expandSession(session, body);
    }

    if (action === 'shrink') {
      return this.shrinkSession(session, body);
    }

    throw new BadRequestException('Invalid action');
  }

  // ============================================================
  // EXPAND SESSION 
  // ============================================================
  private async expandSession(session: any, opts: any) {
    const sessionId = session.id;
    const oldStart: Date = session.startTime;
    const oldEnd: Date = session.endTime;

    const requestedStart: Date = opts?.newStart ? new Date(opts.newStart) : oldStart;
    const requestedEnd: Date = opts?.newEnd ? new Date(opts.newEnd) : oldEnd;

    const newStart = requestedStart;
    const newEnd = requestedEnd;

    const expandedStart =
      requestedStart < oldStart ? requestedStart : oldStart;
    const expandedEnd =
      requestedEnd > oldEnd ? requestedEnd : oldEnd;

    const expandedStartDT = DateTime.fromJSDate(expandedStart);
    const expandedEndDT = DateTime.fromJSDate(expandedEnd);

    const strategy: string = opts?.strategy ?? 'push_all';
    const userId: number | null = opts?.userId ?? null;

    const defaultSlotMinutes: number = session.slotDuration ?? 10;

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        startTime: newStart,
        endTime: newEnd,
      },
    });

    await this.prisma.sessionChangeLog.create({
      data: {
        sessionId,
        userId,
        changeType: 'expand',
        oldStart,
        oldEnd,
        newStart,
        newEnd,
        payload: { strategy, expandedStart, expandedEnd },
      },
    });

    if (strategy === 'no_change') return updatedSession;

    const allAppointments = await this.prisma.appointment.findMany({
      where: { sessionId },
      orderBy: { startTime: 'asc' },
    });

    if (!allAppointments.length) return updatedSession;

    const locked = allAppointments.filter((a) => a.locked);
    const movable = allAppointments.filter((a) => !a.locked);

    const reserved = locked
      .map((a) => ({
        id: a.id,
        start: DateTime.fromJSDate(a.startTime),
        end: DateTime.fromJSDate(a.endTime),
      }))
      .sort((a, b) => a.start.toMillis() - b.start.toMillis());

    const findSlot = (
      cursorStart: DateTime,
      durationMin: number,
    ): DateTime | null => {
      let cursor = cursorStart;

      while (true) {
        const slotEnd = cursor.plus({ minutes: durationMin });

        if (slotEnd > expandedEndDT) return null;

        const overlap = reserved.find((r) => {
          const noOverlap = slotEnd <= r.start || cursor >= r.end;
          return !noOverlap;
        });

        if (!overlap) return cursor;

        cursor = overlap.end;
      }
    };

    let cursor = expandedStartDT;

    for (const appt of movable) {
      const duration = appt.duration ?? defaultSlotMinutes;
      const slotStartDT = findSlot(cursor, duration);

      if (!slotStartDT) {
        // cannot fit inside expanded window → mark as overflow
        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: { status: 'overflow' },
        });

        try {
          await notificationQueue.add('appointment-overflow', {
            appointmentId: appt.id,
            sessionId,
            type: 'expand-overflow',
            notifyPatient: true,
            payload: {
              oldStart: appt.startTime,
              oldEnd: appt.endTime,
            },
          });
        } catch {
          // ignore
        }

        continue;
      }

      const slotEndDT = slotStartDT.plus({ minutes: duration });

      const updatedAppt = await this.prisma.appointment.update({
        where: { id: appt.id },
        data: {
          startTime: slotStartDT.toJSDate(),
          endTime: slotEndDT.toJSDate(),
        },
      });

      reserved.push({
        id: appt.id,
        start: slotStartDT,
        end: slotEndDT,
      });
      reserved.sort((a, b) => a.start.toMillis() - b.start.toMillis());

      try {
        await notificationQueue.add('appointment-moved', {
          appointmentId: appt.id,
          sessionId,
          type: 'expand-reflow',
          notifyPatient: true,
          payload: {
            newStart: updatedAppt.startTime,
            newEnd: updatedAppt.endTime,
          },
        });
      } catch {
        // ignore
      }

      cursor = slotEndDT;
    }

    return updatedSession;
  }

  // ============================================================
  // SHRINK SESSION (default: compress_then_move)
  // ============================================================
  private async shrinkSession(session: any, opts: any) {
    const sessionId = session.id;
    const oldStart: Date = session.startTime;
    const oldEnd: Date = session.endTime;

    // requested window
    let newStart: Date = opts?.newStart ? new Date(opts.newStart) : oldStart;
    let newEnd: Date = opts?.newEnd ? new Date(opts.newEnd) : oldEnd;

    if (newEnd <= newStart) {
      throw new BadRequestException('newEnd must be after newStart');
    }

    const strategy: string = opts?.strategy ?? 'compress_then_move';
    const allowCompress: boolean = opts?.allowCompress ?? true;
    const targetSlotDuration: number = opts?.targetSlotDuration ?? 5;
    const userId: number | null = opts?.userId ?? null;

    const defaultSlotMinutes: number = session.slotDuration ?? 10;

    // load all appts for clamp + logic
    const allAppointments = await this.prisma.appointment.findMany({
      where: { sessionId },
      orderBy: { startTime: 'asc' },
    });

    // keep locked appointments at original time (even if outside window)
    const locked = allAppointments.filter((a) => a.locked);
    const movable = allAppointments.filter((a) => !a.locked);

    // make sure we don't *split* any locked appointment by boundary
    if (locked.length) {
      const earliestLockedStart = locked.reduce(
        (min, a) =>
          a.startTime < min ? a.startTime : min,
        locked[0].startTime,
      );
      const latestLockedEnd = locked.reduce(
        (max, a) =>
          a.endTime > max ? a.endTime : max,
        locked[0].endTime,
      );

      // if boundary cuts *through* a locked appt, expand to cover it
      if (newStart > earliestLockedStart && newStart < latestLockedEnd) {
        newStart = earliestLockedStart;
      }
      if (newEnd < latestLockedEnd && newEnd > earliestLockedStart) {
        newEnd = latestLockedEnd;
      }
    }

    const newStartDT = DateTime.fromJSDate(newStart);
    const newEndDT = DateTime.fromJSDate(newEnd);

    // Update session boundaries
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        startTime: newStart,
        endTime: newEnd,
      },
    });

    // Log the shrink
    await this.prisma.sessionChangeLog.create({
      data: {
        sessionId,
        userId,
        changeType: 'shrink',
        oldStart,
        oldEnd,
        newStart,
        newEnd,
        payload: { strategy, allowCompress, targetSlotDuration },
      },
    });

    if (!allAppointments.length) return updatedSession;

    // Movable appointments that are OUTSIDE the new window
    const affectedMovable = movable.filter(
      (a) => a.startTime < newStart || a.endTime > newEnd,
    );

    if (!affectedMovable.length) {
      // nothing to adjust
      return updatedSession;
    }

    // Fixed blocks inside new window (locked + unaffected movable)
    const fixedInside = allAppointments.filter((a) => {
      const inside =
        a.startTime >= newStart && a.endTime <= newEnd;
      const isMovableAffected =
        !a.locked &&
        (a.startTime < newStart || a.endTime > newEnd);
      return inside && !isMovableAffected;
    });

    const reserved = fixedInside
      .map((a) => ({
        id: a.id,
        start: DateTime.fromJSDate(a.startTime),
        end: DateTime.fromJSDate(a.endTime),
      }))
      .sort((a, b) => a.start.toMillis() - b.start.toMillis());

    // Helper to find first free slot in [newStart, newEnd)
    const findSlot = (
      cursorStart: DateTime,
      durationMin: number,
    ): DateTime | null => {
      let cursor = cursorStart;

      while (true) {
        const slotEnd = cursor.plus({ minutes: durationMin });

        if (slotEnd > newEndDT) return null;

        const overlap = reserved.find((r) => {
          const noOverlap = slotEnd <= r.start || cursor >= r.end;
          return !noOverlap;
        });

        if (!overlap) return cursor;

        cursor = overlap.end;
      }
    };

    // Cursor for placing compressed appointments
    let cursor = newStartDT;

    // Cursor for pushing outside window when needed
    let pushCursor = newEndDT;

    const affectedSorted = [...affectedMovable].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    for (const appt of affectedSorted) {
      const originalDuration = appt.duration ?? defaultSlotMinutes;

      // -----------------------------
      // 1) Try to compress & fit inside
      // -----------------------------
      let finalDuration = originalDuration;

      if (strategy === 'compress_then_move' && allowCompress) {
        finalDuration = targetSlotDuration;
      }

      const slotStartDT = findSlot(cursor, finalDuration);

      if (slotStartDT) {
        const slotEndDT = slotStartDT.plus({ minutes: finalDuration });

        const updatedAppt = await this.prisma.appointment.update({
          where: { id: appt.id },
          data: {
            startTime: slotStartDT.toJSDate(),
            endTime: slotEndDT.toJSDate(),
            duration:
              strategy === 'compress_then_move' && allowCompress
                ? finalDuration
                : originalDuration,
            locked: false,
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
          await notificationQueue.add('appointment-compressed', {
            appointmentId: appt.id,
            sessionId,
            type: 'compressed',
            notifyPatient: true,
            payload: {
              newStart: updatedAppt.startTime,
              newEnd: updatedAppt.endTime,
              compressedFrom: originalDuration,
              compressedTo: finalDuration,
            },
          });
        } catch {
          // ignore
        }

        continue;
      }

      // -----------------------------
      // 2) If we reach here – can't fit inside window
      // -----------------------------
      if (strategy === 'compress_then_move' || strategy === 'move_affected') {
        const moveDuration =
          strategy === 'compress_then_move' && allowCompress
            ? finalDuration
            : originalDuration;

        const newStartOutside = pushCursor;
        const newEndOutside = newStartOutside.plus({ minutes: moveDuration });

        const moved = await this.prisma.appointment.update({
          where: { id: appt.id },
          data: {
            startTime: newStartOutside.toJSDate(),
            endTime: newEndOutside.toJSDate(),
            availabilityId: null, // no longer tied to original availability
          },
        });

        pushCursor = newEndOutside;

        try {
          await notificationQueue.add('appointment-moved', {
            appointmentId: appt.id,
            sessionId,
            type: 'shrink-move',
            notifyPatient: true,
            payload: {
              newStart: moved.startTime,
              newEnd: moved.endTime,
            },
          });
        } catch {
          // ignore
        }

        continue;
      }

      // -----------------------------
      // 3) cancel_excess strategy
      // -----------------------------
      if (strategy === 'cancel_excess') {
        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: { status: 'cancelled' },
        });

        try {
          await notificationQueue.add('appointment-cancelled', {
            appointmentId: appt.id,
            sessionId,
            type: 'cancelled-shrink',
            notifyPatient: true,
          });
        } catch {
          // ignore
        }

        continue;
      }
    }

    return updatedSession;
  }
}
