// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-date-objects */

import { X } from '../completion.mts';
import {
  ToIntegerOrInfinity,
  F, R,
  Assert,
  type IntegralNumber,
  type NaN,
  type Num,
} from './all.mts';
import { modulo } from './math.mts';
import { mark_OtherCalendarNotImplemented } from './temporal/not-implemented.mts';
import { NumberValue } from '#self';

/** https://tc39.es/ecma262/pr/3759/#sec-time-values-and-time-range */
export type FiniteTimeValue = IntegralNumber;
export type TimeValue = FiniteTimeValue | NaN;
export const HoursPerDay = 24;
export const MinutesPerHour = 60;
export const SecondsPerMinute = 60;
export const msPerSecond = 1000;
export const msPerMinute: F = msPerSecond * SecondsPerMinute;
export const msPerHour: F = msPerMinute * MinutesPerHour;
export const msPerDay: F = msPerHour * HoursPerDay;
export const msPerAverageYear = 12 * 30.436875 * msPerDay;

/** https://tc39.es/ecma262/#sec-day-number-and-time-within-day */
export function Day(t: FiniteTimeValue): IntegralNumber {
  // 𝔽(floor(ℝ(t / msPerDay)))
  return Math.floor(t / msPerDay);
}

export function TimeWithinDay(t: FiniteTimeValue): IntegralNumber {
  // 𝔽(ℝ(t) modulo ℝ(msPerDay))
  return modulo(t, msPerDay);
}

/** https://tc39.es/ecma262/#sec-year-number */
export function DaysInYear(y: IntegralNumber): 365 | 366 {
  const ry = y;
  if (modulo(ry, 400) === 0) return 366;
  if (modulo(ry, 100) === 0) return 365;
  if (modulo(ry, 4) === 0) return 366;
  return 365;
}

export function DayFromYear(y: IntegralNumber): IntegralNumber {
  const ry = y;
  const numYears1 = ry - 1970;
  const numYears4 = Math.floor((ry - 1969) / 4);
  const numYears100 = Math.floor((ry - 1901) / 100);
  const numYears400 = Math.floor((ry - 1601) / 400);
  return (numYears1 * 365 + numYears4 - numYears100 + numYears400);
}

export function TimeFromYear(y: IntegralNumber): TimeValue {
  return (msPerDay * DayFromYear(y)) as TimeValue;
}

export function YearFromTime(t: FiniteTimeValue): IntegralNumber {
  // 1. Return the largest integral Number y (closest to +∞) such that TimeFromYear(y) ≤ t.
  let year = Math.floor(((t + msPerAverageYear / 2) / msPerAverageYear) + 1970);
  if (TimeFromYear(year) > t) {
    year -= 1;
  }
  return year;
}

export function DayWithinYear(t: FiniteTimeValue): IntegralNumber {
  return Day(t) - DayFromYear(YearFromTime(t));
}

export function InLeapYear(t: FiniteTimeValue): 0 | 1 {
  // 1. If DaysInYear(YearFromTime(t)) is 366𝔽, return 1𝔽; else return +0𝔽.
  if (DaysInYear(YearFromTime(t)) === 366) {
    return 1;
  }
  return 0;
}

/** https://tc39.es/ecma262/#sec-month-number */
export function MonthFromTime(t: FiniteTimeValue): IntegralNumber {
  const inLeapYear = InLeapYear(t);
  const dayWithinYear = DayWithinYear(t);
  if (dayWithinYear < 31) return 0;
  if (dayWithinYear < 59 + inLeapYear) return 1;
  if (dayWithinYear < 90 + inLeapYear) return 2;
  if (dayWithinYear < 120 + inLeapYear) return 3;
  if (dayWithinYear < 151 + inLeapYear) return 4;
  if (dayWithinYear < 181 + inLeapYear) return 5;
  if (dayWithinYear < 212 + inLeapYear) return 6;
  if (dayWithinYear < 243 + inLeapYear) return 7;
  if (dayWithinYear < 273 + inLeapYear) return 8;
  if (dayWithinYear < 304 + inLeapYear) return 9;
  if (dayWithinYear < 334 + inLeapYear) return 10;
  Assert(dayWithinYear < 365 + inLeapYear);
  return 11;
}

/** https://tc39.es/ecma262/#sec-date-number */
export function DateFromTime(t: FiniteTimeValue): IntegralNumber {
  const inLeapYear = InLeapYear(t);
  const dayWithinYear = DayWithinYear(t);
  const month = MonthFromTime(t);
  switch (month) {
    case 0: return dayWithinYear + 1;
    case 1: return dayWithinYear - 30;
    case 2: return dayWithinYear - 58 - inLeapYear;
    case 3: return dayWithinYear - 89 - inLeapYear;
    case 4: return dayWithinYear - 119 - inLeapYear;
    case 5: return dayWithinYear - 150 - inLeapYear;
    case 6: return dayWithinYear - 180 - inLeapYear;
    case 7: return dayWithinYear - 211 - inLeapYear;
    case 8: return dayWithinYear - 242 - inLeapYear;
    case 9: return dayWithinYear - 272 - inLeapYear;
    case 10: return dayWithinYear - 303 - inLeapYear;
    default:
  }
  Assert(month === 11);
  return dayWithinYear - 333 - inLeapYear;
}

/** https://tc39.es/ecma262/#sec-week-day */
export function WeekDay(t: FiniteTimeValue): IntegralNumber {
  return modulo(Day(t) + 4, 7);
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
export function HourFromTime(t: FiniteTimeValue): IntegralNumber {
  return modulo(Math.floor(t / msPerHour), HoursPerDay);
}

export function MinFromTime(t: FiniteTimeValue): IntegralNumber {
  return modulo(Math.floor(t / msPerMinute), MinutesPerHour);
}

export function SecFromTime(t: FiniteTimeValue): IntegralNumber {
  return modulo(Math.floor(t / msPerSecond), SecondsPerMinute);
}

export function msFromTime(t: FiniteTimeValue): IntegralNumber {
  return modulo(t, msPerSecond);
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
  return ((h * msPerHour + m * msPerMinute) + s * msPerSecond) + milli;
}

const daysWithinYearToEndOfMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/** https://tc39.es/ecma262/#sec-makeday */
export function MakeDay(year: Num, month: Num, date: Num): Num {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(date)) {
    return NaN;
  }
  const y = X(ToIntegerOrInfinity(year));
  const m = X(ToIntegerOrInfinity(month));
  const dt = X(ToIntegerOrInfinity(date));
  const ym = y + Math.floor(m / 12);
  if (!Number.isFinite(ym)) return NaN;
  const mn = modulo(m, 12);
  // Find a finite time value t such that YearFromTime(t) is ym, MonthFromTime(t) is mn, and DateFromTime(t) is 1𝔽; but if this is not possible (because some argument is out of range), return NaN.
  const ymday = Number(DayFromYear(ym + (mn > 1 ? 1 : 0))) - 365 * (mn > 1 ? 1 : 0) + daysWithinYearToEndOfMonth[mn];
  const t = Math.floor(ymday * msPerDay);
  return Number(Day(t)) + dt - 1;
}

/** https://tc39.es/ecma262/#sec-makedate */
export function MakeDate(day: Num, time: Num): Num {
  if (!Number.isFinite(day) || !Number.isFinite(time)) {
    return NaN;
  }
  const tv = day * msPerDay + time;
  if (!Number.isFinite(tv)) {
    return NaN;
  }
  return tv;
}

/** https://tc39.es/ecma262/#sec-timeclip */
export function TimeClip(time: Num): Num {
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
