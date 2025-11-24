import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    signup(data: any): Promise<{
        access_token: string;
    }>;
    validateUser(email: string, password: string): Promise<{
        id: number;
        email: string;
        password: string;
        name: string | null;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createToken(user: any): {
        access_token: string;
    };
    login(user: any): Promise<{
        access_token: string;
    }>;
}
