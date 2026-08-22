import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CommunityRequest } from './community-auth.guard';

export const CurrentCommunityActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<CommunityRequest>().user,
);
