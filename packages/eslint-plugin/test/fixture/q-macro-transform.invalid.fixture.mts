import {
  Q,
  X,
} from '#self';

declare function IfAbruptCloseIterator(value: unknown, iterator: unknown): unknown;
declare function IfAbruptRejectPromise(value: unknown, capability: unknown): unknown;
declare function consume(value: unknown): unknown;
declare function createValue(): unknown;
declare function createIterator(): unknown;

export function unsupportedMacroPositions(
  value: unknown,
  condition: boolean,
  capability: unknown,
) {
  while (Q(value)) consume(value);
  if (condition && Q(value)) consume(value);
  consume(condition ? Q(value) : value);
  IfAbruptRejectPromise(createValue(), capability);
  IfAbruptCloseIterator(value, createIterator());
  const closure = () => X(value);
  return closure;
}
