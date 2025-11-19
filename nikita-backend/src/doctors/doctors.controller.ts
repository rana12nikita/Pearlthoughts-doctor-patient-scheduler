import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async findAll() {
    return this.doctorsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const doctor = await this.doctorsService.findOne(Number(id));
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  @Patch(':id/schedule-type')
  async updateScheduleType(
    @Param('id') id: string,
    @Body() body: { schedule_Type: 'stream' | 'wave' },
  ) {
    return this.doctorsService.updateScheduleType(Number(id), body.schedule_Type);
  }
}

