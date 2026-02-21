import type { TemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import { type ISODateRecord, type TemporalPlainDateObject, isTemporalPlainDateObject } from '../../intrinsics/Temporal/PlainDate.mts';
import { isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import { abs } from '../math.mts';
import { GetOptionsObject, GetUTCEpochNanoseconds, ToZeroPaddedDecimalString } from './addition.mts';
import {
  Assert, type CalendarType, type FunctionObject, type ValueEvaluator, Throw, surroundingAgent, Q, OrdinaryCreateFromConstructor, type Mutable, Value, ObjectValue, GetTemporalOverflowOption, X, GetISODateTimeFor, GetTemporalCalendarIdentifierWithISODefault, PrepareCalendarFields, CalendarDateFromFields, JSStringValue, CanonicalizeCalendar, CalendarISOToDate, type PlainCompletion, ISODaysInMonth, ISODateToEpochDays, EpochDaysToEpochMs, EpochTimeToEpochYear, EpochTimeToMonthInYear, EpochTimeToDate, FormatCalendarAnnotation, CalendarEquals, GetDifferenceSettings, TemporalUnit, CreateTemporalDuration, CalendarDateUntil, type DateUnit, CombineDateAndTimeDuration, type TimeDuration, RoundRelativeDuration, TemporalDurationFromInternal, CreateNegatedTemporalDuration, ToTemporalDuration, ToDateDurationRecordWithoutTime, CalendarDateAdd,
  BalanceISOYearMonth,
  MidnightTimeRecord,
  NoonTimeRecord,
  CombineISODateAndTimeRecord,
  ISODateTimeWithinLimits,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-temporal-create-iso-date-record */
export function CreateISODateRecord(y: number, m: number, d: number): ISODateRecord {
  Assert(IsValidISODate(y, m, d));
  return { Year: y, Month: m, Day: d };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldate */
export function* CreateTemporalDate(isoDate: ISODateRecord, calendar: CalendarType, NewTarget?: FunctionObject): ValueEvaluator<TemporalPlainDateObject> {
  if (!ISODateWithinLimits(isoDate)) {
    return Throw.RangeError('$1-$2-$3 is not a valid date', isoDate.Year, isoDate.Month, isoDate.Day);
  }
  if (NewTarget === undefined) {
    NewTarget = surroundingAgent.intrinsic('%Temporal.PlainDate%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%Temporal.PlainDate.prototype%', [
    'InitializedTemporalDate',
    'ISODate',
    'Calendar',
  ])) as Mutable<TemporalPlainDateObject>;
  object.ISODate = isoDate;
  object.Calendar = calendar;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate */
export function* ToTemporalDate(item: Value, options: Value = Value.undefined): ValueEvaluator<TemporalPlainDateObject> {
  if (item instanceof ObjectValue) {
    if (isTemporalPlainDateObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDate(item.ISODate, item.Calendar));
    }
    if (isTemporalZonedDateTimeObject(item)) {
      const isoDateTime = GetISODateTimeFor(item.TimeZone, item.EpochNanoseconds);
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDate(isoDateTime.ISODate, item.Calendar));
    }
    if (isTemporalPlainDateTimeObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDate(item.ISODateTime.ISODate, item.Calendar));
    }
    const calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(item));
    const fields = Q(yield* PrepareCalendarFields(calendar, item, ['year', 'month', 'month-code', 'day'], [], []));
    const resolvedOptions = Q(GetOptionsObject(options));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    const isoDate = Q(yield* CalendarDateFromFields(calendar, fields, overflow));
    return X(CreateTemporalDate(isoDate, calendar));
  }
  if (!(item instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', item);
  }
  const result = Q(ParseISODateTime(item.stringValue(), ['TemporalDateTimeString[~Zoned]']));
  const calendar = result.Calendar ?? 'iso8601';
  const calendarType = Q(CanonicalizeCalendar(calendar));
  const resolvedOptions = Q(GetOptionsObject(options));
  Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
  return X(CreateTemporalDate(isoDate, calendarType));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-comparesurpasses */
export function CompareSurpasses(sign: 1 | -1, year: number, monthOrCode: number | string, day: number, target: { Year: number; Month: number; MonthCode: string; Day: number }): boolean {
  if (year !== target.Year) {
    if (sign * (year - target.Year) > 0) {
      return true;
    }
  } else if (typeof monthOrCode === 'string' && monthOrCode !== target.MonthCode) {
    if (sign > 0) {
      // If monthOrCode is lexicographically greater than target.[[MonthCode]], return true.
      if (monthOrCode > target.MonthCode) {
        return true;
      }
    } else if (target.MonthCode > monthOrCode) {
      // If target.[[MonthCode]] is lexicographically greater than monthOrCode, return true.
      return true;
    }
  } else if (typeof monthOrCode === 'number' && monthOrCode !== target.Month) {
    if (sign * (monthOrCode - target.Month) > 0) {
      return true;
    }
  } else if (day !== target.Day) {
    if (sign * (day - target.Day) > 0) {
      return true;
    }
  }
  return false;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatesurpasses */
export function ISODateSurpasses(sign: 1 | -1, baseDate: ISODateRecord, isoDate2: ISODateRecord, years: number, month: number, weeks: number, days: number): boolean {
  const parts = CalendarISOToDate('iso8601', baseDate);
  const target = CalendarISOToDate('iso8601', isoDate2);
  const y0 = parts.Year + years;
  if (CompareSurpasses(sign, y0, parts.MonthCode, parts.Day, target)) {
    return true;
  }
  if (month === 0) {
    return false;
  }
  const m0 = parts.Month + month;
  const monthsAdded = BalanceISOYearMonth(y0, m0);
  if (CompareSurpasses(sign, monthsAdded.Year, monthsAdded.Month, parts.Day, target)) {
    return true;
  }
  if (weeks === 0 && days === 0) {
    return false;
  }
  const regulatedDate = X(RegulateISODate(monthsAdded.Year, monthsAdded.Month, parts.Day, 'constrain'));
  const daysInWeek = 7;
  const balancedDate = AddDaysToISODate(regulatedDate, daysInWeek * weeks + days);
  return CompareSurpasses(sign, balancedDate.Year, balancedDate.Month, balancedDate.Day, target);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-regulateisodate */
export function RegulateISODate(year: number, month: number, day: number, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord> {
  if (overflow === 'constrain') {
    month = Math.max(1, Math.min(12, month));
    const daysInMonth = ISODaysInMonth(year, month);
    day = Math.max(1, Math.min(daysInMonth, day));
  } else {
    Assert(overflow === 'reject');
    if (!IsValidISODate(year, month, day)) {
      return Throw.RangeError('$1-$2-$3 is not a valid date', year, month, day);
    }
  }
  return CreateISODateRecord(year, month, day);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidisodate */
export function IsValidISODate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  const daysInMonth = ISODaysInMonth(year, month);
  if (day < 1 || day > daysInMonth) {
    return false;
  }
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddaystoisodate */
export function AddDaysToISODate(isoDate: ISODateRecord, days: number): ISODateRecord {
  const epochDays = ISODateToEpochDays(isoDate.Year, isoDate.Month - 1, isoDate.Day) + days;
  const ms = EpochDaysToEpochMs(epochDays, 0);
  return CreateISODateRecord(EpochTimeToEpochYear(ms), EpochTimeToMonthInYear(ms) + 1, EpochTimeToDate(ms));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-padisoyear */
export function PadISOYear(y: number): string {
  if (y >= 0 && y <= 9999) {
    return ToZeroPaddedDecimalString(y, 4);
  }
  const yearSign = y > 0 ? '+' : '-';
  const year = ToZeroPaddedDecimalString(abs(y), 6);
  return yearSign + year;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldatetostring */
export function TemporalDateToString(temporalDate: TemporalPlainDateObject, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string {
  const year = PadISOYear(temporalDate.ISODate.Year);
  const month = ToZeroPaddedDecimalString(temporalDate.ISODate.Month, 2);
  const day = ToZeroPaddedDecimalString(temporalDate.ISODate.Day, 2);
  const calendar = FormatCalendarAnnotation(temporalDate.Calendar, showCalendar);
  return `${year}-${month}-${day}${calendar}`;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatewithinlimits */
export function ISODateWithinLimits(isoDate: ISODateRecord): boolean {
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, NoonTimeRecord());
  return ISODateTimeWithinLimits(isoDateTime);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodate */
export function CompareISODate(isoDate1: ISODateRecord, isoDate2: ISODateRecord): 1 | -1 | 0 {
  if (isoDate1.Year > isoDate2.Year) return 1;
  if (isoDate1.Year < isoDate2.Year) return -1;
  if (isoDate1.Month > isoDate2.Month) return 1;
  if (isoDate1.Month < isoDate2.Month) return -1;
  if (isoDate1.Day > isoDate2.Day) return 1;
  if (isoDate1.Day < isoDate2.Day) return -1;
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindate */
export function* DifferenceTemporalPlainDate(operation: 'since' | 'until', temporalDate: TemporalPlainDateObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalDate(_other));
  if (!CalendarEquals(temporalDate.Calendar, other.Calendar)) {
    return Throw.RangeError('Calendars are not equal');
  }
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(operation, resolvedOptions, 'date', [], TemporalUnit.Day, TemporalUnit.Day));
  if (CompareISODate(temporalDate.ISODate, other.ISODate) === 0) {
    return X(CreateTemporalDuration(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
  }
  const dateDifference = CalendarDateUntil(temporalDate.Calendar, temporalDate.ISODate, other.ISODate, settings.LargestUnit as DateUnit);
  let duration = CombineDateAndTimeDuration(dateDifference, 0 as TimeDuration);
  if (settings.SmallestUnit !== TemporalUnit.Day || settings.RoundingIncrement !== 1) {
    const isoDateTime = CombineISODateAndTimeRecord(temporalDate.ISODate, MidnightTimeRecord());
    const originEpochNs = GetUTCEpochNanoseconds(isoDateTime);
    const isoDateTimeOther = CombineISODateAndTimeRecord(other.ISODate, MidnightTimeRecord());
    const destEpochNs = GetUTCEpochNanoseconds(isoDateTimeOther);
    duration = Q(RoundRelativeDuration(duration, originEpochNs, destEpochNs, isoDateTime, undefined, temporalDate.Calendar, settings.LargestUnit, settings.RoundingIncrement, settings.SmallestUnit, settings.RoundingMode));
  }
  let result = X(TemporalDurationFromInternal(duration, TemporalUnit.Day));
  if (operation === 'since') {
    result = CreateNegatedTemporalDuration(result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodate */
export function* AddDurationToDate(operation: 'add' | 'subtract', temporalDate: TemporalPlainDateObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateObject> {
  const calendar = temporalDate.Calendar;
  let duration = Q(yield* ToTemporalDuration(temporalDurationLike));
  if (operation === 'subtract') {
    duration = CreateNegatedTemporalDuration(duration);
  }
  const dateDuration = ToDateDurationRecordWithoutTime(duration);
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const result = Q(CalendarDateAdd(calendar, temporalDate.ISODate, dateDuration, overflow));
  return X(CreateTemporalDate(result, calendar));
}
