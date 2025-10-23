export function unreachable_UnsupportedCalendar(): never {
  throw new Error('Calendar other than ISO8601 is not supported, but this error should never triggered by the user code.');
}
