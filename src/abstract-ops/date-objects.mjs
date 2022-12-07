// This file covers abstract operations defined in
/** http://tc39.es/ecma262/#sec-date-objects */

import { X } from '../completion.mjs';
import {
  ToIntegerOrInfinity,
  F,
} from './all.mjs';

const mod = (n, m) => {
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

/** http://tc39.es/ecma262/#sec-day-number-and-time-within-day */
export function Day(t) {
  return F(Math.floor(t.numberValue() / msPerDay));
}

export function TimeWithinDay(t) {
  return F(mod(t.numberValue(), msPerDay));
}

/** http://tc39.es/ecma262/#sec-year-number */
export function DaysInYear(y) {
  y = y.numberValue();
  if (mod(y, 4) !== 0) {
    return F(365);
  }
  if (mod(y, 4) === 0 && mod(y, 100) !== 0) {
    return F(366);
  }
  if (mod(y, 100) === 0 && mod(y, 400) !== 0) {
    return F(365);
  }
  if (mod(y, 400) === 0) {
    return F(366);
  }
}

export function DayFromYear(y) {
  y = y.numberValue();
  return F(365 * (y - 1970) + Math.floor((y - 1969) / 4) - Math.floor((y - 1901) / 100) + Math.floor((y - 1601) / 400));
}

export function TimeFromYear(y) {
  return F(msPerDay * DayFromYear(y).numberValue());
}

export const msPerAverageYear = 12 * 30.436875 * msPerDay;

export function YearFromTime(t) {
  t = t.numberValue();
  let year = Math.floor((t + msPerAverageYear / 2) / msPerAverageYear) + 1970;
  if (TimeFromYear(F(year)).numberValue() > t) {
    year -= 1;
  }
  return F(year);
}

export function InLeapYear(t) {
  if (DaysInYear(YearFromTime(t)).numberValue() === 365) {
    return F(+0);
  }
  if (DaysInYear(YearFromTime(t)).numberValue() === 366) {
    return F(1);
  }
}

/** http://tc39.es/ecma262/#sec-month-number */
export function MonthFromTime(t) {
  const dayWithinYear = DayWithinYear(t).numberValue();
  const inLeapYear = InLeapYear(t).numberValue();
  if (dayWithinYear >= 0 && dayWithinYear < 31) {
    return F(+0);
  }
  if (dayWithinYear >= 31 && dayWithinYear < 59 + inLeapYear) {
    return F(1);
  }
  if (dayWithinYear >= 59 + inLeapYear && dayWithinYear < 90 + inLeapYear) {
    return F(2);
  }
  if (dayWithinYear >= 90 + inLeapYear && dayWithinYear < 120 + inLeapYear) {
    return F(3);
  }
  if (dayWithinYear >= 120 + inLeapYear && dayWithinYear < 151 + inLeapYear) {
    return F(4);
  }
  if (dayWithinYear >= 151 + inLeapYear && dayWithinYear < 181 + inLeapYear) {
    return F(5);
  }
  if (dayWithinYear >= 181 + inLeapYear && dayWithinYear < 212 + inLeapYear) {
    return F(6);
  }
  if (dayWithinYear >= 212 + inLeapYear && dayWithinYear < 243 + inLeapYear) {
    return F(7);
  }
  if (dayWithinYear >= 243 + inLeapYear && dayWithinYear < 273 + inLeapYear) {
    return F(8);
  }
  if (dayWithinYear >= 273 + inLeapYear && dayWithinYear < 304 + inLeapYear) {
    return F(9);
  }
  if (dayWithinYear >= 304 + inLeapYear && dayWithinYear < 334 + inLeapYear) {
    return F(10);
  }
  if (dayWithinYear >= 334 + inLeapYear && dayWithinYear < 365 + inLeapYear) {
    return F(11);
  }
}

export function DayWithinYear(t) {
  return F(Day(t).numberValue() - DayFromYear(YearFromTime(t)).numberValue());
}

/** http://tc39.es/ecma262/#sec-date-number */
export function DateFromTime(t) {
  const dayWithinYear = DayWithinYear(t).numberValue();
  const monthFromTime = MonthFromTime(t).numberValue();
  const inLeapYear = InLeapYear(t).numberValue();
  switch (monthFromTime) {
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
    case 11: return F(dayWithinYear - 333 - inLeapYear);
    default: // Unreachable
  }
}

/** http://tc39.es/ecma262/#sec-week-day */
export function WeekDay(t) {
  return F(mod(Day(t).numberValue() + 4, 7));
}

/** http://tc39.es/ecma262/#sec-local-time-zone-adjustment */
export function LocalTZA(_t, _isUTC) {
  // TODO: implement this function properly.
  return 0;
}

/** http://tc39.es/ecma262/#sec-localtime */
export function LocalTime(t) {
  return F(t.numberValue() + LocalTZA(t, true));
}

/** http://tc39.es/ecma262/#sec-utc-t */
export function UTC(t) {
  return F(t.numberValue() - LocalTZA(t, false));
}

/** http://tc39.es/ecma262/#sec-hours-minutes-second-and-milliseconds */
export function HourFromTime(t) {
  return F(mod(Math.floor(t.numberValue() / msPerHour), HoursPerDay));
}

export function MinFromTime(t) {
  return F(mod(Math.floor(t.numberValue() / msPerMinute), MinutesPerHour));
}

export function SecFromTime(t) {
  return F(mod(Math.floor(t.numberValue() / msPerSecond), SecondsPerMinute));
}

export function msFromTime(t) {
  return F(mod(t.numberValue(), msPerSecond));
}

/** http://tc39.es/ecma262/#sec-maketime */
export function MakeTime(hour, min, sec, ms) {
  if (!Number.isFinite(hour.numberValue()) || !Number.isFinite(min.numberValue()) || !Number.isFinite(sec.numberValue()) || !Number.isFinite(ms.numberValue())) {
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

/** http://tc39.es/ecma262/#sec-makeday */
export function MakeDay(year, month, date) {
  if (!Number.isFinite(year.numberValue()) || !Number.isFinite(month.numberValue()) || !Number.isFinite(date.numberValue())) {
    return F(NaN);
  }
  const y = X(ToIntegerOrInfinity(year));
  const m = X(ToIntegerOrInfinity(month));
  const dt = X(ToIntegerOrInfinity(date));
  const ym = y + Math.floor(m / 12);
  const mn = mod(m, 12);
  const ymday = DayFromYear(F(ym + (mn > 1 ? 1 : 0))).numberValue() - 365 * (mn > 1 ? 1 : 0) + daysWithinYearToEndOfMonth[mn];
  const t = F(ymday * msPerDay);
  return F(Day(t).numberValue() + dt - 1);
}

/** http://tc39.es/ecma262/#sec-makedate */
export function MakeDate(day, time) {
  if (!Number.isFinite(day.numberValue()) || !Number.isFinite(time.numberValue())) {
    return F(NaN);
  }
  return F(day.numberValue() * msPerDay + time.numberValue());
}

/** http://tc39.es/ecma262/#sec-timeclip */
export function TimeClip(time) {
  // 1. If time is not finite, return NaN.
  if (!time.isFinite()) {
    return F(NaN);
  }
  // 2. If abs(ℝ(time)) > 8.64 × 1015, return NaN.
  if (Math.abs(time.numberValue()) > 8.64e15) {
    return F(NaN);
  }
  // 3. Return 𝔽(! ToIntegerOrInfinity(time)).
  return F(X(ToIntegerOrInfinity(time)));
}
