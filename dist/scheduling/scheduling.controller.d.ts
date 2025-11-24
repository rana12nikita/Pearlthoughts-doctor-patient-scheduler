import { SchedulingService } from './scheduling.service';
export declare class SchedulingController {
    private readonly schedulingService;
    constructor(schedulingService: SchedulingService);
    adjustSession(id: string, body: {
        action: 'expand' | 'shrink';
        newStart?: string;
        newEnd?: string;
        strategy: string;
        allowCompress?: boolean;
        targetSlotDuration?: number;
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
    } | {
        error: string;
    }>;
}
