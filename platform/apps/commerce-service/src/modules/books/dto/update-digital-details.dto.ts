import { PartialType } from '@nestjs/swagger';
import { DigitalBookDetailsDto } from './book-details.dto';

export class UpdateDigitalDetailsDto extends PartialType(DigitalBookDetailsDto) {}
