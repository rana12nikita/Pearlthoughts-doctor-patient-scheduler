import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    return patient;
  }

  async findAll() {
    return this.prisma.patient.findMany({
      include: { user: true },
    });
  }
}

