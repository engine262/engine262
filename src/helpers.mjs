import { X } from './completion.mjs';

export function outOfRange(fn, arg) {
  const e = new RangeError(`${fn}() argument out of range`);
  e.detail = arg;
  return e;
}

export function Unwind(iterator, maxSteps = 1) {
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

export function HandleInResume(fn, ...args) {
  const bound = () => fn(...args);
  bound[kSafeToResume] = true;
  return bound;
}

export function Resume(context, completion) {
  const { value } = context.codeEvaluationState.next(completion);
  if (typeof value === 'function' && value[kSafeToResume] === true) {
    return X(value());
  }
  return value;
}
