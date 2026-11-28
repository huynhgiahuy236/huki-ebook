import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LiftSanctionDto {
  @ApiProperty({ example: 'Đã khắc phục vi phạm' })
  @IsString()
  @IsNotEmpty()
  liftReason: string;
}
