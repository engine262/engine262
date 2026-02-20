import {
  CalendarDateAdd,
  CalendarDateFromFields,
  CalendarDateUntil,
  CalendarEquals,
  CalendarYearMonthFromFields,
  CanonicalizeCalendar,
  FormatCalendarAnnotation,
  GetTemporalCalendarIdentifierWithISODefault,
  PrepareCalendarFields,
  type CalendarType,
} from '../../abstract-ops/temporal/calendar.mts';
import { GetOptionsObject, GetUTCEpochNanoseconds, ToZeroPaddedDecimalString } from '../../abstract-ops/temporal/addition.mts';
import {
  GetDifferenceSettings, GetTemporalOverflowOption, ISODateToFields, TemporalUnit, type DateUnit,
} from '../../abstract-ops/temporal/temporal.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import {
  AdjustDateDurationRecord,
  CombineDateAndTimeDuration,
  CreateNegatedTemporalDuration,
  CreateTemporalDuration,
  RoundRelativeDuration,
  TemporalDurationFromInternal,
  ToInternalDurationRecord,
  ToTemporalDuration,
  type TemporalDurationObject,
  type TimeDuration,
} from './Duration.mts';
import { CombineISODateAndTimeRecord } from './PlainDateTime.mts';
import {
  CompareISODate, CreateISODateRecord, PadISOYear, type ISODateRecord,
} from './PlainDate.mts';
import { MidnightTimeRecord } from './PlainTime.mts';
import {
  JSStringValue,
  ObjectValue,
  OrdinaryCreateFromConstructor,
  Q,
  surroundingAgent,
  Throw,
  Value,
  X,
  type FunctionObject,
  type Mutable,
  type OrdinaryObject,
  type ValueEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainyearmonth-instances */
export interface TemporalPlainYearMonthObject extends OrdinaryObject {
  readonly InitializedTemporalYearMonth: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}

export function isTemporalPlainYearMonthObject(o: Value): o is TemporalPlainYearMonthObject {
  return 'InitializedTemporalYearMonth' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-year-month-records */
export interface ISOYearMonthRecord {
  readonly Year: number;
  readonly Month: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalyearmonth */
export function* ToTemporalYearMonth(
  item: Value,
  options: Value = Value.undefined,
): ValueEvaluator<TemporalPlainYearMonthObject> {
  if (item instanceof ObjectValue) {
    if (isTemporalPlainYearMonthObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalYearMonth(item.ISODate, item.Calendar));
    }
    const calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(item));
    const fields = Q(yield* PrepareCalendarFields(calendar, item, ['year', 'month', 'month-code'], [], []));
    const resolvedOptions = Q(GetOptionsObject(options));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    const isoDate = Q(yield* CalendarYearMonthFromFields(calendar, fields, overflow));
    return X(CreateTemporalYearMonth(isoDate, calendar));
  }
  if (!(item instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', item);
  }
  const result = Q(ParseISODateTime(item.stringValue(), ['TemporalYearMonthString']));
  const calendar = result.Calendar ?? 'iso8601';
  const calendarType = Q(CanonicalizeCalendar(calendar));
  const resolvedOptions = Q(GetOptionsObject(options));
  Q(yield* GetTemporalOverflowOption(resolvedOptions));
  let isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
  if (!ISOYearMonthWithinLimits(isoDate)) {
    return Throw.RangeError('PlainYearMonth out of range');
  }
  const result2 = ISODateToFields(calendarType, isoDate, 'year-month');
  isoDate = Q(yield* CalendarYearMonthFromFields(calendarType, result2, 'constrain'));
  return X(CreateTemporalYearMonth(isoDate, calendarType));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isoyearmonthwithinlimits */
export function ISOYearMonthWithinLimits(
  isoDate: ISODateRecord,
): boolean {
  if (isoDate.Year < -271821 || isoDate.Year > 275760) return false;
  if (isoDate.Year === -271821 && isoDate.Month < 4) return false;
  if (isoDate.Year === 275760 && isoDate.Month > 9) return false;
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisoyearmonth */
export function BalanceISOYearMonth(
  year: number,
  month: number,
): ISOYearMonthRecord {
  year += Math.floor((month - 1) / 12);
  month = ((month - 1) % 12) + 1;
  return {
    Year: year,
    Month: month,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalyearmonth */
export function* CreateTemporalYearMonth(
  isoDate: ISODateRecord,
  calendar: CalendarType,
  newTarget?: FunctionObject,
): ValueEvaluator<TemporalPlainYearMonthObject> {
  if (!ISOYearMonthWithinLimits(isoDate)) {
    return Throw.RangeError('PlainYearMonth out of range');
  }
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.PlainYearMonth%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.PlainYearMonth.prototype%', [
    'InitializedTemporalYearMonth',
    'ISODate',
    'Calendar',
  ])) as Mutable<TemporalPlainYearMonthObject>;
  object.ISODate = isoDate;
  object.Calendar = calendar;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalyearmonthtostring */
export function TemporalYearMonthToString(
  yearMonth: TemporalPlainYearMonthObject,
  showCalendar: 'auto' | 'always' | 'never' | 'critical',
): string {
  const year = PadISOYear(yearMonth.ISODate.Year);
  const month = ToZeroPaddedDecimalString(yearMonth.ISODate.Month, 2);
  let result = `${year}-${month}`;
  if (showCalendar === 'always' || showCalendar === 'critical' || yearMonth.Calendar !== 'iso8601') {
    const day = ToZeroPaddedDecimalString(yearMonth.ISODate.Day, 2);
    result = `${result}-${day}`;
  }
  const calendarString = FormatCalendarAnnotation(yearMonth.Calendar, showCalendar);
  return result + calendarString;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplainyearmonth */
export function* DifferenceTemporalPlainYearMonth(
  operation: 'since' | 'until',
  yearMonth: TemporalPlainYearMonthObject,
  _other: Value,
  options: Value,
): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalYearMonth(_other));
  const calendar = yearMonth.Calendar;
  if (!CalendarEquals(calendar, other.Calendar)) {
    return Throw.RangeError('PlainYearMonth calendars do not match');
  }
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(
    operation,
    resolvedOptions,
    'date',
    [TemporalUnit.Week, TemporalUnit.Day],
    TemporalUnit.Month,
    TemporalUnit.Year,
  ));
  if (CompareISODate(yearMonth.ISODate, other.ISODate) === 0) {
    return X(CreateTemporalDuration(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
  }
  const thisFields = ISODateToFields(calendar, yearMonth.ISODate, 'year-month');
  thisFields.Day = 1;
  const thisDate = Q(yield* CalendarDateFromFields(calendar, thisFields, 'constrain'));
  const otherFields = ISODateToFields(calendar, other.ISODate, 'year-month');
  otherFields.Day = 1;
  const otherDate = Q(yield* CalendarDateFromFields(calendar, otherFields, 'constrain'));
  // TODO(temporal): unsafe cast of settings.LargestUnit
  const dateDifference = CalendarDateUntil(calendar, thisDate, otherDate, settings.LargestUnit as DateUnit);
  const yearsMonthsDifference = X(AdjustDateDurationRecord(dateDifference, 0, 0));
  let duration = CombineDateAndTimeDuration(yearsMonthsDifference, 0 as TimeDuration);
  if (settings.SmallestUnit !== TemporalUnit.Month || settings.RoundingIncrement !== 1) {
    const isoDateTime = CombineISODateAndTimeRecord(thisDate, MidnightTimeRecord());
    const originEpochNs = GetUTCEpochNanoseconds(isoDateTime);
    const isoDateTimeOther = CombineISODateAndTimeRecord(otherDate, MidnightTimeRecord());
    const destEpochNs = GetUTCEpochNanoseconds(isoDateTimeOther);
    duration = Q(RoundRelativeDuration(
      duration,
      originEpochNs,
      destEpochNs,
      isoDateTime,
      undefined,
      calendar,
      settings.LargestUnit,
      settings.RoundingIncrement,
      settings.SmallestUnit,
      settings.RoundingMode,
    ));
  }
  let result = X(TemporalDurationFromInternal(duration, TemporalUnit.Day));
  if (operation === 'since') {
    result = CreateNegatedTemporalDuration(result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoyearmonth */
export function* AddDurationToYearMonth(
  operation: 'add' | 'subtract',
  yearMonth: TemporalPlainYearMonthObject,
  temporalDurationLike: Value,
  options: Value,
): ValueEvaluator<TemporalPlainYearMonthObject> {
  let duration = Q(yield* ToTemporalDuration(temporalDurationLike));
  if (operation === 'subtract') {
    duration = CreateNegatedTemporalDuration(duration);
  }
  const internalDuration = ToInternalDurationRecord(duration);
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const durationToAdd = internalDuration.Date;
  if (durationToAdd.Weeks !== 0 || durationToAdd.Days !== 0 || internalDuration.Time !== 0) {
    return Throw.RangeError('Invalid duration');
  }
  const calendar = yearMonth.Calendar;
  const fields = ISODateToFields(calendar, yearMonth.ISODate, 'year-month');
  fields.Day = 1;
  const date = Q(yield* CalendarDateFromFields(calendar, fields, 'constrain'));
  const addedDate = Q(CalendarDateAdd(calendar, date, durationToAdd, overflow));
  const addedDateFields = ISODateToFields(calendar, addedDate, 'year-month');
  const isoDate = Q(yield* CalendarYearMonthFromFields(calendar, addedDateFields, overflow));
  return X(CreateTemporalYearMonth(isoDate, calendar));
}
