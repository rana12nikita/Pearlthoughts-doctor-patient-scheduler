import { PatientsService } from './patients.service';
export declare class PatientsController {
    private patientService;
    constructor(patientService: PatientsService);
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
        userId: number | null;
    }>;
}
