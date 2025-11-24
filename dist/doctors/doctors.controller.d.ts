import { DoctorsService } from './doctors.service';
export declare class DoctorsController {
    private readonly doctorsService;
    constructor(doctorsService: DoctorsService);
    findAll(): Promise<({
        user: {
            id: number;
            email: string;
            password: string;
            name: string | null;
            role: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: number;
        email: string | null;
        name: string;
        schedule_Type: string | null;
        patients_per_slot: number | null;
        userId: number | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: number;
            email: string;
            password: string;
            name: string | null;
            role: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: number;
        email: string | null;
        name: string;
        schedule_Type: string | null;
        patients_per_slot: number | null;
        userId: number | null;
    }>;
    updateScheduleType(id: string, body: {
        schedule_Type: 'stream' | 'wave';
    }): Promise<{
        id: number;
        email: string | null;
        name: string;
        schedule_Type: string | null;
        patients_per_slot: number | null;
        userId: number | null;
    }>;
}
