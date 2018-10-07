export function outOfRange(fn, arg) {
  const e = new RangeError(`${fn}() argument out of range`);
  e.detail = arg;
  return e;
}

export function Unwind(iterator, maxSteps = 1) {
  let steps = 0;
  while (true) {
    const { done, value } = iterator.next();
    if (done) {
      return value;
    }
    steps += 1;
    if (steps > maxSteps) {
      throw new RangeError();
    }
  }
}
