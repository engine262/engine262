import { Value, ObjectValue, JSStringValue, NumberValue, UndefinedValue, Q, surroundingAgent, Get, ToString, type PlainCompletion, type PlainEvaluator, Assert, type PropertyKeyValue, X } from '#self';
import { GetOption, GetRoundingIncrementOption, GetRoundingModeOption, ParseDateTimeUTCOffset, ToZeroPaddedDecimalString, UnsignedRoundingMode, type TimeZoneIdentifier } from './addition.mts';
import { CreateISODateRecord, CreateTemporalDate, isTemporalPlainDateObject, type ISODateRecord, type TemporalPlainDateObject } from '../../intrinsics/Temporal/PlainDate.mts';
import { CreateTemporalZonedDateTime, InterpretISODateTimeOffset, isTemporalZonedDateTimeObject, type ISODateTimeMatchBehaviour, type ISODateTimeOffsetBehaviour, type TemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { RoundingMode } from './addition.mts';
import { CalendarISOToDate, CanonicalizeCalendar, GetTemporalCalendarIdentifierWithISODefault, PrepareCalendarFields, type CalendarFieldsRecord, type CalendarType } from './calendar.mts';
import { InterpretTemporalDateTimeFields, isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { ToTemporalTimeZoneIdentifier } from './time-zone.mts';
import { ToPrimitive, ToNumber } from '#self';
import { ParseISODateTime } from '../../parser/Temporal_ISO8601.mts';

/** https://tc39.es/proposal-temporal/#sec-isodatetoepochdays */
// TODO: Review
export function ISODateToEpochDays(year: number, month: number, date: number): number {
  const resolvedYear = year + Math.floor(month / 12);
  const resolvedMonth = ((month % 12) + 12) % 12;
  // Find a time t such that EpochTimeToEpochYear(t) = resolvedYear, EpochTimeToMonthInYear(t) = resolvedMonth, and EpochTimeToDate(t) = 1.
  let y = resolvedYear;
  let m = resolvedMonth;
  let t = EpochDayNumberForYear(y);
  const isLeap = MathematicalDaysInYear(y) === 366;
  const monthDays = [
    31,
    isLeap ? 29 : 28,
    31, 30, 31, 30,
    31, 31, 30, 31, 30, 31,
  ];
  for (let i = 0; i < m; ++i) {
    t += monthDays[i];
  }
  Assert(EpochTimeToEpochYear(t) === resolvedYear && EpochTimeToMonthInYear(t) === resolvedMonth && EpochTimeToDate(t) === 1);

  return EpochTimeToDayNumber(t) + date - 1;
}

/** https://tc39.es/proposal-temporal/#sec-epochdaystoepochms */
export function EpochDaysToEpochMs(day: number, time: number): number {
  return day * 86400000 + time;
}

/** https://tc39.es/proposal-temporal/#eqn-EpochTimeToDayNumber */
export function EpochTimeToDayNumber(t: number): number {
  return Math.floor(t / 86400000);
}

/** https://tc39.es/proposal-temporal/#sec-mathematicaldaysinyear */
export function MathematicalDaysInYear(y: number): number {
  if (y % 4 !== 0) return 365;
  if (y % 100 !== 0) return 366;
  if (y % 400 !== 0) return 365;
  return 366;
}

/** https://tc39.es/proposal-temporal/#sec-epochdaynumberforyear */
export function EpochDayNumberForYear(y: number): number {
  return 365 * (y - 1970)
    + Math.floor((y - 1969) / 4)
    - Math.floor((y - 1901) / 100)
    + Math.floor((y - 1601) / 400);
}

/** https://tc39.es/proposal-temporal/#sec-epochtimeforyear */
export function EpochTimeForYear(y: number): number {
  return 86400000 * EpochDayNumberForYear(y);
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetoepochyear */
// TODO: Review
export function EpochTimeToEpochYear(t: number): number {
  // EpochTimeToEpochYear(t) = the largest integral Number y (closest to +∞) such that EpochTimeForYear(y) ≤ t
  let lower = -271821;
  let upper = 275760;
  while (lower < upper) {
    const mid = Math.floor((lower + upper + 1) / 2);
    if (EpochTimeForYear(mid) <= t) {
      lower = mid;
    } else {
      upper = mid - 1;
    }
  }
  return lower;
}

/** https://tc39.es/proposal-temporal/#sec-mathematicalinleapyear */
export function MathematicalInLeapYear(t: number): number {
  return MathematicalDaysInYear(EpochTimeToEpochYear(t)) === 366 ? 1 : 0;
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetomonthinyear */
export function EpochTimeToMonthInYear(t: number): number {
  const dayInYear = EpochTimeToDayInYear(t);
  const leap = MathematicalInLeapYear(t);
  if (0 <= dayInYear && dayInYear < 31) return 0;
  if (31 <= dayInYear && dayInYear < 59 + leap) return 1;
  if (59 + leap <= dayInYear && dayInYear < 90 + leap) return 2;
  if (90 + leap <= dayInYear && dayInYear < 120 + leap) return 3;
  if (120 + leap <= dayInYear && dayInYear < 151 + leap) return 4;
  if (151 + leap <= dayInYear && dayInYear < 181 + leap) return 5;
  if (181 + leap <= dayInYear && dayInYear < 212 + leap) return 6;
  if (212 + leap <= dayInYear && dayInYear < 243 + leap) return 7;
  if (243 + leap <= dayInYear && dayInYear < 273 + leap) return 8;
  if (273 + leap <= dayInYear && dayInYear < 304 + leap) return 9;
  if (304 + leap <= dayInYear && dayInYear < 334 + leap) return 10;
  return 11;
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetodayinyear */
export function EpochTimeToDayInYear(t: number): number {
  return EpochTimeToDayNumber(t) - EpochDayNumberForYear(EpochTimeToEpochYear(t));
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetodate */
export function EpochTimeToDate(t: number): number {
  const m = EpochTimeToMonthInYear(t);
  const dayInYear = EpochTimeToDayInYear(t);
  const leap = MathematicalInLeapYear(t) ? 1 : 0;
  if (m === 0) return dayInYear + 1;
  if (m === 1) return dayInYear - 30;
  if (m === 2) return dayInYear - 58 - leap;
  if (m === 3) return dayInYear - 89 - leap;
  if (m === 4) return dayInYear - 119 - leap;
  if (m === 5) return dayInYear - 150 - leap;
  if (m === 6) return dayInYear - 180 - leap;
  if (m === 7) return dayInYear - 211 - leap;
  if (m === 8) return dayInYear - 242 - leap;
  if (m === 9) return dayInYear - 272 - leap;
  if (m === 10) return dayInYear - 303 - leap;
  return dayInYear - 333 - leap;
}

/** https://tc39.es/proposal-temporal/#sec-epochtimetoweekday */
export function EpochTimeToWeekDay(t: number): number {
  return (EpochTimeToDayNumber(t) + 4) % 7;
}

/** https://tc39.es/proposal-temporal/#sec-checkisodaysrange */
export function CheckISODaysRange(isoDate: ISODateRecord): PlainCompletion<void> {
  const days = Math.abs(ISODateToEpochDays(isoDate.Year, isoDate.Month - 1, isoDate.Day));
  if (days > 1e8) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', days);
  }
  return undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-units */
export enum TemporalUnit {
  Year, Month, Week, Day,
  Hour, Minute, Second, Millisecond, Microsecond, Nanosecond
}

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export type TimeUnit = TemporalUnit.Hour | TemporalUnit.Minute | TemporalUnit.Second | TemporalUnit.Millisecond | TemporalUnit.Microsecond | TemporalUnit.Nanosecond;

export function __IsTimeUnit(unit: TemporalUnit): unit is TimeUnit {
  return (unit === TemporalUnit.Hour ||
    unit === TemporalUnit.Minute ||
    unit === TemporalUnit.Second ||
    unit === TemporalUnit.Millisecond ||
    unit === TemporalUnit.Microsecond ||
    unit === TemporalUnit.Nanosecond
  )
}

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export type DateUnit = TemporalUnit.Year | TemporalUnit.Month | TemporalUnit.Week | TemporalUnit.Day;

export function __IsDateUnit(unit: TemporalUnit): unit is DateUnit {
  return (unit === TemporalUnit.Year ||
    unit === TemporalUnit.Month ||
    unit === TemporalUnit.Week ||
    unit === TemporalUnit.Day
  )
}

/** https://tc39.es/proposal-temporal/#sec-gettemporaloverflowoption */
export function* GetTemporalOverflowOption(options: ObjectValue): PlainEvaluator<'constrain' | 'reject'> {
  const stringValue = Q(yield* GetOption(options, 'overflow', 'string', ['constrain', 'reject'], 'constrain'));
  if (stringValue === 'constrain') return 'constrain';
  return 'reject';
}

/** https://tc39.es/proposal-temporal/#sec-gettemporaldisambiguationoption */
export function* GetTemporalDisambiguationOption(options: ObjectValue): PlainEvaluator<'compatible' | 'earlier' | 'later' | 'reject'> {
  const stringValue = Q(yield* GetOption(options, 'disambiguation', 'string', ['compatible', 'earlier', 'later', 'reject'], 'compatible'));
  if (stringValue === 'compatible') return 'compatible';
  if (stringValue === 'earlier') return 'earlier';
  if (stringValue === 'later') return 'later';
  return 'reject';
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
  // step 1 to 4
  const stringFallback = fallback;
  const stringValue = Q(yield* GetOption(options, 'offset', 'string', ['prefer', 'use', 'ignore', 'reject'], stringFallback));
  if (stringValue === 'prefer') return 'prefer';
  if (stringValue === 'use') return 'use';
  if (stringValue === 'ignore') return 'ignore';
  return 'reject';
}

export type ShowCalendarNameOption = 'auto' | 'always' | 'never' | 'critical';
/** https://tc39.es/proposal-temporal/#sec-gettemporalshowcalendarnameoption */
export function* GetTemporalShowCalendarNameOption(options: ObjectValue): PlainEvaluator<ShowCalendarNameOption> {
  const stringValue = Q(yield* GetOption(options, 'calendarName', 'string', ['auto', 'always', 'never', 'critical'], 'auto'));
  if (stringValue === 'always') return 'always';
  if (stringValue === 'never') return 'never';
  if (stringValue === 'critical') return 'critical';
  return 'auto';
}

export type ShowTimeZoneNameOption = 'auto' | 'never' | 'critical';
/** https://tc39.es/proposal-temporal/#sec-gettemporalshowtimezonenameoption */
export function* GetTemporalShowTimeZoneNameOption(options: ObjectValue): PlainEvaluator<ShowTimeZoneNameOption> {
  const stringValue = Q(yield* GetOption(options, 'timeZoneName', 'string', ['auto', 'never', 'critical'], 'auto'));
  if (stringValue === 'never') return 'never';
  if (stringValue === 'critical') return 'critical';
  return 'auto';
}

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowoffsetoption */
export function* GetTemporalShowOffsetOption(options: ObjectValue): PlainEvaluator<'auto' | 'never'> {
  const stringValue = Q(yield* GetOption(options, 'offset', 'string', ['auto', 'never'], 'auto'));
  if (stringValue === 'never') return 'never';
  return 'auto';
}

export type DirectionOption = 'next' | 'previous';
/** https://tc39.es/proposal-temporal/#sec-getdirectionoption */
export function* GetDirectionOption(options: ObjectValue): PlainEvaluator<DirectionOption> {
  const stringValue = Q(yield* GetOption(options, 'direction', 'string', ['next', 'previous'], '~required~'));
  if (stringValue === 'next') return 'next';
  return 'previous';
}

/** https://tc39.es/proposal-temporal/#sec-validatetemporalroundingincrement */
export function ValidateTemporalRoundingIncrement(increment: number, dividend: number, inclusive: boolean): PlainCompletion<void> {
  let maximum;
  if (inclusive) {
    maximum = dividend;
  } else {
    Assert(dividend > 1);
    maximum = dividend - 1;
  }
  if (increment > maximum) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', increment);
  }
  if (dividend % increment !== 0) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', increment);
  }
  return undefined;
}

/** https://tc39.es/proposal-temporal/#sec-gettemporalfractionalseconddigitsoption */
export function* GetTemporalFractionalSecondDigitsOption(options: ObjectValue): PlainEvaluator<'auto' | number> {
  const digitsValue = Q(yield* Get(options, Value('fractionalSecondDigits')));
  if (digitsValue instanceof UndefinedValue) return 'auto';
  if (!(digitsValue instanceof NumberValue)) {
    if (Q(yield* ToString(digitsValue)).stringValue() !== 'auto') {
      return surroundingAgent.Throw('RangeError', 'OutOfRange', digitsValue);
    }
    return 'auto';
  }
  if (digitsValue.isNaN() || digitsValue.isInfinity()) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', digitsValue);
  }
  const digitCount = Math.floor(digitsValue.numberValue());
  if (digitCount < 0 || digitCount > 9) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', digitsValue);
  }
  return digitCount;
}

/** https://tc39.es/proposal-temporal/#sec-tosecondsstringprecisionrecord */
export function ToSecondsStringPrecisionRecord(
  smallestUnit: 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond' | 'unset',
  fractionalDigitCount: 'auto' | number
): {
  Precision: 'minute' | 'auto' | number,
  Unit: 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond',
  Increment: 1 | 10 | 100
} {
  if (smallestUnit === 'minute') return { Precision: 'minute', Unit: 'minute', Increment: 1 };
  if (smallestUnit === 'second') return { Precision: 0, Unit: 'second', Increment: 1 };
  if (smallestUnit === 'millisecond') return { Precision: 3, Unit: 'millisecond', Increment: 1 };
  if (smallestUnit === 'microsecond') return { Precision: 6, Unit: 'microsecond', Increment: 1 };
  if (smallestUnit === 'nanosecond') return { Precision: 9, Unit: 'nanosecond', Increment: 1 };
  Assert(smallestUnit === 'unset');
  if (fractionalDigitCount === 'auto') return { Precision: 'auto', Unit: 'nanosecond', Increment: 1 };
  if (fractionalDigitCount === 0) return { Precision: 0, Unit: 'second', Increment: 1 };
  if (fractionalDigitCount >= 1 && fractionalDigitCount <= 3) {
    return { Precision: fractionalDigitCount, Unit: 'millisecond', Increment: 10 ** (3 - fractionalDigitCount) as 1 | 10 | 100 };
  }
  if (fractionalDigitCount >= 4 && fractionalDigitCount <= 6) {
    return { Precision: fractionalDigitCount, Unit: 'microsecond', Increment: 10 ** (6 - fractionalDigitCount) as 1 | 10 | 100 };
  }
  Assert(fractionalDigitCount >= 7 && fractionalDigitCount <= 9);
  return { Precision: fractionalDigitCount, Unit: 'nanosecond', Increment: 10 ** (9 - fractionalDigitCount) as 1 | 10 | 100 };
}

/** https://tc39.es/proposal-temporal/#sec-gettemporalunitvaluedoption */
export function* GetTemporalUnitValuedOption(
  options: ObjectValue,
  key: PropertyKeyValue | string,
  unitGroup: 'date' | 'time' | 'datetime',
  default_: 'required' | 'unset' | 'auto' | TemporalUnit,
  extraValues?: (TemporalUnit | 'auto')[]
): PlainEvaluator<TemporalUnit | 'unset' | 'auto'> {
  const table = [
    { Value: TemporalUnit.Year, Singular: 'year', Plural: 'years', Category: 'date' },
    { Value: TemporalUnit.Month, Singular: 'month', Plural: 'months', Category: 'date' },
    { Value: TemporalUnit.Week, Singular: 'week', Plural: 'weeks', Category: 'date' },
    { Value: TemporalUnit.Day, Singular: 'day', Plural: 'days', Category: 'date' },
    { Value: TemporalUnit.Hour, Singular: 'hour', Plural: 'hours', Category: 'time' },
    { Value: TemporalUnit.Minute, Singular: 'minute', Plural: 'minutes', Category: 'time' },
    { Value: TemporalUnit.Second, Singular: 'second', Plural: 'seconds', Category: 'time' },
    { Value: TemporalUnit.Millisecond, Singular: 'millisecond', Plural: 'milliseconds', Category: 'time' },
    { Value: TemporalUnit.Microsecond, Singular: 'microsecond', Plural: 'microseconds', Category: 'time' },
    { Value: TemporalUnit.Nanosecond, Singular: 'nanosecond', Plural: 'nanoseconds', Category: 'time' },
  ] as const;
  let allowedValues: (TemporalUnit | 'auto')[] = [];
  // TODO: Review
  for (const row of table) {
    if ((row.Category === 'date' && (unitGroup === 'date' || unitGroup === 'datetime')) ||
        (row.Category === 'time' && (unitGroup === 'time' || unitGroup === 'datetime'))) {
      allowedValues.push(row.Value);
    }
  }
  if (extraValues) {
    allowedValues = allowedValues.concat(extraValues);
  }
  let defaultValue: undefined | '~required~' | 'auto' | Lowercase<keyof typeof TemporalUnit>;
  if (default_ === 'unset') {
    defaultValue = undefined;
  } else if (default_ === 'required') {
    defaultValue = '~required~';
  } else if (default_ === 'auto') {
    allowedValues.push('auto');
    defaultValue = 'auto';
  } else {
    Assert(allowedValues.includes(default_));
    defaultValue = table.find(r => r.Value === default_)!.Singular;
  }
  const allowedStrings: string[] = [];
  for (const value of allowedValues) {
    if (value === 'auto') {
      allowedStrings.push('auto');
    } else {
      const row = table.find(r => r.Value === value)!;
      allowedStrings.push(row.Singular, row.Plural);
    }
  }
  const value = Q(yield* GetOption(options, key, 'string', allowedStrings, defaultValue));
  if (value === undefined) return 'unset';
  if (value === 'auto') return 'auto';
  // TODO: 14. Return the value in the "Value" column of Table 21 corresponding to the row with value in its "Singular property name" or "Plural property name" column.
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
  let timeZone: TimeZoneIdentifier | 'unset';
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
    const fields = Q(yield* PrepareCalendarFields(calendar, value, ['Year', 'Month', 'MonthCode', 'Day'], ['Hour', 'Minute', 'Second', 'Millisecond', 'Microsecond', 'Nanosecond', 'OffsetString', 'TimeZone'], []));
    const result = Q(InterpretTemporalDateTimeFields(calendar, fields, 'constrain'));
    timeZone = fields.TimeZone as TimeZoneIdentifier;
    offsetString = fields.OffsetString;
    if (offsetString === undefined) {
      offsetBehaviour = 'wall';
    }
    isoDate = result.ISODate;
    time = result.Time;
  } else {
    if (!(value instanceof JSStringValue)) {
      return surroundingAgent.Throw('TypeError', 'NotAString', value);
    }
    const result = Q(ParseISODateTime(value.stringValue(), ['TemporalDateTimeString[+Zoned]', 'TemporalDateTimeString[~Zoned]']));
    offsetString = result.TimeZone.OffsetString;
    const annotation = result.TimeZone.TimeZoneAnnotation;
    if (!annotation) {
      timeZone = 'unset';
    } else {
      timeZone = Q(ToTemporalTimeZoneIdentifier(annotation));
      if (result.TimeZone.Z === true) {
        offsetBehaviour = 'exact';
      } else if (!offsetString) {
        offsetBehaviour = 'wall';
      }
      matchBehaviour = 'match-minutes';
    }
    let _calendar = result.Calendar;
    if (!_calendar) _calendar = 'iso8601';
    calendar = Q(CanonicalizeCalendar(_calendar));
    isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
    time = result.Time;
  }
  if (timeZone === 'unset') {
    const plainDate = Q(yield* CreateTemporalDate(isoDate, calendar));
    return { PlainRelativeTo: plainDate, ZonedRelativeTo: undefined };
  }
  let offsetNs;
  if (offsetBehaviour === 'option') {
    offsetNs = ParseDateTimeUTCOffset(offsetString!);
  } else {
    offsetNs = 0;
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
    if (u1 === unit) return unit;
    if (u2 === unit) return unit;
  }
  Assert(false, 'unreachable');
}

/** https://tc39.es/proposal-temporal/#sec-iscalendarunit */
export function IsCalendarUnit(unit: TemporalUnit): unit is TemporalUnit.Year | TemporalUnit.Month | TemporalUnit.Week {
  return unit === TemporalUnit.Year || unit === TemporalUnit.Month || unit === TemporalUnit.Week;
}

/** https://tc39.es/proposal-temporal/#sec-temporalunitcategory */
export function TemporalUnitCategory(unit: TemporalUnit): 'date' | 'time' {
  if (unit === TemporalUnit.Year || unit === TemporalUnit.Month || unit === TemporalUnit.Week || unit === TemporalUnit.Day) return 'date';
  return 'time';
}

/** https://tc39.es/proposal-temporal/#sec-maximumtemporaldurationroundingincrement */
export function MaximumTemporalDurationRoundingIncrement(unit: TemporalUnit): 24 | 60 | 1000 | 'unset' {
  switch (unit) {
    case TemporalUnit.Hour: return 24;
    case TemporalUnit.Minute: return 60;
    case TemporalUnit.Second: return 60;
    case TemporalUnit.Millisecond: return 1000;
    case TemporalUnit.Microsecond: return 1000;
    case TemporalUnit.Nanosecond: return 1000;
    default: return 'unset';
  }
}

/** https://tc39.es/proposal-temporal/#sec-ispartialtemporalobject */
export function* IsPartialTemporalObject(value: Value): PlainEvaluator<boolean> {
  if (!(value instanceof ObjectValue)) return false;
  if (
    'InitializedTemporalDate' in value ||
    'InitializedTemporalDateTime' in value ||
    'InitializedTemporalMonthDay' in value ||
    'InitializedTemporalTime' in value ||
    'InitializedTemporalYearMonth' in value ||
    'InitializedTemporalZonedDateTime' in value
  ) {
    return false;
  }
  const calendarProperty = Q(yield* Get(value, Value('calendar')));
  if (!(calendarProperty instanceof UndefinedValue)) return false;
  const timeZoneProperty = Q(yield* Get(value, Value('timeZone')));
  if (!(timeZoneProperty instanceof UndefinedValue)) return false;
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-formatfractionalseconds */
export function FormatFractionalSeconds(subSecondNanoseconds: number, precision: number | 'auto'): string {
  if (precision === 'auto') {
    if (subSecondNanoseconds === 0) return '';
    let fractionString = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
    // Set fractionString to the longest prefix of fractionString ending with a code unit other than 0x0030 (DIGIT ZERO).
    fractionString = fractionString.replace(/0+$/, '');
    return '.' + fractionString;
  } else {
    if (precision === 0) return '';
    let fractionString = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
    fractionString = fractionString.slice(0, precision);
    return '.' + fractionString;
  }
}

/** https://tc39.es/proposal-temporal/#sec-formattimestring */
export function FormatTimeString(
  hour: number,
  minute: number,
  second: number,
  subSecondNanoseconds: number,
  precision: number | 'minute' | 'auto',
  style?: 'separated' | 'unseparated'
): string {
  const separator = style === 'unseparated' ? '' : ':';
  const hh = ToZeroPaddedDecimalString(hour, 2);
  const mm = ToZeroPaddedDecimalString(minute, 2);
  if (precision === 'minute') return hh + separator + mm;
  const ss = ToZeroPaddedDecimalString(second, 2);
  const subSecondsPart = FormatFractionalSeconds(subSecondNanoseconds, precision);
  return hh + separator + mm + separator + ss + subSecondsPart;
}

/** https://tc39.es/proposal-temporal/#sec-getunsignedroundingmode */
export function GetUnsignedRoundingMode(
  roundingMode: RoundingMode,
  sign: 'negative' | 'positive'
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
  x: number,
  r1: number,
  r2: number,
  unsignedRoundingMode?: UnsignedRoundingMode
): number {
  if (x === r1) return r1;
  Assert(r1 < x && x < r2)
  Assert(unsignedRoundingMode !== undefined);
  if (unsignedRoundingMode === UnsignedRoundingMode.Zero) return r1;
  if (unsignedRoundingMode === UnsignedRoundingMode.Infinity) return r2;
  const d1 = x - r1;
  const d2 = r2 - x;
  if (d1 < d2) return r1;
  if (d2 < d1) return r2;
  Assert(d1 === d2);
  if (unsignedRoundingMode === UnsignedRoundingMode.HalfZero) return r1;
  if (unsignedRoundingMode === UnsignedRoundingMode.HalfInfinity) return r2;
  Assert(unsignedRoundingMode === UnsignedRoundingMode.HalfEven);
  const cardinality = (r1 / (r2 - r1)) % 2;
  if (cardinality === 0) return r1;
  return r2;
}

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrement */
export function RoundNumberToIncrement(
  x: number,
  increment: number,
  roundingMode: RoundingMode
): number {
  let quotient = x / increment;
  let isNegative: 'negative' | 'positive';
  if (quotient < 0) {
    isNegative = 'negative';
    quotient = -quotient;
  } else {
    isNegative = 'positive';
  }
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, isNegative);
  // Let r1 be the largest integer such that r1 ≤ quotient.
  const r1 = Math.floor(quotient);
  // Let r2 be the smallest integer such that r2 > quotient.
  const r2 = r1 + 1;
  let rounded = ApplyUnsignedRoundingMode(quotient, r1, r2, unsignedRoundingMode);
  if (isNegative === 'negative') rounded = -rounded;
  return rounded * increment;
}

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrementasifpositive */
export function RoundNumberToIncrementAsIfPositive(
  x: number,
  increment: number,
  roundingMode: RoundingMode
): number {
  const quotient = x / increment;
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, 'positive');
  // Let r1 be the largest integer such that r1 ≤ quotient.
  const r1 = Math.floor(quotient);
  // Let r2 be the smallest integer such that r2 > quotient.
  const r2 = r1 + 1;
  const rounded = ApplyUnsignedRoundingMode(quotient, r1, r2, unsignedRoundingMode);
  return rounded * increment;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-topositiveintegerwithtruncation */
export function* ToPositiveIntegerWithTruncation(argument: Value): PlainEvaluator<number> {
  const integer = Q(yield* ToIntegerWithTruncation(argument));
  if (integer <= 0) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', integer);
  }
  return integer;
}

// TODO: Review
/** https://tc39.es/proposal-temporal/#sec-temporal-tointegerwithtruncation */
export function* ToIntegerWithTruncation(argument: Value): PlainEvaluator<number> {
  const number = Q(yield* ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === Infinity || number === -Infinity) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', number);
  }
  return Math.trunc(number);
}

// TODO: Review
/** https://tc39.es/proposal-temporal/#sec-temporal-tomonthcode */
export function* ToMonthCode(argument: Value): PlainEvaluator<string> {
  let monthCode = Q(yield* ToPrimitive(argument, 'string'));
  if (!(monthCode instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', monthCode);
  }
  const s = monthCode.stringValue();
  if (s.length !== 3 && s.length !== 4) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', s);
  }
  if (s.charCodeAt(0) !== 0x004D) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', s);
  }
  if (s.charCodeAt(1) < 0x0030 || s.charCodeAt(1) > 0x0039) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', s);
  }
  if (s.charCodeAt(2) < 0x0030 || s.charCodeAt(2) > 0x0039) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', s);
  }
  if (s.length === 4 && s.charCodeAt(3) !== 0x004C) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', s);
  }
  const monthCodeDigits = s.slice(1, 3);
  const monthCodeInteger = Number(monthCodeDigits);
  if (monthCodeInteger === 0 && s.length !== 4) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', s);
  }
  return s;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-tooffsetstring */
export function* ToOffsetString(argument: Value): PlainEvaluator<string> {
  let offset = Q(yield* ToPrimitive(argument, 'string'));
  if (!(offset instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', offset);
  }
  Q(ParseDateTimeUTCOffset(offset.stringValue()));
  return offset.stringValue();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetofields */
export function ISODateToFields(
  calendar: CalendarType,
  isoDate: ISODateRecord,
  type: 'date' | 'year-month' | 'month-day'
): PlainCompletion<CalendarFieldsRecord> {
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
  smallestLargestDefaultUnit: TemporalUnit
): PlainEvaluator<{
  SmallestUnit: TemporalUnit,
  LargestUnit: TemporalUnit,
  RoundingMode: RoundingMode,
  RoundingIncrement: number
}> {
  let largestUnit = Q(yield* GetTemporalUnitValuedOption(options, 'largestUnit', unitGroup, 'auto'));
  if (disallowedUnits.includes(largestUnit as TemporalUnit)) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', largestUnit);
  }
  const roundingIncrement = Q(yield* GetRoundingIncrementOption(options));
  let roundingMode = Q(yield* GetRoundingModeOption(options, RoundingMode.Trunc));
  if (operation === 'since') {
    roundingMode = NegateRoundingMode(roundingMode);
  }
  let smallestUnit = Q(yield* GetTemporalUnitValuedOption(options, 'smallestUnit', unitGroup, fallbackSmallestUnit));
  if (disallowedUnits.includes(smallestUnit as TemporalUnit)) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', smallestUnit);
  }
  const defaultLargestUnit = LargerOfTwoTemporalUnits(smallestLargestDefaultUnit, smallestUnit);
  if (largestUnit === 'auto') {
    largestUnit = defaultLargestUnit;
  }
  if (LargerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', largestUnit);
  }
  const maximum = MaximumTemporalDurationRoundingIncrement(smallestUnit);
  if (maximum !== 'unset') {
    Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, false));
  }
  return {
    SmallestUnit: smallestUnit,
    LargestUnit: largestUnit,
    RoundingMode: roundingMode,
    RoundingIncrement: roundingIncrement,
  };
}
