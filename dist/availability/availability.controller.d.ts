import { AvailabilityService } from './availability.service';
export declare class AvailabilityController {
    private availabilityService;
    constructor(availabilityService: AvailabilityService);
    create(doctorId: string, dto: any): Promise<{
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    }>;
    getByDoctorAndDate(doctorId: string, date: string): Promise<({
        appointments: {
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
        }[];
    } & {
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    })[]>;
    update(id: string, dto: any): Promise<{
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    }>;
    delete(id: string): Promise<{
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    }>;
}
