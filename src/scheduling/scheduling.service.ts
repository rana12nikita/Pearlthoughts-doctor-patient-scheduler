import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateTime } from 'luxon';
import { notificationQueue } from '../workers/notifications';

@Injectable()
export class SchedulingService {
  constructor(private prisma: PrismaService) {}

  // ==========================================================
  // EXPAND SESSION
  // ==========================================================
  async expandSession({
    sessionId,
    newStart,
    newEnd,
    strategy,
    userId,
  }: {
    sessionId: number;
    newStart?: string;
    newEnd?: string;
    strategy: 'move_affected' | 'push_all' | 'no_change';
    userId: number;
  }) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { appointments: true },
    });

    if (!session) throw new Error('Session not found');

    const oldStart = session.startTime;
    const oldEnd = session.endTime;

    const updatedStart = newStart ? new Date(newStart) : oldStart;
    const updatedEnd = newEnd ? new Date(newEnd) : oldEnd;

    // Update session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        startTime: updatedStart,
        endTime: updatedEnd,
      },
    });

    // Log change
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

    // Strategy: Move affected
    if (strategy === 'move_affected') {
      for (const appt of session.appointments) {
        const duration = appt.duration;
        const newStartTime = updatedStart;
        const newEndTime = DateTime.fromJSDate(newStartTime)
          .plus({ minutes: duration })
          .toJSDate();

        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: { startTime: newStartTime, endTime: newEndTime },
        });

        await notificationQueue.add('appointment-moved', {
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

  // ==========================================================
  // SHRINK SESSION
  // ==========================================================
  async shrinkSession({
    sessionId,
    newStart,
    newEnd,
    strategy,
    allowCompress,
    targetSlotDuration,
    userId,
  }: {
    sessionId: number;
    newStart?: string;
    newEnd?: string;
    strategy: 'compress_then_move' | 'move_affected' | 'cancel_excess';
    allowCompress: boolean;
    targetSlotDuration: number;
    userId: number;
  }) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { appointments: true },
    });

    if (!session) throw new Error('Session not found');

    const oldStart = session.startTime;
    const oldEnd = session.endTime;

    const updatedStart = newStart ? new Date(newStart) : oldStart;
    const updatedEnd = newEnd ? new Date(newEnd) : oldEnd;

    // Update the session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        startTime: updatedStart,
        endTime: updatedEnd,
      },
    });

    // Log the change
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
      const outside =
        appt.startTime < updatedStart || appt.endTime > updatedEnd;

      if (!outside) continue;

      // COMPRESS STRATEGY
      if (strategy === 'compress_then_move' && allowCompress) {
        const newStartTime = updatedStart;
        const newEndTime = DateTime.fromJSDate(newStartTime)
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

        await notificationQueue.add('appointment-compressed', {
          sessionId,
          appointmentId: appt.id,
          type: 'compressed',
          notifyPatient: true,
          payload: { newStartTime, newEndTime },
        });

        continue;
      }

      // MOVE AFFECTED STRATEGY
      if (strategy === 'move_affected') {
        const newStartTime = updatedEnd;
        const newEndTime = DateTime.fromJSDate(updatedEnd)
          .plus({ minutes: appt.duration })
          .toJSDate();

        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime,
          },
        });

        await notificationQueue.add('appointment-moved', {
          sessionId,
          appointmentId: appt.id,
          notifyPatient: true,
          type: 'shrink-move',
          payload: { newStartTime },
        });

        continue;
      }

      // CANCEL STRATEGY
      if (strategy === 'cancel_excess') {
        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: { status: 'cancelled' },
        });

        await notificationQueue.add('appointment-cancelled', {
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
}
