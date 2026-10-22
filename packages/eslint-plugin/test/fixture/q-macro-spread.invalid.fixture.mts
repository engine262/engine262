import { Q } from '#self';

declare function IfAbruptCloseIterator(...args: unknown[]): unknown;
declare function IfAbruptRejectPromise(...args: unknown[]): unknown;

export function spreadQ(args: Parameters<typeof Q>) {
  return Q(...args);
}

export function spreadIfAbruptRejectPromise(args: Parameters<typeof IfAbruptRejectPromise>) {
  return IfAbruptRejectPromise(...args);
}

export function spreadIfAbruptCloseIterator(args: Parameters<typeof IfAbruptCloseIterator>) {
  return IfAbruptCloseIterator(...args);
}
