import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ShippingRequest } from './shipping-auth.guard';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<ShippingRequest>().user,
);
