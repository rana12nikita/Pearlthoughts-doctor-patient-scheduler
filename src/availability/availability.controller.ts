import { Controller, Post, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Post(':doctorId')
  create(@Param('doctorId') doctorId: string, @Body() dto: any) {
    return this.availabilityService.create(Number(doctorId), dto);
  }

  @Get(':doctorId/:date')
  getByDoctorAndDate(
    @Param('doctorId') doctorId: string,
    @Param('date') date: string,
  ) {
    return this.availabilityService.findByDoctorAndDate(Number(doctorId), date);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.availabilityService.update(Number(id), dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.availabilityService.delete(Number(id));
  }
}

