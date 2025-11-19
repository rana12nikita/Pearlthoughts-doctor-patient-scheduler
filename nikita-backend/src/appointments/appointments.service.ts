import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // Create (book) an appointment
  async create(dto: any, patientId: number) {
    const { doctorId, date, session, start_time, end_time } = dto;

    // parse incoming date/time strings into Date objects
    const dateObj = new Date(date);
    const startTimeObj = new Date(start_time);
    const endTimeObj = new Date(end_time);

    // find availability for that doctor on that date (session concept stored in appointment only)
    const availability = await this.prisma.doctorAvailability.findFirst({
      where: {
        doctorId,
        date: dateObj,
      },
    });

    if (!availability) {
      throw new NotFoundException('Doctor has not set availability for this date');
    }

    // doctor's schedule type is stored on the doctor model:
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const scheduleType = doctor.schedule_Type; // "stream" | "wave"

    // 1 booking per session per day for same doctor
    const existingBooking = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        doctorId,
        date: dateObj,
        session,
        status: 'booked',
      },
    });
    if (existingBooking) {
      throw new ConflictException('You already have a booking in this session for this doctor and date');
    }

    // STREAM: one appointment per sub-slot (we expect the frontend to pass exact start_time aligned to slots)
    if (scheduleType === 'stream') {
      const slotTaken = await this.prisma.appointment.findFirst({
        where: {
          doctorId,
          date: dateObj,
          start_time: startTimeObj,
          status: 'booked',
        },
      });
      if (slotTaken) throw new ConflictException('This time slot is already booked');

      return this.prisma.appointment.create({
        data: {
          doctorId,
          patientId,
          date: dateObj,
          session,
          start_time: startTimeObj,
          end_time: endTimeObj,
          availabilityId: availability.id,
        },
      });
    }

    // WAVE: allow up to availability.patients_per_slot (or doctor's patients_per_slot) per block
    if (scheduleType === 'wave') {
      // treat dto.start_time as the block start (session_start block) and check how many already in that block
      const blockStart = startTimeObj;

      const appointmentsInBlock = await this.prisma.appointment.findMany({
        where: {
          doctorId,
          date: dateObj,
          start_time: blockStart,
          status: 'booked',
        },
        orderBy: { createdAt: 'asc' },
      });

      const patientsPerSlot =
        availability.patients_per_slot ?? doctor.patients_per_slot ?? 3;

      if (appointmentsInBlock.length >= patientsPerSlot) {
        throw new ConflictException('This wave block is full');
      }

      // For wave we store appointment start_time as the chosen block start_time (server can compute reporting time on read)
      // (If you want to assign different reporting times per patient, we can compute and store here as start_time)
      // For now we'll store the block start as start_time and let frontend compute/report relative positions,
      // or we can compute sub-slot and store it — pick one. Here we will compute and store assigned sub-slot start_time.

      // compute sub-slot length in minutes (prefer availability.slot_duration_min else use difference session_end-session_start)
      const blockSlotDuration =
        availability.slot_duration_min ??
        Math.round((availability.session_end.getTime() - availability.session_start.getTime()) / 60000);

      const subSlotMinutes = Math.floor(blockSlotDuration / patientsPerSlot) || 1;

      // assign index (0..)
      const nextIndex = appointmentsInBlock.length;
      const blockStartMinutes =
        blockStart.getHours() * 60 + blockStart.getMinutes();
      const assignedStartMinutes = blockStartMinutes + nextIndex * subSlotMinutes;
      const assignedHour = Math.floor(assignedStartMinutes / 60);
      const assignedMin = assignedStartMinutes % 60;

      const assignedStart = new Date(blockStart);
      assignedStart.setHours(assignedHour, assignedMin, 0, 0);

      const assignedEnd = new Date(assignedStart.getTime() + subSlotMinutes * 60_000);

      return this.prisma.appointment.create({
        data: {
          doctorId,
          patientId,
          date: dateObj,
          session,
          start_time: assignedStart,
          end_time: assignedEnd,
          availabilityId: availability.id,
        },
      });
    }

    throw new BadRequestException('Unsupported schedule type');
  }

  // list patient appointments
  async getPatientAppointments(patientId: number) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: { doctor: true, availability: true },
      orderBy: { date: 'asc' },
    });
  }

  // list doctor appointments
  async getDoctorAppointments(doctorId: number) {
    return this.prisma.appointment.findMany({
      where: { doctorId },
      include: { patient: true, availability: true },
      orderBy: { date: 'asc' },
    });
  }

  // cancel
  async cancelAppointment(id: number, userId: number, role: string) {
    const apt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!apt) throw new NotFoundException('Appointment not found');

    if (role === 'patient' && apt.patientId !== userId)
      throw new BadRequestException('Not your appointment');

    if (role === 'doctor' && apt.doctorId !== userId)
      throw new BadRequestException('Doctor can cancel only own appointments');

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}

