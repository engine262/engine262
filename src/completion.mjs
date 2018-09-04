import {
  Assert,
  Call,
} from './abstract-ops/all.mjs';
import { New as NewValue } from './value.mjs';

// #sec-completion-record-specification-type
export class Completion {
  constructor(type, value, target) {
    if (type instanceof Completion) {
      return type;
    }
    this.Type = type;
    this.Value = value;
    this.Target = target;
  }
}

// #sec-normalcompletion
export class NormalCompletion extends Completion {
  constructor(value) {
    super('normal', value);
  }
}

export class AbruptCompletion extends Completion {}

export class BreakCompletion extends AbruptCompletion {
  constructor(target) {
    super('break', undefined, target);
  }
}

export class ContinueCompletion extends AbruptCompletion {
  constructor(target) {
    super('continue', undefined, target);
  }
}

// #sec-normalcompletion
export class ReturnCompletion extends AbruptCompletion {
  constructor(value) {
    super('return', value);
  }
}

// #sec-throwcompletion
export class ThrowCompletion extends AbruptCompletion {
  constructor(value) {
    super('throw', value);
  }
}

// #sec-updateempty
export function UpdateEmpty(completionRecord, value) {
  if (completionRecord.Type === 'return' || completionRecord.Type === 'throw') {
    Assert(completionRecord.Value !== undefined);
  }
  if (completionRecord.Value !== undefined) {
    return completionRecord;
  }
  return new Completion(completionRecord.Type, value, completionRecord.Target);
}

// #sec-returnifabrupt
export function ReturnIfAbrupt(argument) {
  if (argument instanceof AbruptCompletion) {
    return argument;
  }
  if (argument instanceof Completion) {
    return argument.Value;
  }
  return argument;
}

// #sec-returnifabrupt-shorthands ? OperationName()
export const Q = ReturnIfAbrupt;

// #sec-returnifabrupt-shorthands ! OperationName()
export function X(val) {
  Assert(!(val instanceof AbruptCompletion));
  if (val instanceof Completion) {
    return val.Value;
  }
  return val;
}

// #sec-ifabruptrejectpromise
export function IfAbruptRejectPromise(value, capability) {
  if (value instanceof AbruptCompletion) {
    const hygenicTemp = Call(capability.Reject, NewValue(undefined), [value.Value]);
    if (hygenicTemp instanceof AbruptCompletion) {
      return hygenicTemp;
    }
    return capability.Promise;
  } else if (value instanceof Completion) {
    value = value.Value;
  }
}

export function EnsureCompletion(val) {
  if (val instanceof Completion) {
    return val;
  }
  return new NormalCompletion(val);
}

// #await
export function Await() {}
