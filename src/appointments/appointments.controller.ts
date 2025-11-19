import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private apptService: AppointmentsService) {}

  @Post('book/:patientId')
  create(@Param('patientId') patientId: string, @Body() dto: any) {
    return this.apptService.create(dto, Number(patientId));
  }

  @Get('patient/:id')
  patientAppointments(@Param('id') id: string) {
    return this.apptService.getPatientAppointments(Number(id));
  }

  @Get('doctor/:id')
  doctorAppointments(@Param('id') id: string) {
    return this.apptService.getDoctorAppointments(Number(id));
  }

  @Post('cancel/:id/:userId/:role')
  cancel(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('role') role: string,
  ) {
    return this.apptService.cancelAppointment(
      Number(id),
      Number(userId),
      role,
    );
  }
}

