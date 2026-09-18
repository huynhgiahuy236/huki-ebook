import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { InternalAddressesController } from './internal-addresses.controller';
import { AddressesService } from './addresses.service';
@Module({
  controllers: [AddressesController, InternalAddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
