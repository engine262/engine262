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

export function Resume(context, completion) {
  const { value } = context.codeEvaluationState.next(completion);
  // When we suspend and return a function with side effects that might
  // include resuming, instead of calling the function, we return an array
  // which is called here, after the actual resume, like it should be.
  if (Array.isArray(value) && typeof value[0] === 'function') {
    X(value[0](...value.slice(1)));
  }
  return value;
}
