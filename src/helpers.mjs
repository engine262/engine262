export function outOfRange(fn, arg) {
  const e = new RangeError(`${fn}() argument out of range`);
  e.detail = arg;
  return e;
}
