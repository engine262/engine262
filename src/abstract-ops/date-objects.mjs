// This file covers abstract operations defined in
// 20.3 #sec-date-objects

import {
  Value,
} from '../value.mjs';
import { X } from '../completion.mjs';
import {
  ToInteger,
} from './all.mjs';

const mod = (n, m) => {
  const r = n % m;
  return Math.floor(r >= 0 ? r : r + m);
};

// 20.3.1.2 #sec-day-number-and-time-within-day
export function Day(t) {
  return new Value(Math.floor(t.numberValue() / msPerDay));
}

export const msPerDay = 86400000;

export function TimeWithinDay(t) {
  return new Value(mod(t.numberValue(), msPerDay));
}

// 20.3.1.3 #sec-year-number
export function DaysInYear(y) {
  y = y.numberValue();
  if (mod(y, 4) !== 0) {
    return new Value(365);
  }
  if (mod(y, 4) === 0 && mod(y, 100) !== 0) {
    return new Value(366);
  }
  if (mod(y, 100) === 0 && mod(y, 400) !== 0) {
    return new Value(365);
  }
  if (mod(y, 400) === 0) {
    return new Value(366);
  }
}

export function DayFromYear(y) {
  y = y.numberValue();
  return new Value(365 * (y - 1970) + Math.floor((y - 1969) / 4) - Math.floor((y - 1901) / 100) + Math.floor((y - 1601) / 400));
}

export function TimeFromYear(y) {
  return new Value(msPerDay * DayFromYear(y).numberValue());
}

export const msPerAverageYear = 12 * 30.436875 * msPerDay;

export function YearFromTime(t) {
  t = t.numberValue();
  let year = Math.floor((t + msPerAverageYear / 2) / msPerAverageYear) + 1970;
  if (TimeFromYear(new Value(year)).numberValue() > t) {
    year -= 1;
  }
  return new Value(year);
}

export function InLeapYear(t) {
  if (DaysInYear(YearFromTime(t)).numberValue() === 365) {
    return new Value(0);
  }
  if (DaysInYear(YearFromTime(t)).numberValue() === 366) {
    return new Value(1);
  }
}

// 20.3.1.4 #sec-month-number
export function MonthFromTime(t) {
  const dayWithinYear = DayWithinYear(t).numberValue();
  const inLeapYear = InLeapYear(t).numberValue();
  if (dayWithinYear >= 0 && dayWithinYear < 31) {
    return new Value(0);
  }
  if (dayWithinYear >= 31 && dayWithinYear < 59 + inLeapYear) {
    return new Value(1);
  }
  if (dayWithinYear >= 59 + inLeapYear && dayWithinYear < 90 + inLeapYear) {
    return new Value(2);
  }
  if (dayWithinYear >= 90 + inLeapYear && dayWithinYear < 120 + inLeapYear) {
    return new Value(3);
  }
  if (dayWithinYear >= 120 + inLeapYear && dayWithinYear < 151 + inLeapYear) {
    return new Value(4);
  }
  if (dayWithinYear >= 151 + inLeapYear && dayWithinYear < 181 + inLeapYear) {
    return new Value(5);
  }
  if (dayWithinYear >= 181 + inLeapYear && dayWithinYear < 212 + inLeapYear) {
    return new Value(6);
  }
  if (dayWithinYear >= 212 + inLeapYear && dayWithinYear < 243 + inLeapYear) {
    return new Value(7);
  }
  if (dayWithinYear >= 243 + inLeapYear && dayWithinYear < 273 + inLeapYear) {
    return new Value(8);
  }
  if (dayWithinYear >= 273 + inLeapYear && dayWithinYear < 304 + inLeapYear) {
    return new Value(9);
  }
  if (dayWithinYear >= 304 + inLeapYear && dayWithinYear < 334 + inLeapYear) {
    return new Value(10);
  }
  if (dayWithinYear >= 334 + inLeapYear && dayWithinYear < 365 + inLeapYear) {
    return new Value(11);
  }
}

export function DayWithinYear(t) {
  return new Value(Day(t).numberValue() - DayFromYear(YearFromTime(t)).numberValue());
}

// 20.3.1.5 #sec-date-number
export function DateFromTime(t) {
  const dayWithinYear = DayWithinYear(t).numberValue();
  const monthFromTime = MonthFromTime(t).numberValue();
  const inLeapYear = InLeapYear(t).numberValue();
  switch (monthFromTime) {
    case 0: return new Value(dayWithinYear + 1);
    case 1: return new Value(dayWithinYear - 30);
    case 2: return new Value(dayWithinYear - 58 - inLeapYear);
    case 3: return new Value(dayWithinYear - 89 - inLeapYear);
    case 4: return new Value(dayWithinYear - 119 - inLeapYear);
    case 5: return new Value(dayWithinYear - 150 - inLeapYear);
    case 6: return new Value(dayWithinYear - 180 - inLeapYear);
    case 7: return new Value(dayWithinYear - 211 - inLeapYear);
    case 8: return new Value(dayWithinYear - 242 - inLeapYear);
    case 9: return new Value(dayWithinYear - 272 - inLeapYear);
    case 10: return new Value(dayWithinYear - 303 - inLeapYear);
    case 11: return new Value(dayWithinYear - 333 - inLeapYear);
    default: // Unreachable
  }
}

// 20.3.1.6 #sec-week-day
export function WeekDay(t) {
  return new Value(mod(Day(t).numberValue() + 4, 7));
}

// 20.3.1.7 #sec-local-time-zone-adjustment
export function LocalTZA(/* t, isUTC */) {
  // TODO: implement this function properly.
  return 0;
}

// 20.3.1.8 #sec-localtime
export function LocalTime(t) {
  return new Value(t.numberValue() + LocalTZA(t, true));
}

// 20.3.1.9 #sec-utc-t
export function UTC(t) {
  return new Value(t.numberValue() - LocalTZA(t, false));
}

// 20.3.1.10 #sec-hours-minutes-second-and-milliseconds
export function HourFromTime(t) {
  return new Value(mod(Math.floor(t.numberValue() / msPerHour), HoursPerDay));
}

export function MinFromTime(t) {
  return new Value(mod(Math.floor(t.numberValue() / msPerMinute), MinutesPerHour));
}

export function SecFromTime(t) {
  return new Value(mod(Math.floor(t.numberValue() / msPerSecond), SecondsPerMinute));
}

export function msFromTime(t) {
  return new Value(mod(t.numberValue(), msPerSecond));
}

export const HoursPerDay = 24;
export const MinutesPerHour = 60;
export const SecondsPerMinute = 60;
export const msPerSecond = 1000;
export const msPerMinute = msPerSecond * SecondsPerMinute;
export const msPerHour = msPerMinute * MinutesPerHour;

// 20.3.1.11 #sec-maketime
export function MakeTime(hour, min, sec, ms) {
  if (!Number.isFinite(hour.numberValue()) || !Number.isFinite(min.numberValue()) || !Number.isFinite(sec.numberValue()) || !Number.isFinite(ms.numberValue())) {
    return new Value(NaN);
  }
  const h = X(ToInteger(hour)).numberValue();
  const m = X(ToInteger(min)).numberValue();
  const s = X(ToInteger(sec)).numberValue();
  const milli = X(ToInteger(ms)).numberValue();
  const t = h * msPerHour + m * msPerMinute + s * msPerSecond + milli;
  return new Value(t);
}

const daysWithinYearToEndOfMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

// 20.3.1.12 #sec-makeday
export function MakeDay(year, month, date) {
  if (!Number.isFinite(year.numberValue()) || !Number.isFinite(month.numberValue()) || !Number.isFinite(date.numberValue())) {
    return new Value(NaN);
  }
  const y = X(ToInteger(year)).numberValue();
  const m = X(ToInteger(month)).numberValue();
  const dt = X(ToInteger(date)).numberValue();
  const ym = y + Math.floor(m / 12);
  const mn = mod(m, 12);
  const ymday = DayFromYear(new Value(ym + (mn > 1 ? 1 : 0))).numberValue() - 365 * (mn > 1 ? 1 : 0) + daysWithinYearToEndOfMonth[mn];
  const t = new Value(ymday * msPerDay);
  return new Value(Day(t).numberValue() + dt - 1);
}

// 20.3.1.13 #sec-makedate
export function MakeDate(day, time) {
  if (!Number.isFinite(day.numberValue()) || !Number.isFinite(time.numberValue())) {
    return new Value(NaN);
  }
  return new Value(day.numberValue() * msPerDay + time.numberValue());
}

// 20.3.1.14 #sec-timeclip
export function TimeClip(time) {
  if (!Number.isFinite(time.numberValue())) {
    return new Value(NaN);
  }
  if (Math.abs(time.numberValue()) > 8.64e15) {
    return new Value(NaN);
  }
  let clippedTime = X(ToInteger(time)).numberValue();
  if (Object.is(clippedTime, -0)) {
    clippedTime = 0;
  }
  return new Value(clippedTime);
}
