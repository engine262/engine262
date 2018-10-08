import {
  Assert,
  Call,
} from './abstract-ops/all.mjs';
import { Value, Reference } from './value.mjs';

// #sec-completion-record-specification-type
export function Completion(type, value, target) {
  if (new.target === Completion) {
    if (typeof type !== 'string') {
      throw new TypeError('Completion type is not a string');
    }
    this.Type = type;
    this.Value = value;
    this.Target = target;
  }
  return type;
}

// #sec-normalcompletion
export class NormalCompletion {
  constructor(value) {
    return new Completion('normal', value);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'normal';
  }
}

export class AbruptCompletion {
  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type !== 'normal';
  }
}

export class BreakCompletion {
  constructor(target) {
    return new Completion('break', undefined, target);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'break';
  }
}

export class ContinueCompletion {
  constructor(target) {
    return new Completion('continue', undefined, target);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'continue';
  }
}

// #sec-normalcompletion
export class ReturnCompletion {
  constructor(value) {
    return new Completion('return', value);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'return';
  }
}

// #sec-throwcompletion
export class ThrowCompletion {
  constructor(value) {
    return new Completion('throw', value);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'throw';
  }
}

// #sec-updateempty
export function UpdateEmpty(completionRecord, value) {
  Assert(completionRecord instanceof Completion);
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
    const hygenicTemp = Call(capability.Reject, Value.undefined, [value.Value]);
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
  if (val instanceof Reference) {
    return val;
  }
  return new NormalCompletion(val);
}

// #await
export function Await() {}
