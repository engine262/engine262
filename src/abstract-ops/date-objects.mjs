// This file covers abstract operations defined in
// 20.3 #sec-date-objects

import {
  Value,
} from '../value.mjs';
import { X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  ToIntegerOrInfinity,
  𝔽,
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

// 20.3.1.2 #sec-day-number-and-time-within-day
export function Day(t) {
  return 𝔽(Math.floor(t.numberValue() / msPerDay));
}

export function TimeWithinDay(t) {
  return 𝔽(mod(t.numberValue(), msPerDay));
}

// 20.3.1.3 #sec-year-number
export function DaysInYear(y) {
  y = y.numberValue();
  if (mod(y, 4) !== 0) {
    return 𝔽(365);
  }
  if (mod(y, 4) === 0 && mod(y, 100) !== 0) {
    return 𝔽(366);
  }
  if (mod(y, 100) === 0 && mod(y, 400) !== 0) {
    return 𝔽(365);
  }
  if (mod(y, 400) === 0) {
    return 𝔽(366);
  }
}

export function DayFromYear(y) {
  y = y.numberValue();
  return 𝔽(365 * (y - 1970) + Math.floor((y - 1969) / 4) - Math.floor((y - 1901) / 100) + Math.floor((y - 1601) / 400));
}

export function TimeFromYear(y) {
  return 𝔽(msPerDay * DayFromYear(y).numberValue());
}

export const msPerAverageYear = 12 * 30.436875 * msPerDay;

export function YearFromTime(t) {
  t = t.numberValue();
  let year = Math.floor((t + msPerAverageYear / 2) / msPerAverageYear) + 1970;
  if (TimeFromYear(𝔽(year)).numberValue() > t) {
    year -= 1;
  }
  return 𝔽(year);
}

export function InLeapYear(t) {
  if (DaysInYear(YearFromTime(t)).numberValue() === 365) {
    return 𝔽(+0);
  }
  if (DaysInYear(YearFromTime(t)).numberValue() === 366) {
    return 𝔽(1);
  }
}

// 20.3.1.4 #sec-month-number
export function MonthFromTime(t) {
  const dayWithinYear = DayWithinYear(t).numberValue();
  const inLeapYear = InLeapYear(t).numberValue();
  if (dayWithinYear >= 0 && dayWithinYear < 31) {
    return 𝔽(+0);
  }
  if (dayWithinYear >= 31 && dayWithinYear < 59 + inLeapYear) {
    return 𝔽(1);
  }
  if (dayWithinYear >= 59 + inLeapYear && dayWithinYear < 90 + inLeapYear) {
    return 𝔽(2);
  }
  if (dayWithinYear >= 90 + inLeapYear && dayWithinYear < 120 + inLeapYear) {
    return 𝔽(3);
  }
  if (dayWithinYear >= 120 + inLeapYear && dayWithinYear < 151 + inLeapYear) {
    return 𝔽(4);
  }
  if (dayWithinYear >= 151 + inLeapYear && dayWithinYear < 181 + inLeapYear) {
    return 𝔽(5);
  }
  if (dayWithinYear >= 181 + inLeapYear && dayWithinYear < 212 + inLeapYear) {
    return 𝔽(6);
  }
  if (dayWithinYear >= 212 + inLeapYear && dayWithinYear < 243 + inLeapYear) {
    return 𝔽(7);
  }
  if (dayWithinYear >= 243 + inLeapYear && dayWithinYear < 273 + inLeapYear) {
    return 𝔽(8);
  }
  if (dayWithinYear >= 273 + inLeapYear && dayWithinYear < 304 + inLeapYear) {
    return 𝔽(9);
  }
  if (dayWithinYear >= 304 + inLeapYear && dayWithinYear < 334 + inLeapYear) {
    return 𝔽(10);
  }
  if (dayWithinYear >= 334 + inLeapYear && dayWithinYear < 365 + inLeapYear) {
    return 𝔽(11);
  }
}

export function DayWithinYear(t) {
  return 𝔽(Day(t).numberValue() - DayFromYear(YearFromTime(t)).numberValue());
}

// 20.3.1.5 #sec-date-number
export function DateFromTime(t) {
  const dayWithinYear = DayWithinYear(t).numberValue();
  const monthFromTime = MonthFromTime(t).numberValue();
  const inLeapYear = InLeapYear(t).numberValue();
  switch (monthFromTime) {
    case 0: return 𝔽(dayWithinYear + 1);
    case 1: return 𝔽(dayWithinYear - 30);
    case 2: return 𝔽(dayWithinYear - 58 - inLeapYear);
    case 3: return 𝔽(dayWithinYear - 89 - inLeapYear);
    case 4: return 𝔽(dayWithinYear - 119 - inLeapYear);
    case 5: return 𝔽(dayWithinYear - 150 - inLeapYear);
    case 6: return 𝔽(dayWithinYear - 180 - inLeapYear);
    case 7: return 𝔽(dayWithinYear - 211 - inLeapYear);
    case 8: return 𝔽(dayWithinYear - 242 - inLeapYear);
    case 9: return 𝔽(dayWithinYear - 272 - inLeapYear);
    case 10: return 𝔽(dayWithinYear - 303 - inLeapYear);
    case 11: return 𝔽(dayWithinYear - 333 - inLeapYear);
    default: // Unreachable
  }
}

// 20.3.1.6 #sec-week-day
export function WeekDay(t) {
  return 𝔽(mod(Day(t).numberValue() + 4, 7));
}

// 20.3.1.7 #sec-local-time-zone-adjustment
export function LocalTZA(_t, _isUTC) {
  // TODO: implement this function properly.
  return 0;
}

// 20.3.1.8 #sec-localtime
export function LocalTime(t) {
  return 𝔽(t.numberValue() + LocalTZA(t, true));
}

// 20.3.1.9 #sec-utc-t
export function UTC(t) {
  return 𝔽(t.numberValue() - LocalTZA(t, false));
}

// 20.3.1.10 #sec-hours-minutes-second-and-milliseconds
export function HourFromTime(t) {
  return 𝔽(mod(Math.floor(t.numberValue() / msPerHour), HoursPerDay));
}

export function MinFromTime(t) {
  return 𝔽(mod(Math.floor(t.numberValue() / msPerMinute), MinutesPerHour));
}

export function SecFromTime(t) {
  return 𝔽(mod(Math.floor(t.numberValue() / msPerSecond), SecondsPerMinute));
}

export function msFromTime(t) {
  return 𝔽(mod(t.numberValue(), msPerSecond));
}

// 20.3.1.11 #sec-maketime
export function MakeTime(hour, min, sec, ms) {
  if (!Number.isFinite(hour.numberValue()) || !Number.isFinite(min.numberValue()) || !Number.isFinite(sec.numberValue()) || !Number.isFinite(ms.numberValue())) {
    return 𝔽(NaN);
  }
  const h = X(ToIntegerOrInfinity(hour));
  const m = X(ToIntegerOrInfinity(min));
  const s = X(ToIntegerOrInfinity(sec));
  const milli = X(ToIntegerOrInfinity(ms));
  const t = h * msPerHour + m * msPerMinute + s * msPerSecond + milli;
  return 𝔽(t);
}

const daysWithinYearToEndOfMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

// 20.3.1.12 #sec-makeday
export function MakeDay(year, month, date) {
  if (!Number.isFinite(year.numberValue()) || !Number.isFinite(month.numberValue()) || !Number.isFinite(date.numberValue())) {
    return 𝔽(NaN);
  }
  const y = X(ToIntegerOrInfinity(year));
  const m = X(ToIntegerOrInfinity(month));
  const dt = X(ToIntegerOrInfinity(date));
  const ym = y + Math.floor(m / 12);
  const mn = mod(m, 12);
  const ymday = DayFromYear(𝔽(ym + (mn > 1 ? 1 : 0))).numberValue() - 365 * (mn > 1 ? 1 : 0) + daysWithinYearToEndOfMonth[mn];
  const t = 𝔽(ymday * msPerDay);
  return 𝔽(Day(t).numberValue() + dt - 1);
}

// 20.3.1.13 #sec-makedate
export function MakeDate(day, time) {
  if (!Number.isFinite(day.numberValue()) || !Number.isFinite(time.numberValue())) {
    return 𝔽(NaN);
  }
  return 𝔽(day.numberValue() * msPerDay + time.numberValue());
}

// 20.3.1.14 #sec-timeclip
export function TimeClip(time) {
  // 1. If time is not finite, return NaN.
  if (!time.isFinite()) {
    return 𝔽(NaN);
  }
  // 2. If abs(ℝ(time)) > 8.64 × 1015, return NaN.
  if (Math.abs(time.numberValue()) > 8.64e15) {
    return 𝔽(NaN);
  }
  // 3. Return 𝔽(! ToIntegerOrInfinity(time)).
  return 𝔽(X(ToIntegerOrInfinity(time)));
}
