import { CanonicalizeUValue } from '../../ecma402/not-implemented.mts';
import {
  __ts_cast__, isArray, OutOfRange, type Mutable,
} from '../../utils/language.mts';
import { ParseMonthCode, ParseTemporalCalendarString } from '../../parser/TemporalParser.mts';
import { isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { isTemporalPlainMonthDayObject } from '../../intrinsics/Temporal/PlainMonthDay.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { isTemporalPlainDateObject, type ISODateRecord } from '../../intrinsics/Temporal/PlainDate.mts';
import { isTemporalPlainYearMonthObject } from '../../intrinsics/Temporal/PlainYearMonth.mts';
import { floorDiv } from '../math.mts';
import { SnapToInteger, ToZeroPaddedDecimalString } from './addition.mts';
import type { YearWeekRecord } from './addition.mts';
import {
  EpochDaysToEpochMs,
  EpochTimeForYear,
  EpochTimeToDayInYear,
  EpochTimeToWeekDay,
  ISODateToEpochDays,
  MathematicalDaysInYear,
  MathematicalInLeapYear,
  TemporalUnit,
  ToOffsetString, type DateUnit,
} from './temporal.mts';
import { ToTemporalTimeZoneIdentifier } from './time-zone.mts';
import { mark_OtherCalendarNotImplemented, unreachable_OtherCalendarNotImplemented } from './not-implemented.mts';
import {
  AddDaysToISODate,
  Assert,
  BalanceISOYearMonth,
  CompareISODate,
  CreateDateDurationRecord,
  CreateISODateRecord,
  F,
  Get,
  ISODateSurpasses,
  ISODateWithinLimits,
  ISOYearMonthWithinLimits,
  JSStringValue,
  NumberValue,
  ObjectValue,
  Q,
  R,
  RegulateISODate,
  Throw,
  ToString,
  Value,
  X,
  ZeroDateDuration,
  type DateDurationRecord,
  type Integer,
  type PlainCompletion, type PlainEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-calendar-types */
export type CalendarType = 'iso8601';

/** https://tc39.es/proposal-temporal/#sec-temporal-canonicalizecalendar */
export function CanonicalizeCalendar(id: string): PlainCompletion<CalendarType> {
  if (id.toLowerCase() !== 'iso8601') {
    return Throw.RangeError('$1 is not a supported calendar', id);
  }
  return 'iso8601';
}

/** https://tc39.es/proposal-temporal/#sec-temporal-availablecalendars */
export function AvailableCalendars(): CalendarType[] {
  mark_OtherCalendarNotImplemented();
  return ['iso8601'];
}

export type MonthCode = string & { __brand: 'MonthCode' };

/** https://tc39.es/proposal-temporal/#sec-temporal-createmonthcode */
export function CreateMonthCode(monthNumber: Integer, isLeapMonth: boolean): MonthCode {
  if (!isLeapMonth) Assert(monthNumber > 0n);
  const numberPart = ToZeroPaddedDecimalString(monthNumber, 2);
  if (isLeapMonth) {
    return `M${numberPart}L` as MonthCode;
  }
  return `M${numberPart}` as MonthCode;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendar-date-records */
export interface CalendarDateRecord {
  readonly Era: string | undefined;
  readonly EraYear: Integer | undefined;
  readonly Year: Integer;
  readonly Month: Integer;
  readonly MonthCode: string;
  readonly Day: Integer;
  readonly DayOfWeek: Integer;
  readonly DayOfYear: Integer;
  readonly WeekOfYear: YearWeekRecord;
  readonly DaysInWeek: Integer;
  readonly DaysInMonth: Integer;
  readonly DaysInYear: Integer;
  readonly MonthsInYear: Integer;
  readonly InLeapYear: boolean;
}

/** https://tc39.es/proposal-temporal/#table-temporal-calendar-fields-record-fields */
export interface CalendarFieldsRecord {
  readonly Era: string | undefined;
  readonly EraYear: Integer | undefined;
  Year: Integer | undefined;
  Month: Integer | undefined;
  MonthCode: string | undefined;
  Day: Integer | undefined;
  Hour: Integer | undefined;
  Minute: Integer | undefined;
  Second: Integer | undefined;
  Millisecond: Integer | undefined;
  Microsecond: Integer | undefined;
  Nanosecond: Integer | undefined;
  OffsetString: string | undefined;
  readonly TimeZone: string | undefined;
}

export enum Table19_Conversion {
  ToString = 'to-string',
  ToIntegerWithTruncation = 'to-integer-with-truncation',
  ToPositiveIntegerWithTruncation = 'to-positive-integer-with-truncation',
  ToTemporalTimeZoneIdentifier = 'to-temporal-time-zone-identifier',
  ToMonthCode = 'to-month-code',
  ToOffsetString = 'to-offset-string',
}

export type CalendarFieldsRecordEnumerationKey = 'era' | 'era-year' | 'year' | 'month' | 'month-code' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond' | 'offset' | 'time-zone';

/** https://tc39.es/ecma262/pr/3759/#table-calendar-fields-record-fields */
export const Table63_CalendarFieldsRecordFields = [
  /* eslint-disable object-curly-newline */
  { FieldName: 'Era', DefaultValue: undefined, PropertyKey: 'era', EnumerationKey: 'era', Conversion: Table19_Conversion.ToString },
  { FieldName: 'EraYear', DefaultValue: undefined, PropertyKey: 'eraYear', EnumerationKey: 'era-year', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Year', DefaultValue: undefined, PropertyKey: 'year', EnumerationKey: 'year', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Month', DefaultValue: undefined, PropertyKey: 'month', EnumerationKey: 'month', Conversion: Table19_Conversion.ToPositiveIntegerWithTruncation },
  { FieldName: 'MonthCode', DefaultValue: undefined, PropertyKey: 'monthCode', EnumerationKey: 'month-code', Conversion: Table19_Conversion.ToMonthCode },
  { FieldName: 'Day', DefaultValue: undefined, PropertyKey: 'day', EnumerationKey: 'day', Conversion: Table19_Conversion.ToPositiveIntegerWithTruncation },
  { FieldName: 'Hour', DefaultValue: 0n, PropertyKey: 'hour', EnumerationKey: 'hour', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Minute', DefaultValue: 0n, PropertyKey: 'minute', EnumerationKey: 'minute', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Second', DefaultValue: 0n, PropertyKey: 'second', EnumerationKey: 'second', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Millisecond', DefaultValue: 0n, PropertyKey: 'millisecond', EnumerationKey: 'millisecond', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Microsecond', DefaultValue: 0n, PropertyKey: 'microsecond', EnumerationKey: 'microsecond', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Nanosecond', DefaultValue: 0n, PropertyKey: 'nanosecond', EnumerationKey: 'nanosecond', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'OffsetString', DefaultValue: undefined, PropertyKey: 'offset', EnumerationKey: 'offset', Conversion: Table19_Conversion.ToOffsetString },
  { FieldName: 'TimeZone', DefaultValue: undefined, PropertyKey: 'timeZone', EnumerationKey: 'time-zone', Conversion: Table19_Conversion.ToTemporalTimeZoneIdentifier },
  /* eslint-enable object-curly-newline */
] as const satisfies {
  FieldName: keyof CalendarFieldsRecord;
  DefaultValue: string | bigint | undefined;
  PropertyKey: string;
  EnumerationKey: CalendarFieldsRecordEnumerationKey;
  Conversion: Table19_Conversion;
}[];

/** https://tc39.es/proposal-temporal/#sec-temporal-preparecalendarfields */
export function* PrepareCalendarFields(
  calendar: CalendarType,
  fields: ObjectValue,
  calendarFieldNames: readonly CalendarFieldsRecordEnumerationKey[],
  nonCalendarFieldNames: readonly CalendarFieldsRecordEnumerationKey[],
  requiredFieldNames: 'partial' | readonly CalendarFieldsRecordEnumerationKey[],
): PlainEvaluator<CalendarFieldsRecord> {
  // Assert: If requiredFieldNames is a List, requiredFieldNames contains zero or one of each of the elements of calendarFieldNames and nonCalendarFieldNames.
  if (isArray(requiredFieldNames)) {
    Assert(calendarFieldNames.every((name) => requiredFieldNames.filter((requiredName) => name === requiredName).length <= 1));
    Assert(nonCalendarFieldNames.every((name) => requiredFieldNames.filter((requiredName) => name === requiredName).length <= 1));
  }
  let fieldNames: CalendarFieldsRecordEnumerationKey[] = [...calendarFieldNames, ...nonCalendarFieldNames];
  const extraFieldNames = CalendarExtraFields(calendar, calendarFieldNames);
  fieldNames = [...fieldNames, ...extraFieldNames];
  // Assert: fieldNames contains no duplicate elements.
  Assert(fieldNames.length === new Set(fieldNames).size);
  const result: Mutable<CalendarFieldsRecord> = {
    Era: undefined,
    EraYear: undefined,
    Year: undefined,
    Month: undefined,
    MonthCode: undefined,
    Day: undefined,
    Hour: undefined,
    Minute: undefined,
    Second: undefined,
    Millisecond: undefined,
    Microsecond: undefined,
    Nanosecond: undefined,
    OffsetString: undefined,
    TimeZone: undefined,
  };
  let any = false;

  // Let sortedPropertyNames be a List whose elements are the values in the Property Key column of Table 19 corresponding to the elements of fieldNames, sorted according to lexicographic code unit order.
  const sortedPropertyNames = [...Table63_CalendarFieldsRecordFields].filter((a) => fieldNames.includes(a.EnumerationKey)).sort((a, b) => (a.PropertyKey < b.PropertyKey ? -1 : 1));

  for (const {
    FieldName, PropertyKey, Conversion, DefaultValue, EnumerationKey,
  } of sortedPropertyNames) {
    __ts_cast__<keyof CalendarFieldsRecord>(FieldName);
    // Let key be the value in the Enumeration Key column of Table 19 corresponding to the row whose Property Key value is property.
    const key = EnumerationKey;
    let value = Q(yield* Get(fields, Value(PropertyKey)));

    if (value !== Value.undefined) {
      any = true;

      if (Conversion === Table19_Conversion.ToIntegerWithTruncation) {
        value = F(Number(Q(yield* SnapToInteger(value, 'truncate-strict'))));
      } else if (Conversion === Table19_Conversion.ToPositiveIntegerWithTruncation) {
        value = F(Number(Q(yield* SnapToInteger(value, 'truncate-strict', 1n))));
      } else if (Conversion === Table19_Conversion.ToString) {
        value = Q(yield* ToString(value));
      } else if (Conversion === Table19_Conversion.ToTemporalTimeZoneIdentifier) {
        value = Value(Q(ToTemporalTimeZoneIdentifier(value)));
      } else if (Conversion === Table19_Conversion.ToMonthCode) {
        const parsed = Q(yield* ParseMonthCode(value));
        value = Value(CreateMonthCode(parsed.MonthNumber, parsed.IsLeapMonth));
      } else {
        Assert(Conversion === Table19_Conversion.ToOffsetString);
        value = Value(Q(yield* ToOffsetString(value)));
      }

      switch (FieldName) {
        case 'Day':
        case 'EraYear':
        case 'Hour':
        case 'Microsecond':
        case 'Millisecond':
        case 'Minute':
        case 'Month':
        case 'Nanosecond':
        case 'Second':
        case 'Year': {
          Assert(value instanceof NumberValue);
          result[FieldName] = BigInt(R(value));
          break;
        }
        case 'Era':
        case 'MonthCode':
        case 'OffsetString':
        case 'TimeZone': {
          Assert(value instanceof JSStringValue);
          result[FieldName] = value.stringValue();
          break;
        }
        default: throw OutOfRange.exhaustive(FieldName);
      }
    } else if (isArray(requiredFieldNames)) {
      if (requiredFieldNames.includes(key)) {
        return Throw.TypeError('$1 is a required on object $2', key, fields);
      }
      switch (FieldName) {
        case 'Day':
        case 'EraYear':
        case 'Hour':
        case 'Microsecond':
        case 'Millisecond':
        case 'Minute':
        case 'Month':
        case 'Nanosecond':
        case 'Second':
        case 'Year': {
          result[FieldName] = DefaultValue;
          break;
        }
        case 'Era':
        case 'MonthCode':
        case 'OffsetString':
        case 'TimeZone': {
          result[FieldName] = DefaultValue;
          break;
        }
        default: throw OutOfRange.exhaustive(FieldName);
      }
    }
  }

  if (requiredFieldNames === 'partial' && !any) {
    return Throw.TypeError('$1 is not a TemporalTimeLike object', fields);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarfieldkeyspresent */
export function CalendarFieldKeysPresent(fields: CalendarFieldsRecord): CalendarFieldsRecordEnumerationKey[] {
  const list: CalendarFieldsRecordEnumerationKey[] = [];
  for (const { FieldName, EnumerationKey } of Table63_CalendarFieldsRecordFields) {
    const value = fields[FieldName];
    const enumerationKey = EnumerationKey;
    if (value !== undefined) {
      list.push(enumerationKey);
    }
  }
  return list;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmergefields */
export function CalendarMergeFields(calendar: CalendarType, fields: CalendarFieldsRecord, additionalFields: CalendarFieldsRecord): CalendarFieldsRecord {
  const additionalKeys = CalendarFieldKeysPresent(additionalFields);
  const overriddenKeys = CalendarFieldKeysToIgnore(calendar, additionalKeys);
  const merged: Mutable<CalendarFieldsRecord> = {
    Era: undefined,
    EraYear: undefined,
    Year: undefined,
    Month: undefined,
    MonthCode: undefined,
    Day: undefined,
    Hour: undefined,
    Minute: undefined,
    Second: undefined,
    Millisecond: undefined,
    Microsecond: undefined,
    Nanosecond: undefined,
    OffsetString: undefined,
    TimeZone: undefined,
  };
  const fieldsKeys = CalendarFieldKeysPresent(fields);
  for (const { EnumerationKey, FieldName } of Table63_CalendarFieldsRecordFields) {
    const key = EnumerationKey;
    if (fieldsKeys.includes(key) && !overriddenKeys.includes(key)) {
      switch (FieldName) {
        case 'Day':
        case 'EraYear':
        case 'Hour':
        case 'Microsecond':
        case 'Millisecond':
        case 'Minute':
        case 'Month':
        case 'Nanosecond':
        case 'Second':
        case 'Year': {
          const propValue = fields[FieldName];
          merged[FieldName] = propValue;
          break;
        }
        case 'Era':
        case 'MonthCode':
        case 'OffsetString':
        case 'TimeZone': {
          const propValue = fields[FieldName];
          merged[FieldName] = propValue;
          break;
        }
        default: throw OutOfRange.exhaustive(FieldName);
      }
    }
    if (additionalKeys.includes(key)) {
      switch (FieldName) {
        case 'Day':
        case 'EraYear':
        case 'Hour':
        case 'Microsecond':
        case 'Millisecond':
        case 'Minute':
        case 'Month':
        case 'Nanosecond':
        case 'Second':
        case 'Year': {
          const propValue = additionalFields[FieldName];
          merged[FieldName] = propValue;
          break;
        }
        case 'Era':
        case 'MonthCode':
        case 'OffsetString':
        case 'TimeZone': {
          const propValue = additionalFields[FieldName];
          merged[FieldName] = propValue;
          break;
        }
        default: throw OutOfRange.exhaustive(FieldName);
      }
    }
  }
  return merged;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisodateadd */
export function NonISODateAdd(
  _calendar: CalendarType,
  _isoDate: ISODateRecord,
  _duration: DateDurationRecord,
  _overflow: 'constrain' | 'reject',
): never {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateadd */
export function CalendarDateAdd(
  calendar: CalendarType,
  isoDate: ISODateRecord,
  duration: DateDurationRecord,
  overflow: 'constrain' | 'reject',
): PlainCompletion<ISODateRecord> {
  let result: ISODateRecord;
  if (calendar === 'iso8601') {
    const intermediate = Q(BalanceISOYearMonth(isoDate.Year + BigInt(duration.Years), isoDate.Month + BigInt(duration.Months)));
    const regulated = Q(RegulateISODate(intermediate.Year, intermediate.Month, isoDate.Day, overflow));
    const days = BigInt(duration.Days) + 7n * BigInt(duration.Weeks);
    result = Q(AddDaysToISODate(regulated, days));
  } else {
    result = Q(NonISODateAdd(calendar, isoDate, duration, overflow));
  }
  if (!ISODateWithinLimits(result)) {
    return Throw.RangeError('Resulting ISODate is out of range');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisodateuntil */
export function NonISODateUntil(
  _calendar: CalendarType,
  _one: ISODateRecord,
  _two: ISODateRecord,
  _largestUnit: DateUnit,
): never {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateuntil */
export function CalendarDateUntil(
  calendar: CalendarType,
  one: ISODateRecord,
  two: ISODateRecord,
  largestUnit: DateUnit,
): DateDurationRecord {
  let sign = CompareISODate(one, two);
  if (sign === 0n) return ZeroDateDuration();
  if (calendar === 'iso8601') {
    sign = -sign as 1n | -1n;
    let years = 0n;
    if (largestUnit === TemporalUnit.Year) {
      let candidateYears = sign;
      while (!ISODateSurpasses(sign, one, two, candidateYears, 0n, 0n, 0n)) {
        years = candidateYears;
        candidateYears += sign;
      }
    }
    let months = 0n;
    if (largestUnit === TemporalUnit.Year || largestUnit === TemporalUnit.Month) {
      let candidateMonths = sign;
      while (!ISODateSurpasses(sign, one, two, years, candidateMonths, 0n, 0n)) {
        months = candidateMonths;
        candidateMonths += sign;
      }
    }
    let weeks = 0n;
    if (largestUnit === TemporalUnit.Week) {
      let candidateWeeks = sign;
      while (!ISODateSurpasses(sign, one, two, years, months, candidateWeeks, 0n)) {
        weeks = candidateWeeks;
        candidateWeeks += sign;
      }
    }
    let days = 0n;
    let candidateDays = sign;
    while (!ISODateSurpasses(sign, one, two, years, months, weeks, candidateDays)) {
      days = candidateDays;
      candidateDays += sign;
    }
    return X(CreateDateDurationRecord(years, months, weeks, days));
  }
  return NonISODateUntil(calendar, one, two, largestUnit);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalcalendaridentifier */
export function ToTemporalCalendarIdentifier(temporalCalendarLike: Value): PlainCompletion<CalendarType> {
  if (temporalCalendarLike instanceof ObjectValue) {
    if (
      isTemporalPlainDateObject(temporalCalendarLike)
      || isTemporalPlainDateTimeObject(temporalCalendarLike)
      || isTemporalPlainMonthDayObject(temporalCalendarLike)
      || isTemporalPlainYearMonthObject(temporalCalendarLike)
      || isTemporalZonedDateTimeObject(temporalCalendarLike)) {
      return temporalCalendarLike.Calendar;
    }
  }
  if (!(temporalCalendarLike instanceof JSStringValue)) {
    return Throw.TypeError('temporalCalendarLike must be a string or a Temporal object, but got $1', temporalCalendarLike);
  }
  const identifier = Q(ParseTemporalCalendarString(temporalCalendarLike.stringValue()));
  return Q(CanonicalizeCalendar(identifier));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-gettemporalcalendaridentifierwithisodefault */
export function* GetTemporalCalendarIdentifierWithISODefault(item: ObjectValue): PlainEvaluator<CalendarType> {
  if (isTemporalPlainDateObject(item)
    || isTemporalPlainDateTimeObject(item)
    || isTemporalPlainMonthDayObject(item)
    || isTemporalPlainYearMonthObject(item)
    || isTemporalZonedDateTimeObject(item)) {
    return item.Calendar;
  }
  const calendarLike = Q(yield* Get(item, Value('calendar')));
  if (calendarLike === Value.undefined) {
    return 'iso8601';
  }
  return Q(ToTemporalCalendarIdentifier(calendarLike));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardatefromfields */
export function* CalendarDateFromFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject',
): PlainEvaluator<ISODateRecord> {
  Q(yield* CalendarResolveFields(calendar, fields, 'date'));
  const result = Q(CalendarDateToISO(calendar, fields, overflow));
  if (!ISODateWithinLimits(result)) {
    return Throw.RangeError('Resulting ISODate is out of range');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendaryearmonthfromfields */
export function* CalendarYearMonthFromFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject',
): PlainEvaluator<ISODateRecord> {
  Q(yield* CalendarResolveFields(calendar, fields, 'year-month'));
  // Let firstDayIndex be the 1-based index of the first day of the month described by fields (i.e., 1 unless the month's first day is skipped by this calendar.)
  const firstDayIndex = 1n;
  fields.Day = firstDayIndex;
  const result = Q(CalendarDateToISO(calendar, fields, overflow));
  if (!ISOYearMonthWithinLimits(result)) {
    return Throw.RangeError('Resulting ISODate is out of range');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdayfromfields */
export function* CalendarMonthDayFromFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject',
): PlainEvaluator<ISODateRecord> {
  Q(yield* CalendarResolveFields(calendar, fields, 'month-day'));
  const result = Q(CalendarMonthDayToISOReferenceDate(calendar, fields, overflow));
  if (!ISODateWithinLimits(result)) {
    return Throw.RangeError('Resulting ISODate is out of range');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-formatcalendarannotation */
export function FormatCalendarAnnotation(
  id: CalendarType,
  showCalendar: 'auto' | 'always' | 'never' | 'critical',
): string {
  if (showCalendar === 'never') return '';
  if (showCalendar === 'auto' && id === 'iso8601') return '';
  const flag = showCalendar === 'critical' ? '!' : '';
  return `[${flag}u-ca=${id}]`;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarequals */
export function CalendarEquals(one: CalendarType, two: CalendarType): boolean {
  if (CanonicalizeUValue('ca', one) === CanonicalizeUValue('ca', two)) {
    return true;
  }
  return false;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodaysinmonth */
export function ISODaysInMonth(year: Integer, month: Integer): Integer {
  if (month === 1n || month === 3n || month === 5n || month === 7n || month === 8n || month === 10n || month === 12n) {
    return 31n;
  }
  if (month === 4n || month === 6n || month === 9n || month === 11n) {
    return 30n;
  }
  Assert(month === 2n);
  return (28n + MathematicalInLeapYear(EpochTimeForYear(year)));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isoweekofyear */
export function ISOWeekOfYear(isoDate: ISODateRecord): YearWeekRecord {
  const year = isoDate.Year;
  const wednesday = 3n;
  const thursday = 4n;
  const friday = 5n;
  const saturday = 6n;
  const daysInWeek = 7n;
  const maxWeekNumber = 53n;
  const dayOfYear = ISODayOfYear(isoDate);
  const dayOfWeek = ISODayOfWeek(isoDate);
  const week = floorDiv((dayOfYear + daysInWeek - dayOfWeek + wednesday), daysInWeek);
  if (week < 1) {
    // NOTE: This is the last week of the previous year.
    const jan1st = CreateISODateRecord(year, 1n, 1n);
    const dayOfJan1st = ISODayOfWeek(jan1st);
    if (dayOfJan1st === friday) {
      return { Week: maxWeekNumber, Year: year - 1n };
    }
    if (dayOfJan1st === saturday && MathematicalInLeapYear(EpochTimeForYear(year - 1n)) === 1n) {
      return { Week: maxWeekNumber, Year: year - 1n };
    }
    return { Week: maxWeekNumber - 1n, Year: year - 1n };
  }
  if (week === maxWeekNumber) {
    const daysInYear = MathematicalDaysInYear(year);
    const daysLaterInYear = daysInYear - dayOfYear;
    const daysAfterThursday = thursday - dayOfWeek;
    if (daysLaterInYear < daysAfterThursday) {
      return { Week: 1n, Year: year + 1n };
    }
  }
  return { Week: week, Year: year };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofyear */
export function ISODayOfYear(isoDate: ISODateRecord): Integer {
  const epochDays = ISODateToEpochDays(isoDate.Year, isoDate.Month - 1n, isoDate.Day);
  return EpochTimeToDayInYear(EpochDaysToEpochMs(epochDays, 0n)) + 1n;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofweek */
export function ISODayOfWeek(isoDate: ISODateRecord): Integer {
  const epochDays = ISODateToEpochDays(isoDate.Year, isoDate.Month - 1n, isoDate.Day);
  const dayOfWeek = EpochTimeToWeekDay(EpochDaysToEpochMs(epochDays, 0n));
  if (dayOfWeek === 0n) {
    return 7n;
  }
  return dayOfWeek;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisocalendardatetoiso */
export function NonISOCalendarDateToISO(
  _calendar: CalendarType,
  _fields: CalendarFieldsRecord,
  _overflow: 'constrain' | 'reject',
): PlainCompletion<ISODateRecord> {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardatetoiso */
export function CalendarDateToISO(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject',
): PlainCompletion<ISODateRecord> {
  if (calendar === 'iso8601') {
    Assert(fields.Year !== undefined && fields.Month !== undefined && fields.Day !== undefined);
    return Q(RegulateISODate(fields.Year, fields.Month, fields.Day, overflow));
  }
  return Q(NonISOCalendarDateToISO(calendar, fields, overflow));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisomonthdaytoisoreferencedate */
export function NonISOMonthDayToISOReferenceDate(
  _calendar: CalendarType,
  _fields: CalendarFieldsRecord,
  _overflow: 'constrain' | 'reject',
): never {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdaytoisoreferencedate */
export function CalendarMonthDayToISOReferenceDate(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject',
): PlainCompletion<ISODateRecord> {
  if (calendar === 'iso8601') {
    Assert(fields.Month !== undefined && fields.Day !== undefined);
    const referenceISOYear = 1972n;
    const year = fields.Year === undefined ? referenceISOYear : fields.Year;
    const result = Q(RegulateISODate(year, fields.Month, fields.Day, overflow));
    return CreateISODateRecord(referenceISOYear, result.Month, result.Day);
  }
  return Q(NonISOMonthDayToISOReferenceDate(calendar, fields, overflow));
}


// NonISOCalendarISOToDate
/** https://tc39.es/proposal-temporal/#sec-temporal-nonisocalendarisotodate */
export function NonISOCalendarISOToDate(
  _calendar: CalendarType,
  _isoDate: ISODateRecord,
): CalendarDateRecord {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarisotodate */
export function CalendarISOToDate(
  calendar: CalendarType,
  isoDate: ISODateRecord,
): CalendarDateRecord {
  if (calendar === 'iso8601') {
    const inLeapYear = MathematicalInLeapYear(EpochTimeForYear(isoDate.Year)) === 1n;
    return {
      Era: undefined,
      EraYear: undefined,
      Year: isoDate.Year,
      Month: isoDate.Month,
      MonthCode: CreateMonthCode(isoDate.Month, false),
      Day: isoDate.Day,
      DayOfWeek: ISODayOfWeek(isoDate),
      DayOfYear: ISODayOfYear(isoDate),
      WeekOfYear: ISOWeekOfYear(isoDate),
      DaysInWeek: 7n,
      DaysInMonth: ISODaysInMonth(isoDate.Year, isoDate.Month),
      DaysInYear: MathematicalDaysInYear(isoDate.Year),
      MonthsInYear: 12n,
      InLeapYear: inLeapYear,
    };
  }
  return NonISOCalendarISOToDate(calendar, isoDate);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarextrafields */
export function CalendarExtraFields(
  calendar: CalendarType,
  _fields: readonly CalendarFieldsRecordEnumerationKey[],
): CalendarFieldsRecordEnumerationKey[] {
  if (calendar === 'iso8601') {
    return [];
  }
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisofieldkeystoignore */
export function NonISOFieldKeysToIgnore(
  _calendar: CalendarType,
  _keys: readonly CalendarFieldsRecordEnumerationKey[],
): CalendarFieldsRecordEnumerationKey[] {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarfieldkeystoignore */
export function CalendarFieldKeysToIgnore(
  calendar: CalendarType,
  keys: readonly CalendarFieldsRecordEnumerationKey[],
): CalendarFieldsRecordEnumerationKey[] {
  if (calendar === 'iso8601') {
    const ignoredKeys: CalendarFieldsRecordEnumerationKey[] = [];
    for (const key of keys) {
      ignoredKeys.push(key);
      if (key === 'month') {
        ignoredKeys.push('month-code');
      } else if (key === 'month-code') {
        ignoredKeys.push('month');
      }
    }
    return ignoredKeys;
  }
  return NonISOFieldKeysToIgnore(calendar, keys);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisoresolvefields */
export function NonISOResolveFields(
  _calendar: CalendarType,
  _fields: CalendarFieldsRecord,
  _type: 'date' | 'year-month' | 'month-day',
): CalendarFieldsRecord {
  mark_OtherCalendarNotImplemented();
  unreachable_OtherCalendarNotImplemented();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarresolvefields */
export function* CalendarResolveFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  type: 'date' | 'year-month' | 'month-day',
): PlainEvaluator<void> {
  if (calendar === 'iso8601') {
    let needsYear = false;
    if (type === 'date' || type === 'year-month') needsYear = true;
    let needsDay = false;
    if (type === 'date' || type === 'month-day') needsDay = true;

    if (needsYear && fields.Year === undefined) {
      return Throw.TypeError('"year" is required');
    }
    if (needsDay && fields.Day === undefined) {
      return Throw.TypeError('"day" is required');
    }
    if (fields.Month === undefined && fields.MonthCode === undefined) {
      return Throw.TypeError('"month-code" or "month" is required');
    }
    if (fields.MonthCode !== undefined) {
      const parsedMonthCode = X(ParseMonthCode(fields.MonthCode));
      if (parsedMonthCode.IsLeapMonth) return Throw.RangeError('Invalid leap month');
      const month = parsedMonthCode.MonthNumber;
      if (month > 12n) return Throw.RangeError('Invalid month');
      if (fields.Month !== undefined && fields.Month !== month) return Throw.RangeError('Mismatching month and month code');
      fields.Month = parsedMonthCode.MonthNumber;
    }
  } else {
    Q(NonISOResolveFields(calendar, fields, type));
  }
}
