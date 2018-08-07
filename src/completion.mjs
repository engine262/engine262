/* @flow */

/* ::
import type {
  Value,
  UndefinedValue,
  NullValue,
  BooleanValue,
  NumberValue,
  StringValue,
  SymbolValue,
  FunctionValue,
  BuiltinFunctionValue,
  ObjectValue,
  ArrayValue,
  ProxyValue,
} from './value.mjs';
*/

import {
  Assert,
} from './abstract-ops/all.mjs';

export class Completion {
  /* ::
  Type: string
  Value: Value | void
  Target: ?Object
  */
  constructor(type /* : string */, value /* : Value | void */, target /* : ?Object */) {
    this.Type = type;
    this.Value = value;
    this.Target = target;
  }
}

export class NormalCompletion extends Completion {
  constructor(value /* : Value | void */) {
    super('normal', value);
  }
}

export class AbruptCompletion extends Completion {}

export class BreakCompletion extends AbruptCompletion {
  constructor(target /* : ?Object */) {
    super('break', undefined, target);
  }
}

export class ContinueCompletion extends AbruptCompletion {
  constructor(target /* : ?Object */) {
    super('continue', undefined, target);
  }
}

export class ReturnCompletion extends AbruptCompletion {
  constructor(value /* : Value */) {
    super('return', value);
  }
}

export class ThrowCompletion extends AbruptCompletion {
  constructor(value /* : Value */) {
    super('throw', value);
  }
}

export function UpdateEmpty(completionRecord /* : Completion */, value /* : Value */) {
  if (completionRecord.Type === 'return' || completionRecord.Type === 'throw') {
    Assert(completionRecord.Value !== undefined);
  }
  if (completionRecord.Value !== undefined) {
    return completionRecord;
  }
  return new Completion(completionRecord.Type, value, completionRecord.Target);
}

/* ::
declare function ReturnIfAbrupt<T>(T): T;
declare function ReturnIfAbrupt(Completion): Value;
*/

export function ReturnIfAbrupt(argument) {
  if (argument instanceof AbruptCompletion) {
    throw argument;
  }
  if (argument instanceof Completion) {
    return argument.Value;
  }
  return argument;
}

// #sec-returnifabrupt-shorthands ? OperationName()
export const Q = ReturnIfAbrupt;

// #sec-returnifabrupt-shorthands ! OperationName()

/* ::
declare function X<T>(T): T;
declare function X(Completion): Value;
*/

export function X(val) {
  Assert(!(val instanceof AbruptCompletion));
  if (val instanceof Completion) {
    return val.Value;
  }
  return val;
}
