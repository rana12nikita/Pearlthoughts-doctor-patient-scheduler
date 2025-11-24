import { PrismaService } from '../prisma/prisma.service';
export declare class AvailabilityService {
    private prisma;
    constructor(prisma: PrismaService);
    create(doctorId: number, dto: any): Promise<{
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    }>;
    findByDoctorAndDate(doctorId: number, date: string): Promise<({
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
    update(id: number, dto: any): Promise<{
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    }>;
    delete(id: number): Promise<{
        id: number;
        patients_per_slot: number | null;
        doctorId: number;
        date: Date;
        session_start: Date;
        session_end: Date;
        slot_duration_min: number | null;
    }>;
}
