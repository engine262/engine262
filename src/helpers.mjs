export function outOfRange(fn, arg) {
  console.error('OutOfRange'); // eslint-disable-line no-console
  console.error(arg); // eslint-disable-line no-console
  return new RangeError(`${fn}() argument out of range`);
}
