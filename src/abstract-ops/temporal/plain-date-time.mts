import type { TemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import { type ISODateRecord, isTemporalPlainDateObject } from '../../intrinsics/Temporal/PlainDate.mts';
import { type ISODateTimeRecord, type TemporalPlainDateTimeObject, isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import { abs } from '../math.mts';
import {
  GetOptionsObject,
  GetUTCEpochNanoseconds, ToZeroPaddedDecimalString, type RoundingMode,
} from './addition.mts';
import {
  CreateISODateRecord, R, YearFromTime, MonthFromTime, DateFromTime, CreateTimeRecord, HourFromTime, MinFromTime, SecFromTime, msFromTime, type TimeRecord, ISODateToEpochDays, nsMinInstant, nsPerDay, nsMaxInstant, type CalendarType, type CalendarFieldsRecord, type PlainEvaluator, Q, CalendarDateFromFields, RegulateTime, Value, ObjectValue, GetTemporalOverflowOption, X, GetISODateTimeFor, MidnightTimeRecord, GetTemporalCalendarIdentifierWithISODefault, PrepareCalendarFields, JSStringValue, Throw, CanonicalizeCalendar, BalanceTime, AddDaysToISODate, type FunctionObject, surroundingAgent, OrdinaryCreateFromConstructor, type Mutable, PadISOYear, FormatTimeString, FormatCalendarAnnotation, CompareISODate, CompareTimeRecord, type TimeUnit, TemporalUnit, Assert, RoundTime, type InternalDurationRecord, DifferenceTime, TimeDurationSign, Add24HourDaysToTimeDuration, LargerOfTwoTemporalUnits, CalendarDateUntil, type DateUnit, CombineDateAndTimeDuration, type PlainCompletion, ZeroDateDuration, type TimeDuration, RoundRelativeDuration, TotalRelativeDuration, type ValueEvaluator, CalendarEquals, GetDifferenceSettings, CreateTemporalDuration, TemporalDurationFromInternal, CreateNegatedTemporalDuration, ToTemporalDuration, ToInternalDurationRecordWith24HourDays, AddTime, AdjustDateDurationRecord, CalendarDateAdd,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-temporal-timevaluetoisodatetimerecord */
export function TimeValueToISODateTimeRecord(t: number): ISODateTimeRecord {
  const isoDate = CreateISODateRecord(
    R(YearFromTime(t)),
    R(MonthFromTime(t)) + 1,
    R(DateFromTime(t)),
  );
  const time = CreateTimeRecord(R(HourFromTime(t)), R(MinFromTime(t)), R(SecFromTime(t)), R(msFromTime(t)), 0, 0);
  return { ISODate: isoDate, Time: time };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-combineisodateandtimerecord */
export function CombineISODateAndTimeRecord(isoDate: ISODateRecord, time: TimeRecord): ISODateTimeRecord {
  return { ISODate: isoDate, Time: time };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetimewithinlimits */
export function ISODateTimeWithinLimits(isoDateTime: ISODateTimeRecord): boolean {
  if (abs(ISODateToEpochDays(isoDateTime.ISODate.Year, isoDateTime.ISODate.Month - 1, isoDateTime.ISODate.Day)) > 1e8 + 1) {
    return false;
  }
  const ns = GetUTCEpochNanoseconds(isoDateTime);
  if (ns <= nsMinInstant - nsPerDay) {
    return false;
  }
  if (ns >= nsMaxInstant + nsPerDay) {
    return false;
  }
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-interprettemporaldatetimefields */
export function* InterpretTemporalDateTimeFields(calendar: CalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainEvaluator<ISODateTimeRecord> {
  const isoDate = Q(yield* CalendarDateFromFields(calendar, fields, overflow));
  const time = Q(RegulateTime(fields.Hour!, fields.Minute!, fields.Second!, fields.Millisecond!, fields.Microsecond!, fields.Nanosecond!, overflow));
  return CombineISODateAndTimeRecord(isoDate, time);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime */
export function* ToTemporalDateTime(item: Value, options: Value = Value.undefined): PlainEvaluator<TemporalPlainDateTimeObject> {
  if (item instanceof ObjectValue) {
    if (isTemporalPlainDateTimeObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDateTime(item.ISODateTime, item.Calendar));
    }
    if (isTemporalZonedDateTimeObject(item)) {
      const isoDateTime = GetISODateTimeFor(item.TimeZone, item.EpochNanoseconds);
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDateTime(isoDateTime, item.Calendar));
    }
    if (isTemporalPlainDateObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      const isoDateTime = CombineISODateAndTimeRecord(item.ISODate, MidnightTimeRecord());
      return Q(yield* CreateTemporalDateTime(isoDateTime, item.Calendar));
    }
    const calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(item));
    const fields = Q(yield* PrepareCalendarFields(calendar, item, ['year', 'month', 'month-code', 'day'], ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'], []));
    const resolvedOptions = Q(GetOptionsObject(options));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    const result = Q(yield* InterpretTemporalDateTimeFields(calendar, fields, overflow));
    return Q(yield* CreateTemporalDateTime(result, calendar));
  }
  if (!(item instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', item);
  }
  const result = Q(ParseISODateTime(item.stringValue(), ['TemporalDateTimeString[~Zoned]']));
  const time = result.Time === 'start-of-day' ? MidnightTimeRecord() : result.Time;
  const calendar = result.Calendar ?? 'iso8601';
  const calendarType = Q(CanonicalizeCalendar(calendar));
  const resolvedOptions = Q(GetOptionsObject(options));
  Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, time);
  return Q(yield* CreateTemporalDateTime(isoDateTime, calendarType));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisodatetime */
export function BalanceISODateTime(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number): ISODateTimeRecord {
  const balancedTime = BalanceTime(hour, minute, second, millisecond, microsecond, nanosecond);
  const balancedDate = AddDaysToISODate(CreateISODateRecord(year, month, day), balancedTime.Days);
  return CombineISODateAndTimeRecord(balancedDate, balancedTime);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldatetime */
export function* CreateTemporalDateTime(isoDateTime: ISODateTimeRecord, calendar: CalendarType, newTarget?: FunctionObject): PlainEvaluator<TemporalPlainDateTimeObject> {
  if (!ISODateTimeWithinLimits(isoDateTime)) {
    return Throw.RangeError('PlainDateTime outside of range');
  }
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.PlainDateTime%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.PlainDateTime.prototype%', [
    'InitializedTemporalDateTime',
    'ISODateTime',
    'Calendar',
  ])) as Mutable<TemporalPlainDateTimeObject>;
  object.ISODateTime = isoDateTime;
  object.Calendar = calendar;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetimetostring */
export function ISODateTimeToString(isoDateTime: ISODateTimeRecord, calendar: CalendarType, precision: number | 'minute' | 'auto', showCalendar: 'auto' | 'always' | 'never' | 'critical'): string {
  const yearString = PadISOYear(isoDateTime.ISODate.Year);
  const monthString = ToZeroPaddedDecimalString(isoDateTime.ISODate.Month, 2);
  const dayString = ToZeroPaddedDecimalString(isoDateTime.ISODate.Day, 2);
  const subSecondNanoseconds = isoDateTime.Time.Millisecond * 1e6 + isoDateTime.Time.Microsecond * 1e3 + isoDateTime.Time.Nanosecond;
  const timeString = FormatTimeString(isoDateTime.Time.Hour, isoDateTime.Time.Minute, isoDateTime.Time.Second, subSecondNanoseconds, precision);
  const calendarString = FormatCalendarAnnotation(calendar, showCalendar);
  return `${yearString}-${monthString}-${dayString}T${timeString}${calendarString}`;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodatetime */
export function CompareISODateTime(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord): 1 | -1 | 0 {
  const dateResult = CompareISODate(isoDateTime1.ISODate, isoDateTime2.ISODate);
  if (dateResult !== 0) {
    return dateResult;
  }
  return CompareTimeRecord(isoDateTime1.Time, isoDateTime2.Time);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundisodatetime */
export function RoundISODateTime(isoDateTime: ISODateTimeRecord, increment: number, unit: TimeUnit | TemporalUnit.Day, roundingMode: RoundingMode): ISODateTimeRecord {
  Assert(ISODateTimeWithinLimits(isoDateTime));
  const roundedTime = RoundTime(isoDateTime.Time, increment, unit, roundingMode);
  const balanceResult = AddDaysToISODate(isoDateTime.ISODate, roundedTime.Days);
  return CombineISODateAndTimeRecord(balanceResult, roundedTime);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceisodatetime */
export function DifferenceISODateTime(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, largestUnit: TemporalUnit): InternalDurationRecord {
  Assert(ISODateTimeWithinLimits(isoDateTime1));
  Assert(ISODateTimeWithinLimits(isoDateTime2));
  let timeDuration = DifferenceTime(isoDateTime1.Time, isoDateTime2.Time);
  const timeSign = TimeDurationSign(timeDuration);
  const dateSign = CompareISODate(isoDateTime1.ISODate, isoDateTime2.ISODate);
  let adjustedDate = isoDateTime2.ISODate;
  if (timeSign === dateSign) {
    adjustedDate = AddDaysToISODate(adjustedDate, timeSign);
    timeDuration = X(Add24HourDaysToTimeDuration(timeDuration, -timeSign));
  }
  const dateLargestUnit = LargerOfTwoTemporalUnits(TemporalUnit.Day, largestUnit);
  const dateDifference = CalendarDateUntil(calendar, isoDateTime1.ISODate, adjustedDate, dateLargestUnit as DateUnit);
  if (largestUnit !== dateLargestUnit) {
    timeDuration = X(Add24HourDaysToTimeDuration(timeDuration, dateDifference.Days));
    dateDifference.Days = 0;
  }
  return CombineDateAndTimeDuration(dateDifference, timeDuration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithrounding */
export function DifferencePlainDateTimeWithRounding(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, largestUnit: TemporalUnit, roundingIncrement: number, smallestUnit: TemporalUnit, roundingMode: RoundingMode): PlainCompletion<InternalDurationRecord> {
  if (CompareISODateTime(isoDateTime1, isoDateTime2) === 0) {
    return CombineDateAndTimeDuration(ZeroDateDuration(), 0 as TimeDuration);
  }
  if (!ISODateTimeWithinLimits(isoDateTime1) || !ISODateTimeWithinLimits(isoDateTime2)) {
    return Throw.RangeError('PlainDateTime outside of range');
  }
  const diff = DifferenceISODateTime(isoDateTime1, isoDateTime2, calendar, largestUnit);
  if (smallestUnit === TemporalUnit.Nanosecond && roundingIncrement === 1) {
    return diff;
  }
  const originEpochNs = GetUTCEpochNanoseconds(isoDateTime1);
  const destEpochNs = GetUTCEpochNanoseconds(isoDateTime2);
  return RoundRelativeDuration(diff, originEpochNs, destEpochNs, isoDateTime1, undefined, calendar, largestUnit, roundingIncrement, smallestUnit, roundingMode);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithtotal */
export function DifferencePlainDateTimeWithTotal(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, unit: TemporalUnit): PlainCompletion<number> {
  if (CompareISODateTime(isoDateTime1, isoDateTime2) === 0) {
    return 0;
  }
  if (!ISODateTimeWithinLimits(isoDateTime1) || !ISODateTimeWithinLimits(isoDateTime2)) {
    return Throw.RangeError('PlainDateTime outside of range');
  }
  const diff = DifferenceISODateTime(isoDateTime1, isoDateTime2, calendar, unit);
  if (unit === TemporalUnit.Nanosecond) {
    return diff.Time;
  }
  const originEpochNs = GetUTCEpochNanoseconds(isoDateTime1);
  const destEpochNs = GetUTCEpochNanoseconds(isoDateTime2);
  return TotalRelativeDuration(diff, originEpochNs, destEpochNs, isoDateTime1, undefined, calendar, unit);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindatetime */
export function* DifferenceTemporalPlainDateTime(operation: 'since' | 'until', dateTime: TemporalPlainDateTimeObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalDateTime(_other));
  if (!CalendarEquals(dateTime.Calendar, other.Calendar)) {
    return Throw.RangeError('Calendars are not equal');
  }
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], TemporalUnit.Nanosecond, TemporalUnit.Day));
  if (CompareISODateTime(dateTime.ISODateTime, other.ISODateTime) === 0) {
    return X(CreateTemporalDuration(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
  }
  const internalDuration = Q(DifferencePlainDateTimeWithRounding(dateTime.ISODateTime, other.ISODateTime, dateTime.Calendar, settings.LargestUnit, settings.RoundingIncrement, settings.SmallestUnit, settings.RoundingMode));
  let result = X(TemporalDurationFromInternal(internalDuration, settings.LargestUnit));
  if (operation === 'since') {
    result = CreateNegatedTemporalDuration(result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodatetime */
export function* AddDurationToDateTime(operation: 'add' | 'subtract', dateTime: TemporalPlainDateTimeObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateTimeObject> {
  let duration = Q(yield* ToTemporalDuration(temporalDurationLike));
  if (operation === 'subtract') {
    duration = CreateNegatedTemporalDuration(duration);
  }
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  const timeResult = AddTime(dateTime.ISODateTime.Time, internalDuration.Time);
  const dateDuration = Q(AdjustDateDurationRecord(internalDuration.Date, timeResult.Days));
  const addedDate = Q(CalendarDateAdd(dateTime.Calendar, dateTime.ISODateTime.ISODate, dateDuration, overflow));
  const result = CombineISODateAndTimeRecord(addedDate, timeResult);
  return Q(yield* CreateTemporalDateTime(result, dateTime.Calendar));
}
