import { Body, Controller, Param, Post } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';

@Controller('scheduling/session')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post(':id/adjust')
  async adjustSession(
    @Param('id') id: string,
    @Body()
    body: {
      action: 'expand' | 'shrink';
      newStart?: string;
      newEnd?: string;
      strategy: string;
      allowCompress?: boolean;
      targetSlotDuration?: number;
      userId: number;
    },
  ) {
    const sessionId = Number(id);

    if (body.action === 'expand') {
      return this.schedulingService.expandSession({
        sessionId,
        newStart: body.newStart,
        newEnd: body.newEnd,
        strategy: body.strategy as any,
        userId: body.userId,
      });
    }

    if (body.action === 'shrink') {
      return this.schedulingService.shrinkSession({
        sessionId,
        newStart: body.newStart,
        newEnd: body.newEnd,
        strategy: body.strategy as any,
        allowCompress: body.allowCompress ?? false,
        targetSlotDuration: body.targetSlotDuration ?? 10,
        userId: body.userId,
      });
    }

    return { error: 'Invalid action' };
  }
}
