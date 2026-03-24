import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCompany = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().company;
    },
);