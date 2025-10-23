import { CreateDateDurationRecord, ZeroDateDuration, type DateDurationRecord } from '../../intrinsics/Temporal/Duration.mts';
import {
  BalanceISODate, CompareISODate, CreateISODateRecord, ISODateSurpasses, ISODateWithinLimits, isTemporalPlainDateObject, RegulateISODate, type ISODateRecord,
} from '../../intrinsics/Temporal/PlainDate.mts';
import { CanonicalizeUValue } from '../../ecma402/not-implemented.mts';
import { __ts_cast__, isArray, type Mutable } from '../../helpers.mts';
import { BalanceISOYearMonth, isTemporalPlainYearMonthObject } from '../../intrinsics/Temporal/PlainYearMonth.mts';
import { ParseMonthCode, ParseTemporalCalendarString } from '../../parser/TemporalParser.mts';
import { isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { isTemporalPlainMonthDayObject } from '../../intrinsics/Temporal/PlainMonthDay.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
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
  ToIntegerWithTruncation, ToOffsetString, ToPositiveIntegerWithTruncation, type DateUnit,
} from './temporal.mts';
import { ToTemporalTimeZoneIdentifier } from './time-zone.mts';
import { unreachable_UnsupportedCalendar } from './extra-calendar.mts';
import {
  Assert,
  F,
  Get,
  JSStringValue,
  NumberValue,
  ObjectValue,
  Q,
  R,
  surroundingAgent,
  ToString,
  Value,
  X,
  type PlainCompletion, type PlainEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-calendar-types */
export type CalendarType = 'iso8601';

/** https://tc39.es/proposal-temporal/#sec-temporal-canonicalizecalendar */
export function CanonicalizeCalendar(id: string): PlainCompletion<CalendarType> {
  const calendars = AvailableCalendars();
  if (!calendars.includes(id.toLowerCase() as CalendarType)) {
    return surroundingAgent.Throw('RangeError', 'InvalidCalendar', id);
  }
  return CanonicalizeUValue('ca', id) as CalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-availablecalendars */
export function AvailableCalendars(): CalendarType[] {
  return ['iso8601'];
}

export type MonthCode = string & { __brand: 'MonthCode' };

/** https://tc39.es/proposal-temporal/#sec-temporal-createmonthcode */
export declare function CreateMonthCode(monthNumber: number, isLeapMonth: boolean): MonthCode;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendar-date-records */
export interface CalendarDateRecord {
  readonly Era: string | undefined;
  readonly EraYear: number | undefined;
  readonly Year: number;
  readonly Month: number;
  readonly MonthCode: string;
  readonly Day: number;
  readonly DayOfWeek: number;
  readonly DayOfYear: number;
  readonly WeekOfYear: YearWeekRecord;
  readonly DaysInWeek: number;
  readonly DaysInMonth: number;
  readonly DaysInYear: number;
  readonly MonthsInYear: number;
  readonly InLeapYear: boolean;
}

/** https://tc39.es/proposal-temporal/#table-temporal-calendar-fields-record-fields */
export interface CalendarFieldsRecord {
  readonly Era: string | undefined;
  readonly EraYear: number | undefined;
  Year: number | undefined;
  Month: number | undefined;
  MonthCode: string | undefined;
  Day: number | undefined;
  readonly Hour: number | undefined;
  readonly Minute: number | undefined;
  readonly Second: number | undefined;
  readonly Millisecond: number | undefined;
  readonly Microsecond: number | undefined;
  readonly Nanosecond: number | undefined;
  readonly OffsetString: string | undefined;
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

export type CalendarFieldsRecordEnumerationKey = 'era' | 'era-year' | 'year' | 'month' | 'month-code' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond' | 'offset-string' | 'time-zone';

export const Table19_CalendarFieldsRecordFields = [
  /* eslint-disable object-curly-newline */
  { FieldName: 'Era', DefaultValue: undefined, PropertyKey: 'era', EnumerationKey: 'era', Conversion: Table19_Conversion.ToString },
  { FieldName: 'EraYear', DefaultValue: undefined, PropertyKey: 'eraYear', EnumerationKey: 'era-year', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Year', DefaultValue: undefined, PropertyKey: 'year', EnumerationKey: 'year', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Month', DefaultValue: undefined, PropertyKey: 'month', EnumerationKey: 'month', Conversion: Table19_Conversion.ToPositiveIntegerWithTruncation },
  { FieldName: 'MonthCode', DefaultValue: undefined, PropertyKey: 'monthCode', EnumerationKey: 'month-code', Conversion: Table19_Conversion.ToMonthCode },
  { FieldName: 'Day', DefaultValue: undefined, PropertyKey: 'day', EnumerationKey: 'day', Conversion: Table19_Conversion.ToPositiveIntegerWithTruncation },
  { FieldName: 'Hour', DefaultValue: 0, PropertyKey: 'hour', EnumerationKey: 'hour', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Minute', DefaultValue: 0, PropertyKey: 'minute', EnumerationKey: 'minute', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Second', DefaultValue: 0, PropertyKey: 'second', EnumerationKey: 'second', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Millisecond', DefaultValue: 0, PropertyKey: 'millisecond', EnumerationKey: 'millisecond', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Microsecond', DefaultValue: 0, PropertyKey: 'microsecond', EnumerationKey: 'microsecond', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'Nanosecond', DefaultValue: 0, PropertyKey: 'nanosecond', EnumerationKey: 'nanosecond', Conversion: Table19_Conversion.ToIntegerWithTruncation },
  { FieldName: 'OffsetString', DefaultValue: undefined, PropertyKey: 'offsetString', EnumerationKey: 'offset-string', Conversion: Table19_Conversion.ToOffsetString },
  { FieldName: 'TimeZone', DefaultValue: undefined, PropertyKey: 'timeZone', EnumerationKey: 'time-zone', Conversion: Table19_Conversion.ToTemporalTimeZoneIdentifier },
  /* eslint-enable object-curly-newline */
] as const satisfies {
  FieldName: keyof CalendarFieldsRecord;
  DefaultValue: string | number | undefined;
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
  const sortedPropertyNames = [...Table19_CalendarFieldsRecordFields].sort((a, b) => (a.PropertyKey < b.PropertyKey ? -1 : 1));

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
        value = F(Q(yield* ToIntegerWithTruncation(value)));
      } else if (Conversion === Table19_Conversion.ToPositiveIntegerWithTruncation) {
        value = F(Q(yield* ToPositiveIntegerWithTruncation(value)));
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

      let assignValue;
      if (value instanceof NumberValue) {
        assignValue = R(value);
      } else if (value instanceof JSStringValue) {
        assignValue = value.stringValue();
      }
      if (assignValue === undefined) {
        throw new Error('invalid type');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[FieldName] = assignValue as any;
    } else if (isArray(requiredFieldNames)) {
      if (requiredFieldNames.includes(key)) {
        return surroundingAgent.Throw('TypeError', 'MissingRequiredField', key);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[FieldName] = DefaultValue as any;
    }
  }

  if (requiredFieldNames === 'partial' && !any) {
    return surroundingAgent.Throw('TypeError', 'NoFieldsPresent');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarfieldkeyspresent */
export function CalendarFieldKeysPresent(fields: CalendarFieldsRecord): CalendarFieldsRecordEnumerationKey[] {
  const list: CalendarFieldsRecordEnumerationKey[] = [];
  for (const { FieldName, EnumerationKey } of Table19_CalendarFieldsRecordFields) {
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
  for (const { EnumerationKey, FieldName } of Table19_CalendarFieldsRecordFields) {
    const key = EnumerationKey;
    if (fieldsKeys.includes(key) && !overriddenKeys.includes(key)) {
      const propValue = fields[FieldName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      merged[FieldName] = propValue as any;
    }
    if (additionalKeys.includes(key)) {
      const propValue = additionalFields[FieldName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      merged[FieldName] = propValue as any;
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
  unreachable_UnsupportedCalendar();
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
    const intermediate = Q(BalanceISOYearMonth(isoDate.Year + duration.Years, isoDate.Month + duration.Months));
    const regulated = Q(RegulateISODate(intermediate.Year, intermediate.Month, isoDate.Day, overflow));
    const d = regulated.Day + duration.Days + 7 * duration.Weeks;
    result = Q(BalanceISODate(regulated.Year, regulated.Month, d));
  } else {
    result = Q(NonISODateAdd(calendar, isoDate, duration, overflow));
  }
  if (!ISODateWithinLimits(result)) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', 'ISODate');
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
  unreachable_UnsupportedCalendar();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateuntil */
export function CalendarDateUntil(
  calendar: CalendarType,
  one: ISODateRecord,
  two: ISODateRecord,
  largestUnit: DateUnit,
): DateDurationRecord {
  if (calendar === 'iso8601') {
    const sign = -CompareISODate(one, two) as 1 | -1 | 0;
    if (sign === 0) {
      return ZeroDateDuration();
    }
    let years = 0;
    if (largestUnit === TemporalUnit.Year) {
      let candidateYears = sign;
      while (!ISODateSurpasses(sign, one, two, candidateYears, 0, 0, 0)) {
        years = candidateYears;
        candidateYears += sign;
      }
    }
    let months = 0;
    if (largestUnit === TemporalUnit.Month) {
      let candidateMonths = sign;
      while (!ISODateSurpasses(sign, one, two, years, candidateMonths, 0, 0)) {
        months = candidateMonths;
        candidateMonths += sign;
      }
    }
    let weeks = 0;
    if (largestUnit === TemporalUnit.Week) {
      let candidateWeeks = sign;
      while (!ISODateSurpasses(sign, one, two, years, months, candidateWeeks, 0)) {
        weeks = candidateWeeks;
        candidateWeeks += sign;
      }
    }
    let days = 0;
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
    return surroundingAgent.Throw('TypeError', 'NotAString', temporalCalendarLike);
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
    return surroundingAgent.Throw('RangeError', 'OutOfRange', 'ISODate');
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
  const firstDayIndex = 1;
  fields.Day = firstDayIndex;
  const result = Q(CalendarDateToISO(calendar, fields, overflow));
  if (!ISODateWithinLimits(result)) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', 'ISODate');
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
    return surroundingAgent.Throw('RangeError', 'OutOfRange', 'ISODate');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-formatcalendarannotation */
export function FormatCalendarAnnotation(
  id: CalendarType,
  showCalendar: 'auto' | 'always' | 'never' | 'critical',
): string {
  if (showCalendar === 'never') {
    return '';
  }
  if (showCalendar === 'auto' && id === 'iso8601') {
    return '';
  }
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
export function ISODaysInMonth(year: number, month: number): number {
  if (month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12) {
    return 31;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  Assert(month === 2);
  return 28 + MathematicalInLeapYear(EpochTimeForYear(year));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isoweekofyear */
export function ISOWeekOfYear(isoDate: ISODateRecord): YearWeekRecord {
  const year = isoDate.Year;
  const wednesday = 3;
  const thursday = 4;
  const friday = 5;
  const saturday = 6;
  const daysInWeek = 7;
  const maxWeekNumber = 53;
  const dayOfYear = ISODayOfYear(isoDate);
  const dayOfWeek = ISODayOfWeek(isoDate);
  const week = Math.floor((dayOfYear + daysInWeek - dayOfWeek + wednesday) / daysInWeek);
  if (week < 1) {
    // NOTE: This is the last week of the previous year.
    const jan1st = CreateISODateRecord(year, 1, 1);
    const dayOfJan1st = ISODayOfWeek(jan1st);
    if (dayOfJan1st === friday) {
      return { Week: maxWeekNumber, Year: year - 1 };
    }
    if (dayOfJan1st === saturday && MathematicalInLeapYear(EpochTimeForYear(year - 1)) === 1) {
      return { Week: maxWeekNumber, Year: year - 1 };
    }
    return { Week: maxWeekNumber - 1, Year: year - 1 };
  }
  if (week === maxWeekNumber) {
    const daysInYear = MathematicalDaysInYear(year);
    const daysLaterInYear = daysInYear - dayOfYear;
    const daysAfterThursday = thursday - dayOfWeek;
    if (daysLaterInYear < daysAfterThursday) {
      return { Week: 1, Year: year + 1 };
    }
  }
  return { Week: week, Year: year };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofyear */
export function ISODayOfYear(isoDate: ISODateRecord): number {
  const epochDays = ISODateToEpochDays(isoDate.Year, isoDate.Month - 1, isoDate.Day);
  return EpochTimeToDayInYear(EpochDaysToEpochMs(epochDays, 0)) + 1;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofweek */
export function ISODayOfWeek(isoDate: ISODateRecord): number {
  const epochDays = ISODateToEpochDays(isoDate.Year, isoDate.Month - 1, isoDate.Day);
  const dayOfWeek = EpochTimeToWeekDay(EpochDaysToEpochMs(epochDays, 0));
  if (dayOfWeek === 0) {
    return 7;
  }
  return dayOfWeek;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisocalendardatetoiso */
export function NonISOCalendarDateToISO(
  _calendar: CalendarType,
  _fields: CalendarFieldsRecord,
  _overflow: 'constrain' | 'reject',
): PlainCompletion<ISODateRecord> {
  unreachable_UnsupportedCalendar();
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
  unreachable_UnsupportedCalendar();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdaytoisoreferencedate */
export function CalendarMonthDayToISOReferenceDate(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject',
): PlainCompletion<ISODateRecord> {
  if (calendar === 'iso8601') {
    Assert(fields.Month !== undefined && fields.Day !== undefined);
    const referenceISOYear = 1972;
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
  unreachable_UnsupportedCalendar();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarisotodate */
export function CalendarISOToDate(
  calendar: CalendarType,
  isoDate: ISODateRecord,
): CalendarDateRecord {
  if (calendar === 'iso8601') {
    const inLeapYear = MathematicalInLeapYear(EpochTimeForYear(isoDate.Year)) === 1;
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
      DaysInWeek: 7,
      DaysInMonth: ISODaysInMonth(isoDate.Year, isoDate.Month),
      DaysInYear: MathematicalDaysInYear(isoDate.Year),
      MonthsInYear: 12,
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
  unreachable_UnsupportedCalendar();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisofieldkeystoignore */
export function NonISOFieldKeysToIgnore(
  _calendar: CalendarType,
  _keys: readonly CalendarFieldsRecordEnumerationKey[],
): CalendarFieldsRecordEnumerationKey[] {
  unreachable_UnsupportedCalendar();
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
  unreachable_UnsupportedCalendar();
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarresolvefields */
export function* CalendarResolveFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  type: 'date' | 'year-month' | 'month-day',
): PlainEvaluator<void> {
  if (calendar === 'iso8601') {
    if ((type === 'date' || type === 'year-month') && fields.Year === undefined) {
      return surroundingAgent.Throw('TypeError', 'MissingRequiredField', 'year');
    }
    if ((type === 'date' || type === 'month-day') && fields.Day === undefined) {
      return surroundingAgent.Throw('TypeError', 'MissingRequiredField', 'day');
    }
    const month = fields.Month;
    const monthCode = fields.MonthCode;
    if (monthCode === undefined) {
      if (month === undefined) {
        return surroundingAgent.Throw('TypeError', 'MissingRequiredField', 'month-code or month');
      }
    }
    Assert(typeof monthCode === 'string');
    const parsedMonthCode = Q(yield* ParseMonthCode(monthCode));
    if (parsedMonthCode.IsLeapMonth) {
      return surroundingAgent.Throw('RangeError', 'InvalidLeapMonth');
    }
    if (parsedMonthCode.MonthNumber > 12) {
      return surroundingAgent.Throw('RangeError', 'InvalidMonth');
    }
    if (month !== undefined && month !== parsedMonthCode.MonthNumber) {
      return surroundingAgent.Throw('RangeError', 'InvalidMonth');
    }
    fields.Month = parsedMonthCode.MonthNumber;
  } else {
    Q(NonISOResolveFields(calendar, fields, type));
  }
}
