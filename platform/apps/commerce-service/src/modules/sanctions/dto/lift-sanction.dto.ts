import { IsNotEmpty, IsString } from 'class-validator';

export class LiftSanctionDto {
  @IsString()
  @IsNotEmpty()
  liftReason: string;
}
