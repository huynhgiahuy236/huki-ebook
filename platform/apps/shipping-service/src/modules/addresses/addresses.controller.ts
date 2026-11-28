/**
 * HUKI EBOOK - Addresses Controller
 *
 * Handles user shipping address management
 */

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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { CurrentActor } from '../../common/current-actor.decorator';
import {
  AuthenticatedGuard,
  ShippingActor,
} from '../../common/shipping-auth.guard';
import { CreateAddressDto, UpdateAddressDto } from './address.dto';
import { AddressesService } from './addresses.service';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthenticatedGuard)
@Controller('shipping/address')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({
    summary: 'List user shipping addresses',
    description: 'Returns all shipping addresses for the authenticated user.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of addresses' })
  @ApiStandardErrors(401)
  list(@CurrentActor() actor: ShippingActor) {
    return this.addresses.list(actor.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get shipping address by ID',
    description: 'Returns a single shipping address by ID. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiSuccessResponse(undefined, { description: 'Address details' })
  @ApiStandardErrors(401, 403, 404)
  findOne(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addresses.findOne(actor.sub, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new shipping address',
    description: 'Creates a new shipping address for the user.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Address created successfully' })
  @ApiStandardErrors(400, 401)
  create(
    @CurrentActor() actor: ShippingActor,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addresses.create(actor.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a shipping address',
    description: 'Updates an existing shipping address.',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiSuccessResponse(undefined, { description: 'Address updated successfully' })
  @ApiStandardErrors(400, 401, 403, 404)
  update(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a shipping address',
    description: 'Deletes a shipping address.',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiSuccessResponse(undefined, { description: 'Address deleted successfully' })
  @ApiStandardErrors(401, 403, 404)
  remove(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addresses.remove(actor.sub, id);
  }
}
