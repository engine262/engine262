import { surroundingAgent } from './engine.mjs';
import { Value, Descriptor } from './value.mjs';
import { ToString, DefinePropertyOrThrow } from './abstract-ops/all.mjs';
import { X } from './completion.mjs';
import { inspect } from './api.mjs';

export function outOfRange(fn, arg) {
  const e = new RangeError(`${fn}() argument out of range`);
  e.detail = arg;
  return e;
}

export function unwind(iterator, maxSteps = 1) {
  let steps = 0;
  while (true) {
    const { done, value } = iterator.next('Unwind');
    if (done) {
      return value;
    }
    steps += 1;
    if (steps > maxSteps) {
      throw new RangeError('Max steps exceeded');
    }
  }
}

const kSafeToResume = Symbol('kSameToResume');

export function handleInResume(fn, ...args) {
  const bound = () => fn(...args);
  bound[kSafeToResume] = true;
  return bound;
}

export function resume(context, completion) {
  const { value } = context.codeEvaluationState.next(completion);
  if (typeof value === 'function' && value[kSafeToResume] === true) {
    return X(value());
  }
  return value;
}

export function captureStack(O) {
  const stack = surroundingAgent.executionContextStack
    .slice(0, -1) // remove current Error constructor frame
    .filter((e) => e.Function !== Value.null)
    .map((e) => {
      const name = e.Function.properties.get(new Value('name'));
      if (name) {
        return `\n  at ${X(ToString(name.Value)).stringValue()}`;
      }
      return '\n  at <anonymous>';
    })
    .reverse();

  const errorString = X(ToString(O)).stringValue();
  const trace = `${errorString}${stack.join('')}`;

  X(DefinePropertyOrThrow(O, new Value('stack'), Descriptor({
    Value: new Value(trace),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
}

function inlineInspect(V) {
  return inspect(V, surroundingAgent.currentRealmRecord, true);
}

const messages = {
  NotAFunction: (v) => `${inlineInspect(v)} is not a function`,
  NotAConstructor: (v) => `${inlineInspect(v)} is not a constructor`,
  PromiseResolveFunction: (v) => `Promise resolve function ${inlineInspect(v)} is not callable`,
  PromiseRejectFunction: (v) => `Promise reject function ${inlineInspect(v)} is not callable`,
};

export function msg(key, ...args) {
  return messages[key](...args);
}
