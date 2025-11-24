import { PrismaService } from '../prisma/prisma.service';
export declare class DoctorsService {
    private prisma;
    constructor(prisma: PrismaService);
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
    findOne(id: number): Promise<({
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
    }) | null>;
    updateScheduleType(id: number, schedule_Type: 'stream' | 'wave'): Promise<{
        id: number;
        email: string | null;
        name: string;
        schedule_Type: string | null;
        patients_per_slot: number | null;
        userId: number | null;
    }>;
}
