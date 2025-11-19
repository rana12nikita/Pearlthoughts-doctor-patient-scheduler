import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.doctor.findMany({
      include: { user: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async updateScheduleType(id: number, schedule_Type: 'stream' | 'wave') {
    const exists = await this.prisma.doctor.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Doctor not found');

    return this.prisma.doctor.update({
      where: { id },
      data: { schedule_Type },
    });
  }
}

