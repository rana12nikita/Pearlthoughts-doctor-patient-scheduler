import { AppointmentsService } from './appointments.service';
export declare class AppointmentsController {
    private readonly apptService;
    constructor(apptService: AppointmentsService);
    create(doctorId: string, patientId: string, dto: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        sessionId: number;
        doctorId: number | null;
        availabilityId: number | null;
        patientId: number;
        date: Date | null;
        startTime: Date;
        endTime: Date;
        duration: number;
        status: string;
        locked: boolean;
    }>;
    getPatientAppointments(id: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        sessionId: number;
        doctorId: number | null;
        availabilityId: number | null;
        patientId: number;
        date: Date | null;
        startTime: Date;
        endTime: Date;
        duration: number;
        status: string;
        locked: boolean;
    }[]>;
    getDoctorAppointments(id: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        sessionId: number;
        doctorId: number | null;
        availabilityId: number | null;
        patientId: number;
        date: Date | null;
        startTime: Date;
        endTime: Date;
        duration: number;
        status: string;
        locked: boolean;
    }[]>;
    cancel(id: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        sessionId: number;
        doctorId: number | null;
        availabilityId: number | null;
        patientId: number;
        date: Date | null;
        startTime: Date;
        endTime: Date;
        duration: number;
        status: string;
        locked: boolean;
    }>;
    move(id: string, body: {
        newStart: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        priority: string;
        sessionId: number;
        doctorId: number | null;
        availabilityId: number | null;
        patientId: number;
        date: Date | null;
        startTime: Date;
        endTime: Date;
        duration: number;
        status: string;
        locked: boolean;
    }>;
    adjustSession(id: string, body: any): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        doctorId: number;
        date: Date;
        startTime: Date;
        endTime: Date;
        slotDuration: number;
        schedulingType: string | null;
    }>;
}
