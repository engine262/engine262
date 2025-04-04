// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-date-objects */

import { X } from '../completion.mts';
import {
  ToIntegerOrInfinity,
  F, R,
  Assert,
} from './all.mts';
import type { NumberValue } from '#self';

const mod = (n: number, m: number) => {
  const r = n % m;
  return Math.floor(r >= 0 ? r : r + m);
};

export const HoursPerDay = 24;
export const MinutesPerHour = 60;
export const SecondsPerMinute = 60;
export const msPerSecond = 1000;
export const msPerMinute = msPerSecond * SecondsPerMinute;
export const msPerHour = msPerMinute * MinutesPerHour;
export const msPerDay = msPerHour * HoursPerDay;

/** https://tc39.es/ecma262/#sec-day-number-and-time-within-day */
export function Day(t: NumberValue) {
  return F(Math.floor(R(t) / msPerDay));
}

export function TimeWithinDay(t: NumberValue) {
  return F(mod(R(t), msPerDay));
}

/** https://tc39.es/ecma262/#sec-year-number */
export function DaysInYear(y: NumberValue) {
  const ry = R(y);
  if (mod(ry, 400) === 0) {
    return F(366);
  }
  if (mod(ry, 100) === 0) {
    return F(365);
  }
  if (mod(ry, 4) === 0) {
    return F(366);
  }
  return F(365);
}

export function DayFromYear(_y: NumberValue) {
  const y = R(_y);
  return F(365 * (y - 1970) + Math.floor((y - 1969) / 4) - Math.floor((y - 1901) / 100) + Math.floor((y - 1601) / 400));
}

export function TimeFromYear(y: NumberValue) {
  return F(msPerDay * R(DayFromYear(y)));
}

export const msPerAverageYear = 12 * 30.436875 * msPerDay;

export function YearFromTime(_t: NumberValue) {
  const t = R(_t);
  let year = Math.floor((t + msPerAverageYear / 2) / msPerAverageYear) + 1970;
  if (R(TimeFromYear(F(year))) > t) {
    year -= 1;
  }
  return F(year);
}

export function InLeapYear(t: NumberValue) {
  if (R(DaysInYear(YearFromTime(t))) === 366) {
    return F(1);
  }
  return F(0);
}

/** https://tc39.es/ecma262/#sec-month-number */
export function MonthFromTime(t: NumberValue) {
  const inLeapYear = R(InLeapYear(t));
  const dayWithinYear = R(DayWithinYear(t));
  if (dayWithinYear < 31) {
    return F(+0);
  }
  if (dayWithinYear < 59 + inLeapYear) {
    return F(1);
  }
  if (dayWithinYear < 90 + inLeapYear) {
    return F(2);
  }
  if (dayWithinYear < 120 + inLeapYear) {
    return F(3);
  }
  if (dayWithinYear < 151 + inLeapYear) {
    return F(4);
  }
  if (dayWithinYear < 181 + inLeapYear) {
    return F(5);
  }
  if (dayWithinYear < 212 + inLeapYear) {
    return F(6);
  }
  if (dayWithinYear < 243 + inLeapYear) {
    return F(7);
  }
  if (dayWithinYear < 273 + inLeapYear) {
    return F(8);
  }
  if (dayWithinYear < 304 + inLeapYear) {
    return F(9);
  }
  if (dayWithinYear < 334 + inLeapYear) {
    return F(10);
  }
  Assert(dayWithinYear < 365 + inLeapYear);
  return F(11);
}

export function DayWithinYear(t: NumberValue) {
  return F(R(Day(t)) - R(DayFromYear(YearFromTime(t))));
}

/** https://tc39.es/ecma262/#sec-date-number */
export function DateFromTime(t: NumberValue) {
  const inLeapYear = R(InLeapYear(t));
  const dayWithinYear = R(DayWithinYear(t));
  const month = R(MonthFromTime(t));
  switch (month) {
    case 0: return F(dayWithinYear + 1);
    case 1: return F(dayWithinYear - 30);
    case 2: return F(dayWithinYear - 58 - inLeapYear);
    case 3: return F(dayWithinYear - 89 - inLeapYear);
    case 4: return F(dayWithinYear - 119 - inLeapYear);
    case 5: return F(dayWithinYear - 150 - inLeapYear);
    case 6: return F(dayWithinYear - 180 - inLeapYear);
    case 7: return F(dayWithinYear - 211 - inLeapYear);
    case 8: return F(dayWithinYear - 242 - inLeapYear);
    case 9: return F(dayWithinYear - 272 - inLeapYear);
    case 10: return F(dayWithinYear - 303 - inLeapYear);
    default:
  }
  Assert(month === 11);
  return F(dayWithinYear - 333 - inLeapYear);
}

/** https://tc39.es/ecma262/#sec-week-day */
export function WeekDay(t: NumberValue) {
  return F(mod(R(Day(t)) + 4, 7));
}

/** https://tc39.es/ecma262/#sec-local-time-zone-adjustment */
export function LocalTZA(_t: NumberValue, _isUTC: boolean) {
  // TODO: implement this function properly.
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
export function HourFromTime(t: NumberValue) {
  return F(mod(Math.floor(R(t) / msPerHour), HoursPerDay));
}

export function MinFromTime(t: NumberValue) {
  return F(mod(Math.floor(R(t) / msPerMinute), MinutesPerHour));
}

export function SecFromTime(t: NumberValue) {
  return F(mod(Math.floor(R(t) / msPerSecond), SecondsPerMinute));
}

export function msFromTime(t: NumberValue) {
  return F(mod(R(t), msPerSecond));
}

/** https://tc39.es/ecma262/#sec-maketime */
export function MakeTime(hour: NumberValue, min: NumberValue, sec: NumberValue, ms: NumberValue) {
  if (!Number.isFinite(R(hour)) || !Number.isFinite(R(min)) || !Number.isFinite(R(sec)) || !Number.isFinite(R(ms))) {
    return F(NaN);
  }
  const h = X(ToIntegerOrInfinity(hour));
  const m = X(ToIntegerOrInfinity(min));
  const s = X(ToIntegerOrInfinity(sec));
  const milli = X(ToIntegerOrInfinity(ms));
  const t = h * msPerHour + m * msPerMinute + s * msPerSecond + milli;
  return F(t);
}

const daysWithinYearToEndOfMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/** https://tc39.es/ecma262/#sec-makeday */
export function MakeDay(year: NumberValue, month: NumberValue, date: NumberValue) {
  if (!Number.isFinite(R(year)) || !Number.isFinite(R(month)) || !Number.isFinite(R(date))) {
    return F(NaN);
  }
  const y = X(ToIntegerOrInfinity(year));
  const m = X(ToIntegerOrInfinity(month));
  const dt = X(ToIntegerOrInfinity(date));
  const ym = y + Math.floor(m / 12);
  const mn = mod(m, 12);
  const ymday = R(DayFromYear(F(ym + (mn > 1 ? 1 : 0)))) - 365 * (mn > 1 ? 1 : 0) + daysWithinYearToEndOfMonth[mn];
  const t = F(ymday * msPerDay);
  return F(R(Day(t)) + dt - 1);
}

/** https://tc39.es/ecma262/#sec-makedate */
export function MakeDate(day: NumberValue, time: NumberValue) {
  if (!Number.isFinite(R(day)) || !Number.isFinite(R(time))) {
    return F(NaN);
  }
  return F(R(day) * msPerDay + R(time));
}

/** https://tc39.es/ecma262/#sec-timeclip */
export function TimeClip(time: NumberValue) {
  // 1. If time is not finite, return NaN.
  if (!time.isFinite()) {
    return F(NaN);
  }
  // 2. If abs(ℝ(time)) > 8.64 × 1015, return NaN.
  if (Math.abs(R(time)) > 8.64e15) {
    return F(NaN);
  }
  // 3. Return 𝔽(! ToIntegerOrInfinity(time)).
  return F(X(ToIntegerOrInfinity(time)));
}
