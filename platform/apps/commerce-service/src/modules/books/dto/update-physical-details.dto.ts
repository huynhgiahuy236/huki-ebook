import { PartialType, OmitType } from '@nestjs/swagger';
import { PhysicalBookDetailsDto } from './book-details.dto';

class PhysicalWithoutStockDto extends OmitType(PhysicalBookDetailsDto, ['stock'] as const) {}

export class UpdatePhysicalDetailsDto extends PartialType(PhysicalWithoutStockDto) {}
