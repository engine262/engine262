/* @flow */

/* ::
import type {
  Value,
} from './value.mjs';
*/

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
