import { PrismaService } from '../prisma/prisma.service';
export declare class SchedulingService {
    private prisma;
    constructor(prisma: PrismaService);
    expandSession({ sessionId, newStart, newEnd, strategy, userId, }: {
        sessionId: number;
        newStart?: string;
        newEnd?: string;
        strategy: 'move_affected' | 'push_all' | 'no_change';
        userId: number;
    }): Promise<{
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
    shrinkSession({ sessionId, newStart, newEnd, strategy, allowCompress, targetSlotDuration, userId, }: {
        sessionId: number;
        newStart?: string;
        newEnd?: string;
        strategy: 'compress_then_move' | 'move_affected' | 'cancel_excess';
        allowCompress: boolean;
        targetSlotDuration: number;
        userId: number;
    }): Promise<{
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
