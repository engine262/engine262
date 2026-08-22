// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-date-objects */

import { X } from '../completion.mts';
import {
  ToIntegerOrInfinity,
  F, R,
  Assert,
  type Integer,
  type IntegralNumber,
  type NaN,
  type Num,
} from './all.mts';
import { floorDiv, modulo } from './math.mts';
import { mark_OtherCalendarNotImplemented } from './temporal/not-implemented.mts';
import { NumberValue } from '#self';

/** https://tc39.es/ecma262/pr/3759/#sec-time-values-and-time-range */
export type FiniteTimeValue = IntegralNumber;
export type TimeValue = FiniteTimeValue | NaN;
export const HoursPerDay = 24n;
export const MinutesPerHour = 60n;
export const SecondsPerMinute = 60n;
export const msPerSecond = 1000n;
export const nsPerSecond = 10n ** 9n;
export const nsPerMillisecond = 10n ** 6n;
export const nsPerMicrosecond = 10n ** 3n;
export const msPerMinute = msPerSecond * SecondsPerMinute;
export const msPerHour = msPerMinute * MinutesPerHour;
export const msPerDay = msPerHour * HoursPerDay;
export const NanosecondsPerDay = 10n ** 6n * msPerDay;
export const MaxEpochNanoseconds = 10n ** 8n * NanosecondsPerDay;
export const MinEpochNanoseconds = -MaxEpochNanoseconds;
export const msPerAverageYear = 12 * 30.436875 * Number(msPerDay);

/** https://tc39.es/ecma262/#sec-day-number-and-time-within-day */
export function Day(t: FiniteTimeValue): Integer {
  return floorDiv(BigInt(t), msPerDay);
}

export function TimeWithinDay(t: FiniteTimeValue): Integer {
  return modulo(BigInt(t), msPerDay);
}

/** https://tc39.es/ecma262/#sec-dayfromyear */
export function DayFromYear(y: Integer): Integer {
  const numYears1 = y - 1970n;
  const numYears4 = floorDiv(y - 1969n, 4n);
  const numYears100 = floorDiv(y - 1901n, 100n);
  const numYears400 = floorDiv(y - 1601n, 400n);
  return 365n * numYears1 + numYears4 - numYears100 + numYears400;
}

export function TimeFromYear(y: Integer): TimeValue {
  return Number(msPerDay * DayFromYear(y)) as TimeValue;
}

export function YearFromTime(t: FiniteTimeValue): Integer {
  let year = BigInt(Math.floor(((t + msPerAverageYear / 2) / msPerAverageYear) + 1970));
  if (TimeFromYear(year) > t) {
    year -= 1n;
  }
  return year;
}

export function DayWithinYear(t: FiniteTimeValue): Integer {
  return Day(t) - DayFromYear(YearFromTime(t));
}

export function InLeapYear(t: FiniteTimeValue): 0n | 1n {
  const y = YearFromTime(t);
  if (modulo(y, 400n) === 0n) return 1n;
  if (modulo(y, 100n) === 0n) return 0n;
  if (modulo(y, 4n) === 0n) return 1n;
  return 0n;
}

/** https://tc39.es/ecma262/#sec-month-number */
export function MonthFromTime(t: FiniteTimeValue): Integer {
  const inLeapYear = InLeapYear(t);
  const dayWithinYear = DayWithinYear(t);
  if (dayWithinYear < 31n) return 0n;
  if (dayWithinYear < 59n + inLeapYear) return 1n;
  if (dayWithinYear < 90n + inLeapYear) return 2n;
  if (dayWithinYear < 120n + inLeapYear) return 3n;
  if (dayWithinYear < 151n + inLeapYear) return 4n;
  if (dayWithinYear < 181n + inLeapYear) return 5n;
  if (dayWithinYear < 212n + inLeapYear) return 6n;
  if (dayWithinYear < 243n + inLeapYear) return 7n;
  if (dayWithinYear < 273n + inLeapYear) return 8n;
  if (dayWithinYear < 304n + inLeapYear) return 9n;
  if (dayWithinYear < 334n + inLeapYear) return 10n;
  Assert(dayWithinYear < 365n + inLeapYear);
  return 11n;
}

/** https://tc39.es/ecma262/#sec-date-number */
export function DateFromTime(t: FiniteTimeValue): Integer {
  const inLeapYear = InLeapYear(t);
  const dayWithinYear = DayWithinYear(t);
  const month = MonthFromTime(t);
  switch (month) {
    case 0n: return dayWithinYear + 1n;
    case 1n: return dayWithinYear - 30n;
    case 2n: return dayWithinYear - 58n - inLeapYear;
    case 3n: return dayWithinYear - 89n - inLeapYear;
    case 4n: return dayWithinYear - 119n - inLeapYear;
    case 5n: return dayWithinYear - 150n - inLeapYear;
    case 6n: return dayWithinYear - 180n - inLeapYear;
    case 7n: return dayWithinYear - 211n - inLeapYear;
    case 8n: return dayWithinYear - 242n - inLeapYear;
    case 9n: return dayWithinYear - 272n - inLeapYear;
    case 10n: return dayWithinYear - 303n - inLeapYear;
    default:
  }
  Assert(month === 11n);
  return dayWithinYear - 333n - inLeapYear;
}

/** https://tc39.es/ecma262/#sec-week-day */
export function WeekDay(t: FiniteTimeValue): Integer {
  return modulo(Day(t) + 4n, 7n);
}

/** https://tc39.es/ecma262/#sec-local-time-zone-adjustment */
// remove after Temporal merged
export function LocalTZA(_t: NumberValue, _isUTC: boolean) {
  mark_OtherCalendarNotImplemented();
  return 0;
}

/** https://tc39.es/ecma262/#sec-localtime */
export function LocalTime(t: NumberValue) {
  return F(R(t) + LocalTZA(t, true));
}

/** https://tc39.es/ecma262/#sec-utc-t */
export function UTC(t: NumberValue) {
  return F(R(t) - LocalTZA(t, false));
}

/** https://tc39.es/ecma262/#sec-hours-minutes-second-and-milliseconds */
export function HourFromTime(t: FiniteTimeValue): Integer {
  return modulo(floorDiv(BigInt(t), msPerHour), HoursPerDay);
}

export function MinFromTime(t: FiniteTimeValue): Integer {
  return modulo(floorDiv(BigInt(t), msPerMinute), MinutesPerHour);
}

export function SecFromTime(t: FiniteTimeValue): Integer {
  return modulo(floorDiv(BigInt(t), msPerSecond), SecondsPerMinute);
}

export function MillisecFromTime(t: FiniteTimeValue): Integer {
  return modulo(BigInt(t), msPerSecond);
}

/** https://tc39.es/ecma262/#sec-maketime */
export function MakeTime(hour: Num, min: Num, sec: Num, ms: Num): Num {
  if (!Number.isFinite(hour) || !Number.isFinite(min) || !Number.isFinite(sec) || !Number.isFinite(ms)) {
    return NaN;
  }
  const h = X(ToIntegerOrInfinity(hour));
  const m = X(ToIntegerOrInfinity(min));
  const s = X(ToIntegerOrInfinity(sec));
  const milli = X(ToIntegerOrInfinity(ms));
  return ((h * Number(msPerHour) + m * Number(msPerMinute)) + s * Number(msPerSecond)) + milli;
}

const daysWithinYearToEndOfMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/** https://tc39.es/ecma262/#sec-makeday */
export function MakeDay(year: Num, month: Num, date: Num): Num | NaN {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(date)) {
    return NaN;
  }
  const y = X(ToIntegerOrInfinity(year));
  const m = X(ToIntegerOrInfinity(month));
  const dt = X(ToIntegerOrInfinity(date));
  const ym = y + Math.floor(m / 12);
  if (!Number.isFinite(ym)) return NaN;
  const mn = modulo(m, 12);
  // Find a finite time value t such that YearFromTime(t) = ℝ(ym), MonthFromTime(t) = mn, and DateFromTime(t) = 1; but if this is not possible (because some argument is out of range), return NaN.
  const ymday = Number(DayFromYear(BigInt(ym + (mn > 1 ? 1 : 0)))) - 365 * (mn > 1 ? 1 : 0) + daysWithinYearToEndOfMonth[mn];
  const t = Math.floor(ymday * Number(msPerDay));
  if (!Number.isFinite(t)) return NaN;
  return Number(Day(t)) + dt - 1;
}

/** https://tc39.es/ecma262/#sec-makedate */
export function MakeDate(day: Num, time: Num): Num | NaN {
  if (!Number.isFinite(day) || !Number.isFinite(time)) {
    return NaN;
  }
  const tv = day * Number(msPerDay) + time;
  if (!Number.isFinite(tv)) {
    return NaN;
  }
  return tv;
}

/** https://tc39.es/ecma262/#sec-makefullyear */
export function MakeFullYear(year: NumberValue): IntegralNumber | NaN {
  if (year.isNaN() || year.isInfinity()) return NaN;
  const truncated = X(ToIntegerOrInfinity(year));
  if (truncated >= 0 && truncated <= 99) {
    return 1900 + truncated;
  }
  return truncated;
}


/** https://tc39.es/ecma262/#sec-timeclip */
export function TimeClip(time: Num): TimeValue {
  // 1. If time is not finite, return NaN.
  if (!Number.isFinite(time)) {
    return NaN;
  }
  // 2. If abs(ℝ(time)) > 8.64 × 1015, return NaN.
  if (Math.abs(time) > 8.64e15) {
    return NaN;
  }
  // 3. Return 𝔽(! ToIntegerOrInfinity(time)).
  return X(ToIntegerOrInfinity(time));
}
