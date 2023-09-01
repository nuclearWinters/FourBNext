import { initTRPC } from '@trpc/server';
import { ContextLocals } from './types';

const t = initTRPC.context<ContextLocals>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;