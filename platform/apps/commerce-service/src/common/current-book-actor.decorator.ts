import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BookRequest } from './book-auth.guard';

export const CurrentBookActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<BookRequest>().user,
);
