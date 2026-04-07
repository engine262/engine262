import { DateParser, ParseDateTimeUTCOffset, ParseISODateTime } from '../../parser/TemporalParser.mts';
import {
  R, type Integer, type IntegralNumber, type MathematicalValue,
} from '../spec-types.mjs';
import { type ISODateRecord, type TemporalPlainDateObject, isTemporalPlainDateObject } from '../../intrinsics/Temporal/PlainDate.mts';
import { isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { type TemporalZonedDateTimeObject, isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import {
  abs, floorDiv, modulo,
} from '../math.mts';
import {
  GetRoundingIncrementOption, GetRoundingModeOption, GetUTCEpochNanoseconds, ToZeroPaddedDecimalString, UnsignedRoundingMode, type TimeZoneIdentifier,
} from './addition.mts';
import { RoundingMode } from './addition.mts';
import {
  CalendarISOToDate, CanonicalizeCalendar, GetTemporalCalendarIdentifierWithISODefault, PrepareCalendarFields, type CalendarFieldsRecord, type CalendarType,
} from './calendar.mts';
import { ToTemporalTimeZoneIdentifier } from './time-zone.mts';
import {
  ToPrimitive, Throw, CreateISODateRecord, CreateTemporalDate, CreateTemporalZonedDateTime, InterpretISODateTimeOffset, InterpretTemporalDateTimeFields, nsPerDay, type ISODateTimeMatchBehaviour, type ISODateTimeOffsetBehaviour,
  Value, ObjectValue, JSStringValue, NumberValue, UndefinedValue, Q, Get, ToString, type PlainCompletion, type PlainEvaluator, Assert, type PropertyKeyValue, X,
  msPerDay,
} from '#self';

export type EpochNanoseconds = Integer & { /** @internal */ specName?: 'EpochNanoseconds' };
export type Float64RepresentableInteger = IntegralNumber;

/** https://tc39.es/proposal-temporal/#sec-isodatetoepochdays */
export function ISODateToEpochDays(year: Integer, month: Integer, date: Integer): Integer {
  const resolvedYear = year + floorDiv(month, 12n);
  const resolvedMonth = modulo(month, 12n);
  // Find a time t such that EpochTimeToEpochYear(t) = resolvedYear, EpochTimeToMonthInYear(t) = resolvedMonth, and EpochTimeToDate(t) = 1.

  // t = GetUTCEpochNanoseconds(resolvedYear, resolvedMonth + 1, date) / 1e6 - (date - 1) * msPerDay
  const t = (
    GetUTCEpochNanoseconds({
      ISODate: { Year: resolvedYear, Month: resolvedMonth + 1n, Day: date },
      Time: {
        Days: 0n, Hour: 0n, Microsecond: 0n, Millisecond: 0n, Minute: 0n, Nanosecond: 0n, Second: 0n,
      },
    }) / BigInt(1e6)
    - (date - 1n) * BigInt(msPerDay)
  );

  Assert(EpochTimeToEpochYear(t) === resolvedYear && EpochTimeToMonthInYear(t) === resolvedMonth && EpochTimeToDate(t) === 1n);
  return EpochTimeToDayNumber(t) + date - 1n;
}

/** https://tc39.es/proposal-temporal/#sec-epochdaystoepochms */
export function EpochDaysToEpochMs(day: Integer, time: Integer): Integer {
  return day * BigInt(msPerDay) + time;
}

/** https://tc39.es/proposal-temporal/#eqn-EpochTimeToDayNumber */
export function EpochTimeToDayNumber(t: Integer): Integer {
  return floorDiv(t, BigInt(msPerDay));
}

/** https://tc39.es/proposal-temporal/#sec-mathematicaldaysinyear */
export function MathematicalDaysInYear(y: Integer): Integer {
  if (modulo(y, 4n) !== 0n) return 365n;
  if (modulo(y, 100n) !== 0n) return 366n;
  if (modulo(y, 400n) !== 0n) return 365n;
  return 366n;
}

/** https://tc39.es/proposal-temporal/#sec-epochdaynumberforyear */
export function EpochDayNumberForYear(y: Integer): Integer {
  return 365n * (y - 1970n)
    + floorDiv((y - 1969n), 4n)
    - floorDiv((y - 1901n), 100n)
    + floorDiv((y - 1601n), 400n);
}

/** https://tc39.es/proposal-temporal/#sec-epochtimeforyear */
export function EpochTimeForYear(y: Integer): Integer {
  return BigInt(msPerDay) * EpochDayNumberForYear(y);
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetoepochyear */
export function EpochTimeToEpochYear(t: Integer): Integer {
  // EpochTimeToEpochYear(t) = the largest integral Number y (closest to +∞) such that EpochTimeForYear(y) ≤ t
  const day = EpochTimeToDayNumber(t);
  const daysPer400Years = 146097n;
  const cycle = floorDiv(day, daysPer400Years);
  let year = 1970n + cycle * 400n;

  while (day >= EpochDayNumberForYear(year + 1n)) {
    year += 1n;
  }
  while (day < EpochDayNumberForYear(year)) {
    year -= 1n;
  }

  return year;
}

/** https://tc39.es/proposal-temporal/#sec-mathematicalinleapyear */
export function MathematicalInLeapYear(t: Integer): Integer {
  return MathematicalDaysInYear(EpochTimeToEpochYear(t)) === 366n ? 1n : 0n;
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetomonthinyear */
export function EpochTimeToMonthInYear(t: Integer): Integer {
  const dayInYear = EpochTimeToDayInYear(t);
  const leap = MathematicalInLeapYear(t);
  if (dayInYear >= 0n && dayInYear < 31n) return 0n;
  if (dayInYear >= 31n && dayInYear < 59n + leap) return 1n;
  if (59n + leap <= dayInYear && dayInYear < 90n + leap) return 2n;
  if (90n + leap <= dayInYear && dayInYear < 120n + leap) return 3n;
  if (120n + leap <= dayInYear && dayInYear < 151n + leap) return 4n;
  if (151n + leap <= dayInYear && dayInYear < 181n + leap) return 5n;
  if (181n + leap <= dayInYear && dayInYear < 212n + leap) return 6n;
  if (212n + leap <= dayInYear && dayInYear < 243n + leap) return 7n;
  if (243n + leap <= dayInYear && dayInYear < 273n + leap) return 8n;
  if (273n + leap <= dayInYear && dayInYear < 304n + leap) return 9n;
  if (304n + leap <= dayInYear && dayInYear < 334n + leap) return 10n;
  return 11n;
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetodayinyear */
export function EpochTimeToDayInYear(t: Integer): Integer {
  return EpochTimeToDayNumber(t) - EpochDayNumberForYear(EpochTimeToEpochYear(t));
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetodate */
export function EpochTimeToDate(t: Integer): Integer {
  const m = EpochTimeToMonthInYear(t);
  const dayInYear = EpochTimeToDayInYear(t);
  const leap = MathematicalInLeapYear(t) ? 1n : 0n;
  if (m === 0n) return dayInYear + 1n;
  if (m === 1n) return dayInYear - 30n;
  if (m === 2n) return dayInYear - 58n - leap;
  if (m === 3n) return dayInYear - 89n - leap;
  if (m === 4n) return dayInYear - 119n - leap;
  if (m === 5n) return dayInYear - 150n - leap;
  if (m === 6n) return dayInYear - 180n - leap;
  if (m === 7n) return dayInYear - 211n - leap;
  if (m === 8n) return dayInYear - 242n - leap;
  if (m === 9n) return dayInYear - 272n - leap;
  if (m === 10n) return dayInYear - 303n - leap;
  return dayInYear - 333n - leap;
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetoweekday */
export function EpochTimeToWeekDay(t: Integer): Integer {
  return modulo(EpochTimeToDayNumber(t) + 4n, 7n);
}

/** https://tc39.es/proposal-temporal/#sec-checkisodaysrange */
export function CheckISODaysRange(isoDate: ISODateRecord): PlainCompletion<void> {
  const days = abs(ISODateToEpochDays(isoDate.Year, isoDate.Month - 1n, isoDate.Day));
  if (days > 1e8) {
    return Throw.RangeError('ISODate is out of range');
  }
  return undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-units */
export enum TemporalUnit {
  Year = 'Year', Month = 'Month', Week = 'Week', Day = 'Day',
  Hour = 'Hour', Minute = 'Minute', Second = 'Second', Millisecond = 'Millisecond', Microsecond = 'Microsecond', Nanosecond = 'Nanosecond'
}

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export type TimeUnit = TemporalUnit.Hour | TemporalUnit.Minute | TemporalUnit.Second | TemporalUnit.Millisecond | TemporalUnit.Microsecond | TemporalUnit.Nanosecond;

export function __IsTimeUnit(unit: TemporalUnit): unit is TimeUnit {
  return (unit === TemporalUnit.Hour
    || unit === TemporalUnit.Minute
    || unit === TemporalUnit.Second
    || unit === TemporalUnit.Millisecond
    || unit === TemporalUnit.Microsecond
    || unit === TemporalUnit.Nanosecond
  );
}

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export type DateUnit = TemporalUnit.Year | TemporalUnit.Month | TemporalUnit.Week | TemporalUnit.Day;

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export const Table21_LengthInNanoSeconds = {
  [TemporalUnit.Day]: BigInt(8.64e13) satisfies typeof nsPerDay,
  [TemporalUnit.Hour]: BigInt(3.6e12),
  [TemporalUnit.Minute]: BigInt(6e10),
  [TemporalUnit.Second]: BigInt(1e9),
  [TemporalUnit.Millisecond]: BigInt(1e6),
  [TemporalUnit.Microsecond]: BigInt(1e3),
  [TemporalUnit.Nanosecond]: 1n,
} as const;

export const Table21_CategoryByValue = {
  [TemporalUnit.Year]: 'date',
  [TemporalUnit.Month]: 'date',
  [TemporalUnit.Week]: 'date',
  [TemporalUnit.Day]: 'date',
  [TemporalUnit.Hour]: 'time',
  [TemporalUnit.Minute]: 'time',
  [TemporalUnit.Second]: 'time',
  [TemporalUnit.Millisecond]: 'time',
  [TemporalUnit.Microsecond]: 'time',
  [TemporalUnit.Nanosecond]: 'time',
} as const;

export function __IsDateUnit(unit: TemporalUnit): unit is DateUnit {
  return (unit === TemporalUnit.Year
    || unit === TemporalUnit.Month
    || unit === TemporalUnit.Week
    || unit === TemporalUnit.Day
  );
}

/** https://tc39.es/proposal-temporal/#sec-gettemporaloverflowoption */
export function* GetTemporalOverflowOption(options: ObjectValue): PlainEvaluator<'constrain' | 'reject'> {
  const value = Q(yield* Get(options, Value('overflow')));
  if (value instanceof UndefinedValue) return 'constrain';
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'constrain') return 'constrain';
  if (stringValue === 'reject') return 'reject';
  return Throw.RangeError('overflow option is invalid ($1), only "constrain" and "reject" are accepted', stringValue);
}

/** https://tc39.es/proposal-temporal/#sec-gettemporaldisambiguationoption */
export function* GetTemporalDisambiguationOption(options: ObjectValue): PlainEvaluator<'compatible' | 'earlier' | 'later' | 'reject'> {
  const value = Q(yield* Get(options, Value('disambiguation')));
  if (value instanceof UndefinedValue) return 'compatible';
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'compatible') return 'compatible';
  if (stringValue === 'earlier') return 'earlier';
  if (stringValue === 'later') return 'later';
  if (stringValue === 'reject') return 'reject';
  return Throw.RangeError('disambiguation option is invalid ($1), only "compatible", "earlier", "later" and "reject" are accepted', stringValue);
}

/** https://tc39.es/proposal-temporal/#sec-negateroundingmode */
export function NegateRoundingMode(roundingMode: RoundingMode): RoundingMode {
  switch (roundingMode) {
    case RoundingMode.Ceil: return RoundingMode.Floor;
    case RoundingMode.Floor: return RoundingMode.Ceil;
    case RoundingMode.HalfCeil: return RoundingMode.HalfFloor;
    case RoundingMode.HalfFloor: return RoundingMode.HalfCeil;
    default: return roundingMode;
  }
}

export type TemporalOffsetOption = 'prefer' | 'use' | 'ignore' | 'reject';
/** https://tc39.es/proposal-temporal/#sec-gettemporaloffsetoption */
export function* GetTemporalOffsetOption(options: ObjectValue, fallback: TemporalOffsetOption): PlainEvaluator<TemporalOffsetOption> {
  const value = Q(yield* Get(options, Value('offset')));
  if (value instanceof UndefinedValue) return fallback;
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'prefer') return 'prefer';
  if (stringValue === 'use') return 'use';
  if (stringValue === 'ignore') return 'ignore';
  if (stringValue === 'reject') return 'reject';
  return Throw.RangeError('offset option is invalid ($1), only "prefer", "use", "ignore" and "reject" are accepted', stringValue);
}

export type ShowCalendarNameOption = 'auto' | 'always' | 'never' | 'critical';
/** https://tc39.es/proposal-temporal/#sec-gettemporalshowcalendarnameoption */
export function* GetTemporalShowCalendarNameOption(options: ObjectValue): PlainEvaluator<ShowCalendarNameOption> {
  const value = Q(yield* Get(options, Value('calendarName')));
  if (value instanceof UndefinedValue) return 'auto';
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'always') return 'always';
  if (stringValue === 'never') return 'never';
  if (stringValue === 'critical') return 'critical';
  if (stringValue === 'auto') return 'auto';
  return Throw.RangeError('calendarName option is invalid ($1), only "auto", "always", "never" and "critical" are accepted', stringValue);
}

export type ShowTimeZoneNameOption = 'auto' | 'never' | 'critical';
/** https://tc39.es/proposal-temporal/#sec-gettemporalshowtimezonenameoption */
export function* GetTemporalShowTimeZoneNameOption(options: ObjectValue): PlainEvaluator<ShowTimeZoneNameOption> {
  const value = Q(yield* Get(options, Value('timeZoneName')));
  if (value instanceof UndefinedValue) return 'auto';
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'never') return 'never';
  if (stringValue === 'critical') return 'critical';
  if (stringValue === 'auto') return 'auto';
  return Throw.RangeError('timeZoneName option is invalid ($1), only "auto", "never" and "critical" are accepted', stringValue);
}

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowoffsetoption */
export function* GetTemporalShowOffsetOption(options: ObjectValue): PlainEvaluator<'auto' | 'never'> {
  const value = Q(yield* Get(options, Value('offset')));
  if (value instanceof UndefinedValue) return 'auto';
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'never') return 'never';
  if (stringValue === 'auto') return 'auto';
  return Throw.RangeError('offset option is invalid ($1), only "auto" and "never" are accepted', stringValue);
}

export type DirectionOption = 'next' | 'previous';
/** https://tc39.es/proposal-temporal/#sec-getdirectionoption */
export function* GetDirectionOption(options: ObjectValue): PlainEvaluator<DirectionOption> {
  const value = Q(yield* Get(options, Value('direction')));
  if (value instanceof UndefinedValue) return Throw.RangeError('direction option is required');
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'next') return 'next';
  if (stringValue === 'previous') return 'previous';
  return Throw.RangeError('direction option is not valid ($1), only "next" and "previous" are accepted', stringValue);
}

/** https://tc39.es/proposal-temporal/#sec-validatetemporalroundingincrement */
export function ValidateTemporalRoundingIncrement(increment: Integer, dividend: Integer, inclusive: boolean): PlainCompletion<void> {
  let maximum;
  if (inclusive) {
    maximum = dividend;
  } else {
    Assert(dividend > 1n);
    maximum = dividend - 1n;
  }
  if (increment > maximum) {
    return Throw.RangeError('$1 is out of range', increment);
  }
  if (modulo(dividend, increment) !== 0n) {
    return Throw.RangeError('$1 is out of range', increment);
  }
  return undefined;
}

/** https://tc39.es/proposal-temporal/#sec-gettemporalfractionalseconddigitsoption */
export function* GetTemporalFractionalSecondDigitsOption(options: ObjectValue): PlainEvaluator<'auto' | Integer> {
  const digitsValue = Q(yield* Get(options, Value('fractionalSecondDigits')));
  if (digitsValue instanceof UndefinedValue) {
    return 'auto';
  }
  if (!(digitsValue instanceof NumberValue)) {
    if (Q(yield* ToString(digitsValue)).stringValue() !== 'auto') {
      return Throw.RangeError('$1 is out of range', digitsValue);
    }
    return 'auto';
  }
  if (digitsValue.isNaN() || digitsValue.isInfinity()) {
    return Throw.RangeError('$1 is out of range', digitsValue);
  }
  const digitCount = BigInt(Math.floor(R(digitsValue)));
  if (digitCount < 0n || digitCount > 9n) {
    return Throw.RangeError('$1 is out of range', digitsValue);
  }
  return digitCount;
}

/** https://tc39.es/proposal-temporal/#sec-tosecondsstringprecisionrecord */
export function ToSecondsStringPrecisionRecord(smallestUnit: Exclude<TimeUnit, TemporalUnit.Hour> | 'unset', fractionalDigitCount: 'auto' | Integer):
  | { Precision: TemporalUnit.Minute, Unit: TemporalUnit.Minute, Increment: 1n }
  | { Precision: Integer, Unit: TemporalUnit.Minute | TemporalUnit.Second | TemporalUnit.Millisecond | TemporalUnit.Microsecond | TemporalUnit.Nanosecond, Increment: bigint }
  | { Precision: 'auto' | Integer, Unit: TemporalUnit.Nanosecond, Increment: 1n | 10n | 100n } {
  if (smallestUnit === TemporalUnit.Minute) {
    return { Precision: TemporalUnit.Minute, Unit: TemporalUnit.Minute, Increment: 1n };
  }
  if (smallestUnit === TemporalUnit.Second) {
    return { Precision: 0n, Unit: TemporalUnit.Second, Increment: 1n };
  }
  if (smallestUnit === TemporalUnit.Millisecond) {
    return { Precision: 3n, Unit: TemporalUnit.Millisecond, Increment: 1n };
  }
  if (smallestUnit === TemporalUnit.Microsecond) {
    return { Precision: 6n, Unit: TemporalUnit.Microsecond, Increment: 1n };
  }
  if (smallestUnit === TemporalUnit.Nanosecond) {
    return { Precision: 9n, Unit: TemporalUnit.Nanosecond, Increment: 1n };
  }
  Assert(smallestUnit === 'unset');
  if (fractionalDigitCount === 'auto') {
    return { Precision: 'auto', Unit: TemporalUnit.Nanosecond, Increment: 1n };
  }
  if (fractionalDigitCount === 0n) {
    return { Precision: 0n, Unit: TemporalUnit.Second, Increment: 1n };
  }
  if (fractionalDigitCount >= 1n && fractionalDigitCount <= 3n) {
    return { Precision: fractionalDigitCount, Unit: TemporalUnit.Millisecond, Increment: 10n ** (3n - fractionalDigitCount) as 1n | 10n | 100n };
  }
  if (fractionalDigitCount >= 4n && fractionalDigitCount <= 6n) {
    return { Precision: fractionalDigitCount, Unit: TemporalUnit.Microsecond, Increment: 10n ** (6n - fractionalDigitCount) as 1n | 10n | 100n };
  }
  Assert(fractionalDigitCount >= 7n && fractionalDigitCount <= 9n);
  return { Precision: fractionalDigitCount, Unit: TemporalUnit.Nanosecond, Increment: 10n ** (9n - fractionalDigitCount) as 1n | 10n | 100n };
}

/** https://tc39.es/ecma262/pr/3759/#table-temporal-units */
const table74 = [
  {
    Value: TemporalUnit.Year, Singular: 'year', Plural: 'years',
  },
  {
    Value: TemporalUnit.Month, Singular: 'month', Plural: 'months',
  },
  {
    Value: TemporalUnit.Week, Singular: 'week', Plural: 'weeks',
  },
  {
    Value: TemporalUnit.Day, Singular: 'day', Plural: 'days',
  },
  {
    Value: TemporalUnit.Hour, Singular: 'hour', Plural: 'hours',
  },
  {
    Value: TemporalUnit.Minute, Singular: 'minute', Plural: 'minutes',
  },
  {
    Value: TemporalUnit.Second, Singular: 'second', Plural: 'seconds',
  },
  {
    Value: TemporalUnit.Millisecond, Singular: 'millisecond', Plural: 'milliseconds',
  },
  {
    Value: TemporalUnit.Microsecond, Singular: 'microsecond', Plural: 'microseconds',
  },
  {
    Value: TemporalUnit.Nanosecond, Singular: 'nanosecond', Plural: 'nanoseconds',
  },
] as const;
/** https://tc39.es/proposal-temporal/#sec-gettemporalunitvaluedoption */
export function* GetTemporalUnitValuedOption(
  options: ObjectValue,
  key: PropertyKeyValue | string,
  defaultV: 'required' | 'unset',
): PlainEvaluator<TemporalUnit | 'unset' | 'auto'> {
  const value = Q(yield* Get(options, typeof key === 'string' ? Value(key) : key));
  if (value instanceof UndefinedValue) {
    if (defaultV === 'required') return Throw.RangeError('option $1 is required', key);
    return 'unset';
  }
  const stringValue = Q(yield* ToString(value)).stringValue();
  if (stringValue === 'auto') return 'auto';
  const result = table74.find((value) => stringValue === value.Plural || stringValue === value.Singular);
  // If stringValue is not listed in the "Singular property name" or "Plural property name" columns of Table 74, throw a RangeError exception.
  if (!result) {
    return Throw.RangeError('option $1 does not accept value $2 (only $3 accepted)', key, stringValue, table74.map((x) => x.Singular).join(', '));
  }
  return result.Value;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-validatetemporalunitvaluedoption */
export function ValidateTemporalUnitValue(value: TemporalUnit | 'unset' | 'auto', unitGroup: 'date' | 'time' | 'datetime', extraValues?: Array<TemporalUnit | 'auto'>): PlainCompletion<void> {
  if (value === 'unset') return undefined;
  if (extraValues?.includes(value)) return undefined;
  const category = Table21_CategoryByValue[value as TemporalUnit];
  if (!category) {
    return Throw.RangeError('Invalid TemporalUnit value $1', value);
  }
  if (category === 'date' && (unitGroup === 'datetime' || unitGroup === 'date')) return undefined;
  if (category === 'time' && (unitGroup === 'datetime' || unitGroup === 'time')) return undefined;
  return Throw.RangeError('Invalid TemporalUnit value $1', value);
}

/** https://tc39.es/proposal-temporal/#sec-gettemporalrelativetooption */
export function* GetTemporalRelativeToOption(options: ObjectValue): PlainEvaluator<{
  PlainRelativeTo?: TemporalPlainDateObject,
  ZonedRelativeTo?: TemporalZonedDateTimeObject,
}> {
  const value = Q(yield* Get(options, Value('relativeTo')));
  if (value instanceof UndefinedValue) {
    return { PlainRelativeTo: undefined, ZonedRelativeTo: undefined };
  }
  let offsetBehaviour: ISODateTimeOffsetBehaviour = 'option';
  let matchBehaviour: ISODateTimeMatchBehaviour = 'match-exactly';
  let timeZone: TimeZoneIdentifier | undefined;
  let isoDate;
  let time;
  let calendar: CalendarType | undefined;
  let offsetString;
  if (value instanceof ObjectValue) {
    if (isTemporalZonedDateTimeObject(value)) {
      return { PlainRelativeTo: undefined, ZonedRelativeTo: value };
    }
    if (isTemporalPlainDateObject(value)) {
      return { PlainRelativeTo: value, ZonedRelativeTo: undefined };
    }
    if (isTemporalPlainDateTimeObject(value)) {
      const plainDate = X(CreateTemporalDate(value.ISODateTime.ISODate, value.Calendar));
      return { PlainRelativeTo: plainDate, ZonedRelativeTo: undefined };
    }
    calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(value));
    const fields = Q(yield* PrepareCalendarFields(calendar, value, ['year', 'month', 'month-code', 'day'], ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'time-zone'], []));
    const result = Q(yield* InterpretTemporalDateTimeFields(calendar, fields, 'constrain'));
    timeZone = fields.TimeZone as TimeZoneIdentifier;
    offsetString = fields.OffsetString;
    if (offsetString === undefined) {
      offsetBehaviour = 'wall';
    }
    isoDate = result.ISODate;
    time = result.Time;
  } else {
    if (!(value instanceof JSStringValue)) {
      return Throw.TypeError('$1 is not a string', value);
    }
    const result = Q(ParseISODateTime(value.stringValue(), ['TemporalDateTimeString[+Zoned]', 'TemporalDateTimeString[~Zoned]']));
    offsetString = result.TimeZone.OffsetString;
    const annotation = result.TimeZone.TimeZoneAnnotation;
    if (!annotation) {
      timeZone = undefined;
    } else {
      timeZone = Q(ToTemporalTimeZoneIdentifier(annotation));
      if (result.TimeZone.Z === true) {
        offsetBehaviour = 'exact';
      } else if (!offsetString) {
        offsetBehaviour = 'wall';
      }
      matchBehaviour = 'match-minutes';
      if (offsetString) {
        const offsetParseResult = DateParser.parse(offsetString, (parser) => parser.with({ SubMinutePrecision: true }, () => parser.parseUTCOffset()));
        if (Array.isArray(offsetParseResult)) {
          Assert(false, 'offsetParseResult is a Parse Node');
        }
        if (offsetParseResult.Minute || offsetParseResult.Second) {
          matchBehaviour = 'match-exactly';
        }
      }
    }
    let _calendar = result.Calendar;
    if (!_calendar) {
      _calendar = 'iso8601';
    }
    calendar = Q(CanonicalizeCalendar(_calendar));
    isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
    time = result.Time;
  }
  if (timeZone === undefined) {
    const plainDate = Q(yield* CreateTemporalDate(isoDate, calendar));
    return { PlainRelativeTo: plainDate, ZonedRelativeTo: undefined };
  }
  let offsetNs;
  if (offsetBehaviour === 'option') {
    offsetNs = X(ParseDateTimeUTCOffset(offsetString!));
  } else {
    offsetNs = 0n;
  }
  const epochNanoseconds = Q(InterpretISODateTimeOffset(isoDate, time, offsetBehaviour, offsetNs, timeZone, 'compatible', 'reject', matchBehaviour));
  const zonedRelativeTo = X(CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar));
  return { PlainRelativeTo: undefined, ZonedRelativeTo: zonedRelativeTo };
}

/** https://tc39.es/proposal-temporal/#sec-largeroftwotemporalunits */
export function LargerOfTwoTemporalUnits(u1: TemporalUnit, u2: TemporalUnit): TemporalUnit {
  const order = [
    TemporalUnit.Year,
    TemporalUnit.Month,
    TemporalUnit.Week,
    TemporalUnit.Day,
    TemporalUnit.Hour,
    TemporalUnit.Minute,
    TemporalUnit.Second,
    TemporalUnit.Millisecond,
    TemporalUnit.Microsecond,
    TemporalUnit.Nanosecond,
  ];
  for (const unit of order) {
    if (u1 === unit) {
      return unit;
    }
    if (u2 === unit) {
      return unit;
    }
  }
  Assert(false, 'unreachable');
}

/** https://tc39.es/proposal-temporal/#sec-iscalendarunit */
export function IsCalendarUnit(unit: TemporalUnit): unit is TemporalUnit.Year | TemporalUnit.Month | TemporalUnit.Week {
  return unit === TemporalUnit.Year || unit === TemporalUnit.Month || unit === TemporalUnit.Week;
}

/** https://tc39.es/proposal-temporal/#sec-temporalunitcategory */
export function TemporalUnitCategory(unit: TemporalUnit): 'date' | 'time' {
  if (unit === TemporalUnit.Year || unit === TemporalUnit.Month || unit === TemporalUnit.Week || unit === TemporalUnit.Day) {
    return 'date';
  }
  return 'time';
}

/** https://tc39.es/proposal-temporal/#sec-maximumtemporaldurationroundingincrement */
export function MaximumTemporalDurationRoundingIncrement(unit: TemporalUnit): 24n | 60n | 1000n | 'unset' {
  switch (unit) {
    case TemporalUnit.Hour: return 24n;
    case TemporalUnit.Minute: return 60n;
    case TemporalUnit.Second: return 60n;
    case TemporalUnit.Millisecond: return 1000n;
    case TemporalUnit.Microsecond: return 1000n;
    case TemporalUnit.Nanosecond: return 1000n;
    default: return 'unset';
  }
}

/** https://tc39.es/proposal-temporal/#sec-ispartialtemporalobject */
export function* IsPartialTemporalObject(value: Value): PlainEvaluator<boolean> {
  if (!(value instanceof ObjectValue)) {
    return false;
  }
  if (
    'InitializedTemporalDate' in value
    || 'InitializedTemporalDateTime' in value
    || 'InitializedTemporalMonthDay' in value
    || 'InitializedTemporalTime' in value
    || 'InitializedTemporalYearMonth' in value
    || 'InitializedTemporalZonedDateTime' in value
  ) {
    return false;
  }
  const calendarProperty = Q(yield* Get(value, Value('calendar')));
  if (!(calendarProperty instanceof UndefinedValue)) {
    return false;
  }
  const timeZoneProperty = Q(yield* Get(value, Value('timeZone')));
  if (!(timeZoneProperty instanceof UndefinedValue)) {
    return false;
  }
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-formatfractionalseconds */
export function FormatFractionalSeconds(subSecondNanoseconds: Integer, precision: Integer | 'auto'): string {
  if (precision === 'auto') {
    if (subSecondNanoseconds === 0n) {
      return '';
    }
    let fractionString = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
    // Set fractionString to the longest prefix of fractionString ending with a code unit other than 0x0030 (DIGIT ZERO).
    fractionString = fractionString.replace(/0+$/, '');
    return `.${fractionString}`;
  } else {
    if (precision === 0n) {
      return '';
    }
    let fractionString = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
    fractionString = fractionString.slice(0, Number(precision));
    return `.${fractionString}`;
  }
}

/** https://tc39.es/proposal-temporal/#sec-formattimestring */
export function FormatTimeString(
  hour: Integer,
  minute: Integer,
  second: Integer,
  subSecondNanoseconds: Integer,
  precision: Integer | TemporalUnit.Minute | 'auto',
  style?: 'separated' | 'unseparated',
): string {
  const separator = style === 'unseparated' ? '' : ':';
  const hh = ToZeroPaddedDecimalString(hour, 2);
  const mm = ToZeroPaddedDecimalString(minute, 2);
  if (precision === TemporalUnit.Minute) {
    return hh + separator + mm;
  }
  const ss = ToZeroPaddedDecimalString(second, 2);
  const subSecondsPart = FormatFractionalSeconds(subSecondNanoseconds, precision);
  return hh + separator + mm + separator + ss + subSecondsPart;
}

/** https://tc39.es/proposal-temporal/#sec-getunsignedroundingmode */
export function GetUnsignedRoundingMode(
  roundingMode: RoundingMode,
  sign: 'negative' | 'positive',
): UnsignedRoundingMode {
  const table = {
    [RoundingMode.Ceil]: { positive: UnsignedRoundingMode.Infinity, negative: UnsignedRoundingMode.Zero },
    [RoundingMode.Floor]: { positive: UnsignedRoundingMode.Zero, negative: UnsignedRoundingMode.Infinity },
    [RoundingMode.Expand]: { positive: UnsignedRoundingMode.Infinity, negative: UnsignedRoundingMode.Infinity },
    [RoundingMode.Trunc]: { positive: UnsignedRoundingMode.Zero, negative: UnsignedRoundingMode.Zero },
    [RoundingMode.HalfCeil]: { positive: UnsignedRoundingMode.HalfInfinity, negative: UnsignedRoundingMode.HalfZero },
    [RoundingMode.HalfFloor]: { positive: UnsignedRoundingMode.HalfZero, negative: UnsignedRoundingMode.HalfInfinity },
    [RoundingMode.HalfExpand]: { positive: UnsignedRoundingMode.HalfInfinity, negative: UnsignedRoundingMode.HalfInfinity },
    [RoundingMode.HalfTrunc]: { positive: UnsignedRoundingMode.HalfZero, negative: UnsignedRoundingMode.HalfZero },
    [RoundingMode.HalfEven]: { positive: UnsignedRoundingMode.HalfEven, negative: UnsignedRoundingMode.HalfEven },
  } as const;
  return table[roundingMode][sign];
}

/** https://tc39.es/proposal-temporal/#sec-applyunsignedroundingmode */
export function ApplyUnsignedRoundingMode(
  x: MathematicalValue,
  r1: MathematicalValue,
  r2: MathematicalValue,
  unsignedRoundingMode?: UnsignedRoundingMode,
): MathematicalValue {
  if (x.equals(r1)) return r1;
  Assert(r1.lessThan(x) && x.lessThan(r2));
  Assert(unsignedRoundingMode !== undefined);
  if (unsignedRoundingMode === UnsignedRoundingMode.Zero) return r1;
  if (unsignedRoundingMode === UnsignedRoundingMode.Infinity) return r2;
  const d1 = x.subtract(r1);
  const d2 = r2.subtract(x);
  if (d1.lessThan(d2)) {
    return r1;
  }
  if (d2.lessThan(d1)) {
    return r2;
  }
  Assert(d1.equals(d2));
  if (unsignedRoundingMode === UnsignedRoundingMode.HalfZero) {
    return r1;
  }
  if (unsignedRoundingMode === UnsignedRoundingMode.HalfInfinity) {
    return r2;
  }
  Assert(unsignedRoundingMode === UnsignedRoundingMode.HalfEven);
  const cardinality = r1.divide(r2.subtract(r1)).modulo(2);
  if (cardinality.equals(0)) {
    return r1;
  }
  return r2;
}

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrement */
export function RoundNumberToIncrement(
  x: MathematicalValue,
  increment: Integer,
  roundingMode: RoundingMode,
): Integer {
  let quotient = x.divide(increment);
  let isNegative: 'negative' | 'positive';
  if (quotient.lessThan(0)) {
    isNegative = 'negative';
    quotient = quotient.negate();
  } else {
    isNegative = 'positive';
  }
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, isNegative);
  // Let r1 be the largest integer such that r1 ≤ quotient.
  const r1 = quotient.truncate(); // quotient is always positive
  // Let r2 be the smallest integer such that r2 > quotient.
  const r2 = r1.add(1);
  let rounded = ApplyUnsignedRoundingMode(quotient, r1, r2, unsignedRoundingMode);
  if (isNegative === 'negative') {
    rounded = rounded.negate();
  }
  return rounded.multiply(increment).toBigInt();
}

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrementasifpositive */
export function RoundNumberToIncrementAsIfPositive(
  x: MathematicalValue,
  increment: Integer,
  roundingMode: RoundingMode,
): Integer {
  const quotient = x.divide(increment);
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, 'positive');
  // Let r1 be the largest integer such that r1 ≤ quotient.
  const r1 = quotient.floor();
  // Let r2 be the smallest integer such that r2 > quotient.
  const r2 = r1.add(1);
  const rounded = ApplyUnsignedRoundingMode(quotient, r1, r2, unsignedRoundingMode);
  return rounded.multiply(increment).toBigInt();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-tooffsetstring */
export function* ToOffsetString(argument: Value): PlainEvaluator<string> {
  const offset = Q(yield* ToPrimitive(argument, 'string'));
  if (!(offset instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', offset);
  }
  Q(ParseDateTimeUTCOffset(offset.stringValue()));
  return offset.stringValue();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetofields */
export function ISODateToFields(
  calendar: CalendarType,
  isoDate: ISODateRecord,
  type: 'date' | 'year-month' | 'month-day',
): CalendarFieldsRecord {
  const fields: CalendarFieldsRecord = {
    Day: undefined,
    Era: undefined,
    EraYear: undefined,
    Hour: undefined,
    Microsecond: undefined,
    Millisecond: undefined,
    Minute: undefined,
    Month: undefined,
    MonthCode: undefined,
    Nanosecond: undefined,
    OffsetString: undefined,
    Second: undefined,
    TimeZone: undefined,
    Year: undefined,
  };
  const calendarDate = CalendarISOToDate(calendar, isoDate);
  fields.MonthCode = calendarDate.MonthCode;
  if (type === 'month-day' || type === 'date') {
    fields.Day = calendarDate.Day;
  }
  if (type === 'year-month' || type === 'date') {
    fields.Year = calendarDate.Year;
  }
  return fields;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-getdifferencesettings */
export function* GetDifferenceSettings(
  operation: 'since' | 'until',
  options: ObjectValue,
  unitGroup: 'date' | 'time' | 'datetime',
  disallowedUnits: readonly TemporalUnit[],
  fallbackSmallestUnit: TemporalUnit,
  smallestLargestDefaultUnit: TemporalUnit,
): PlainEvaluator<{
  SmallestUnit: TemporalUnit,
  LargestUnit: TemporalUnit,
  RoundingMode: RoundingMode,
  RoundingIncrement: bigint,
}> {
  let largestUnit = Q(yield* GetTemporalUnitValuedOption(options, 'largestUnit', 'unset'));
  const roundingIncrement = Q(yield* GetRoundingIncrementOption(options));
  let roundingMode = Q(yield* GetRoundingModeOption(options, RoundingMode.Trunc));
  let smallestUnit = Q(yield* GetTemporalUnitValuedOption(options, 'smallestUnit', 'unset'));
  Q(ValidateTemporalUnitValue(largestUnit, unitGroup, ['auto']));
  if (largestUnit === 'unset') {
    largestUnit = 'auto';
  }
  if (disallowedUnits.includes(largestUnit as TemporalUnit)) {
    return Throw.RangeError('$1 is out of range', largestUnit);
  }
  Q(ValidateTemporalUnitValue(smallestUnit, unitGroup));
  if (smallestUnit === 'unset') {
    smallestUnit = fallbackSmallestUnit;
  }
  if (disallowedUnits.includes(smallestUnit as TemporalUnit)) {
    return Throw.RangeError('$1 is out of range', smallestUnit);
  }
  const defaultLargestUnit = LargerOfTwoTemporalUnits(smallestLargestDefaultUnit, smallestUnit as TemporalUnit);
  if (largestUnit === 'auto') {
    largestUnit = defaultLargestUnit;
  }
  if (LargerOfTwoTemporalUnits(largestUnit, smallestUnit as TemporalUnit) !== largestUnit) {
    return Throw.RangeError('$1 is out of range', largestUnit);
  }
  const maximum = MaximumTemporalDurationRoundingIncrement(smallestUnit as TemporalUnit);
  if (maximum !== 'unset') {
    Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, false));
  }
  if (operation === 'since') {
    roundingMode = NegateRoundingMode(roundingMode);
  }
  return {
    SmallestUnit: smallestUnit as TemporalUnit,
    LargestUnit: largestUnit,
    RoundingMode: roundingMode,
    RoundingIncrement: roundingIncrement,
  };
}
