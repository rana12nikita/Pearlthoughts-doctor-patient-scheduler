import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateScheduleDto {
  @IsNotEmpty()
  @IsIn(['stream','wave'])
  stream_type: 'stream' | 'wave';
}

