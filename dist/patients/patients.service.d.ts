import { PrismaService } from '../prisma/prisma.service';
export declare class PatientsService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(id: number): Promise<{
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
        userId: number | null;
    }>;
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
        userId: number | null;
    })[]>;
}
