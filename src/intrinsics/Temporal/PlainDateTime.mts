import { GetOptionsObject, GetUTCEpochNanoseconds, type RoundingMode } from '../../abstract-ops/temporal/addition.mts';
import { abs } from '../../abstract-ops/math.mts';
import type { TemporalUnit, TimeUnit } from '../../abstract-ops/temporal/temporal.mts';
import { GetTemporalOverflowOption, ISODateToEpochDays } from '../../abstract-ops/temporal/temporal.mts';
import {
  CalendarDateFromFields,
  CanonicalizeCalendar,
  GetTemporalCalendarIdentifierWithISODefault,
  PrepareCalendarFields,
  type CalendarFieldsRecord,
  type CalendarType,
} from '../../abstract-ops/temporal/calendar.mts';
import { GetISODateTimeFor } from '../../abstract-ops/temporal/time-zone.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import type { InternalDurationRecord, TemporalDurationObject } from './Duration.mts';
import { AddDaysToISODate, CompareISODate, CreateISODateRecord, isTemporalPlainDateObject, type ISODateRecord } from './PlainDate.mts';
import { BalanceTime, CompareTimeRecord, MidnightTimeRecord, RegulateTime, type TimeRecord } from './PlainTime.mts';
import { isTemporalZonedDateTimeObject } from './ZonedDateTime.mts';
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
  type PlainCompletion,
  type PlainEvaluator,
  type ValueEvaluator,
} from '#self';
import { nsMaxInstant, nsMinInstant, nsPerDay } from './Instant.mts';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindatetime-instances */
export interface TemporalPlainDateTimeObject extends OrdinaryObject {
  readonly InitializedTemporalDateTime: never;
  readonly ISODateTime: ISODateTimeRecord;
  readonly Calendar: CalendarType;
}
export function isTemporalPlainDateTimeObject(o: ObjectValue): o is TemporalPlainDateTimeObject {
  return 'InitializedTemporalDateTime' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-time-records */
export interface ISODateTimeRecord {
  readonly ISODate: ISODateRecord;
  readonly Time: TimeRecord;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timevaluetoisodatetimerecord */
export declare function TimeValueToISODateTimeRecord(t: number): ISODateTimeRecord;

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
export declare function ISODateTimeToString(isoDateTime: ISODateTimeRecord, calendar: CalendarType, precision: number | 'minute' | 'auto', showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodatetime */
export function CompareISODateTime(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord): 1 | -1 | 0 {
  const dateResult = CompareISODate(isoDateTime1.ISODate, isoDateTime2.ISODate);
  if (dateResult !== 0) {
    return dateResult;
  }
  return CompareTimeRecord(isoDateTime1.Time, isoDateTime2.Time);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundisodatetime */
export declare function RoundISODateTime(isoDateTime: ISODateTimeRecord, increment: number, unit: TimeUnit | 'day', roundingMode: RoundingMode): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceisodatetime */
export declare function DifferenceISODateTime(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, largestUnit: TemporalUnit): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithrounding */
export declare function DifferencePlainDateTimeWithRounding(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, largestUnit: TemporalUnit, roundingIncrement: number, smallestUnit: TemporalUnit, roundingMode: RoundingMode): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithtotal */
export declare function DifferencePlainDateTimeWithTotal(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, unit: TemporalUnit): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindatetime */
export declare function DifferenceTemporalPlainDateTime(operation: 'since' | 'until', dateTime: TemporalPlainDateTimeObject, other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodatetime */
export declare function AddDurationToDateTime(operation: 'add' | 'subtract', dateTime: TemporalPlainDateTimeObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateTimeObject>;
