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
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'List user shipping addresses',
    description: 'Returns all shipping addresses for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  list(@CurrentActor() actor: ShippingActor) {
    return this.addresses.list(actor.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new shipping address',
    description: 'Creates a new shipping address for the user.',
  })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid address data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiForbiddenResponse({ description: 'Address does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiForbiddenResponse({ description: 'Address does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  remove(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addresses.remove(actor.sub, id);
  }
}
