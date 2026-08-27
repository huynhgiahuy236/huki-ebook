import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/current-actor.decorator';
import {
  AuthenticatedGuard,
  ShippingActor,
} from '../../common/shipping-auth.guard';
import { CreateAddressDto, UpdateAddressDto } from './address.dto';
import { AddressesService } from './addresses.service';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('shipping/address')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List user shipping addresses' })
  list(@CurrentActor() actor: ShippingActor) {
    return this.addresses.list(actor.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new shipping address' })
  create(
    @CurrentActor() actor: ShippingActor,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addresses.create(actor.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shipping address' })
  update(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shipping address' })
  remove(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addresses.remove(actor.sub, id);
  }
}
