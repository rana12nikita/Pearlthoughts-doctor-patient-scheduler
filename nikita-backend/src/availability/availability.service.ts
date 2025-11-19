import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------
  // CREATE availability
  // ------------------------------
  async create(doctorId: number, dto: any) {
    const dateObj = new Date(dto.date);

    // Check if duplicate availability exists
    const exists = await this.prisma.doctorAvailability.findFirst({
      where: { doctorId, date: dateObj },
    });

    if (exists) {
      throw new ConflictException('Availability already exists for this date');
    }

    return this.prisma.doctorAvailability.create({
      data: {
        doctorId,
        date: dateObj,
        session_start: new Date(dto.session_start),
        session_end: new Date(dto.session_end),
        slot_duration_min: dto.slot_duration_min ?? null,
        patients_per_slot: dto.patients_per_slot ?? null,
      },
    });
  }

  // ------------------------------
  // GET availability by doctor + date
  // ------------------------------
  async findByDoctorAndDate(doctorId: number, date: string) {
    const dateObj = new Date(date);

    return this.prisma.doctorAvailability.findMany({
      where: { doctorId, date: dateObj },
      include: { appointments: true },
    });
  }

  // ------------------------------
  // UPDATE availability
  // ------------------------------
  async update(id: number, dto: any) {
    const availability = await this.prisma.doctorAvailability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    // Cannot update if a booked appointment exists
    const hasAppointment = await this.prisma.appointment.findFirst({
      where: { availabilityId: id, status: 'booked' },
    });

    if (hasAppointment) {
      throw new ConflictException(
        'Cannot update availability because appointments are booked'
      );
    }

    return this.prisma.doctorAvailability.update({
      where: { id },
      data: {
        session_start: dto.session_start ? new Date(dto.session_start) : undefined,
        session_end: dto.session_end ? new Date(dto.session_end) : undefined,
        slot_duration_min: dto.slot_duration_min ?? undefined,
        patients_per_slot: dto.patients_per_slot ?? undefined,
      },
    });
  }

  // ------------------------------
  // DELETE availability
  // ------------------------------
  async delete(id: number) {
    const exists = await this.prisma.doctorAvailability.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('Availability not found');
    }

    return this.prisma.doctorAvailability.delete({
      where: { id },
    });
  }
}

