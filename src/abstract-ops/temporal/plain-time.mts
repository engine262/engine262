import type { TemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import { isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { type TemporalPlainTimeObject, isTemporalPlainTimeObject } from '../../intrinsics/Temporal/PlainTime.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import { abs } from '../math.mts';
import { GetOptionsObject, type RoundingMode } from './addition.mts';
import {
  Assert, type TimeDuration, TimeDurationFromComponents, nsPerDay, Value, type ValueEvaluator, ObjectValue, Q, GetTemporalOverflowOption, X, GetISODateTimeFor, JSStringValue, Throw, type PlainEvaluator, UndefinedValue, type PlainCompletion, type FunctionObject, surroundingAgent, OrdinaryCreateFromConstructor, type Mutable, Get, ToIntegerWithTruncation, FormatTimeString, type TimeUnit, TemporalUnit, Table21_LengthInNanoSeconds, RoundNumberToIncrement, GetDifferenceSettings, RoundTimeDuration, CombineDateAndTimeDuration, ZeroDateDuration, TemporalDurationFromInternal, CreateNegatedTemporalDuration, ToTemporalDuration, ToInternalDurationRecord,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-temporal-time-records */
export interface TimeRecord {
  readonly Days: number;
  readonly Hour: number;
  readonly Minute: number;
  readonly Second: number;
  readonly Millisecond: number;
  readonly Microsecond: number;
  readonly Nanosecond: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtimerecord */
export function CreateTimeRecord(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number, deltaDays = 0): TimeRecord {
  Assert(IsValidTime(hour, minute, second, millisecond, microsecond, nanosecond));
  return {
    Days: deltaDays,
    Hour: hour,
    Minute: minute,
    Second: second,
    Millisecond: millisecond,
    Microsecond: microsecond,
    Nanosecond: nanosecond,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-midnighttimerecord */
export function MidnightTimeRecord(): TimeRecord {
  return {
    Days: 0,
    Hour: 0,
    Minute: 0,
    Second: 0,
    Millisecond: 0,
    Microsecond: 0,
    Nanosecond: 0,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-noontimerecord */
export function NoonTimeRecord(): TimeRecord {
  return {
    Days: 0,
    Hour: 12,
    Minute: 0,
    Second: 0,
    Millisecond: 0,
    Microsecond: 0,
    Nanosecond: 0,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetime */
export function DifferenceTime(time1: TimeRecord, time2: TimeRecord): TimeDuration {
  const hours = time2.Hour - time1.Hour;
  const minutes = time2.Minute - time1.Minute;
  const seconds = time2.Second - time1.Second;
  const milliseconds = time2.Millisecond - time1.Millisecond;
  const microseconds = time2.Microsecond - time1.Microsecond;
  const nanoseconds = time2.Nanosecond - time1.Nanosecond;
  const timeDuration = TimeDurationFromComponents(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  Assert(abs(timeDuration) < nsPerDay);
  return timeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaltime */
export function* ToTemporalTime(item: Value, options: Value = Value.undefined): ValueEvaluator<TemporalPlainTimeObject> {
  let result;
  if (item instanceof ObjectValue) {
    if (isTemporalPlainTimeObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalTime(item.Time));
    }
    if (isTemporalPlainDateTimeObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalTime(item.ISODateTime.Time));
    }
    if (isTemporalZonedDateTimeObject(item)) {
      const isoDateTime = GetISODateTimeFor(item.TimeZone, item.EpochNanoseconds);
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalTime(isoDateTime.Time));
    }
    const result2 = Q(yield* ToTemporalTimeRecord(item));
    const resolvedOptions = Q(GetOptionsObject(options));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    result = Q(RegulateTime(result2.Hour!, result2.Minute!, result2.Second!, result2.Millisecond!, result2.Microsecond!, result2.Nanosecond!, overflow));
  } else {
    if (!(item instanceof JSStringValue)) {
      return Throw.TypeError('Invalid time string $1', item);
    }
    const parseResult = Q(ParseISODateTime(item.stringValue(), ['TemporalTimeString']));
    Assert(parseResult.Time !== 'start-of-day');
    result = parseResult.Time;
    const resolvedOptions = Q(GetOptionsObject(options));
    Q(yield* GetTemporalOverflowOption(resolvedOptions));
  }
  return X(CreateTemporalTime(result));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totimerecordormidnight */
export function* ToTimeRecordOrMidnight(item: Value): PlainEvaluator<TimeRecord> {
  if (item instanceof UndefinedValue) {
    return MidnightTimeRecord();
  }
  const plainTime = Q(yield* ToTemporalTime(item));
  return plainTime.Time;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-regulatetime */
export function RegulateTime(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number, overflow: 'constrain' | 'reject'): PlainCompletion<TimeRecord> {
  if (overflow === 'constrain') {
    hour = Math.max(0, Math.min(23, hour));
    minute = Math.max(0, Math.min(59, minute));
    second = Math.max(0, Math.min(59, second));
    millisecond = Math.max(0, Math.min(999, millisecond));
    microsecond = Math.max(0, Math.min(999, microsecond));
    nanosecond = Math.max(0, Math.min(999, nanosecond));
  } else {
    Assert(overflow === 'reject');
    if (!IsValidTime(hour, minute, second, millisecond, microsecond, nanosecond)) {
      return Throw.RangeError('Invalid time');
    }
  }
  return CreateTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidtime */
export function IsValidTime(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number): boolean {
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;
  if (millisecond < 0 || millisecond > 999) return false;
  if (microsecond < 0 || microsecond > 999) return false;
  if (nanosecond < 0 || nanosecond > 999) return false;
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-balancetime */
export function BalanceTime(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number): TimeRecord {
  microsecond += Math.floor(nanosecond / 1000);
  nanosecond %= 1000;
  millisecond += Math.floor(microsecond / 1000);
  microsecond %= 1000;
  second += Math.floor(millisecond / 1000);
  millisecond %= 1000;
  minute += Math.floor(second / 60);
  second %= 60;
  hour += Math.floor(minute / 60);
  minute %= 60;
  const deltaDays = Math.floor(hour / 24);
  hour %= 24;
  return CreateTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond, deltaDays);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaltime */
export function* CreateTemporalTime(time: TimeRecord, newTarget?: FunctionObject): ValueEvaluator<TemporalPlainTimeObject> {
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.PlainTime%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.PlainTime.prototype%', [
    'InitializedTemporalTime',
    'Time',
  ])) as Mutable<TemporalPlainTimeObject>;
  object.Time = time;
  return object;
}

/** https://tc39.es/proposal-temporal/#table-temporal-temporaltimelike-record-fields */
export interface TemporalTimeLike {
  Hour: number | undefined;
  Minute: number | undefined;
  Second: number | undefined;
  Millisecond: number | undefined;
  Microsecond: number | undefined;
  Nanosecond: number | undefined;
}
/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaltimerecord */
export function* ToTemporalTimeRecord(temporalTimeLike: ObjectValue, completeness: 'partial' | 'complete' = 'complete'): PlainEvaluator<TemporalTimeLike> {
  const result: Mutable<TemporalTimeLike> = {
    Hour: undefined,
    Minute: undefined,
    Second: undefined,
    Millisecond: undefined,
    Microsecond: undefined,
    Nanosecond: undefined,
  };
  if (completeness === 'complete') {
    result.Hour = 0;
    result.Minute = 0;
    result.Second = 0;
    result.Millisecond = 0;
    result.Microsecond = 0;
    result.Nanosecond = 0;
  }
  let any = false;
  const hour = Q(yield* Get(temporalTimeLike, Value('hour')));
  if (!(hour instanceof UndefinedValue)) {
    result.Hour = Q(yield* ToIntegerWithTruncation(hour));
    any = true;
  }
  const microsecond = Q(yield* Get(temporalTimeLike, Value('microsecond')));
  if (!(microsecond instanceof UndefinedValue)) {
    result.Microsecond = Q(yield* ToIntegerWithTruncation(microsecond));
    any = true;
  }
  const millisecond = Q(yield* Get(temporalTimeLike, Value('millisecond')));
  if (!(millisecond instanceof UndefinedValue)) {
    result.Millisecond = Q(yield* ToIntegerWithTruncation(millisecond));
    any = true;
  }
  const minute = Q(yield* Get(temporalTimeLike, Value('minute')));
  if (!(minute instanceof UndefinedValue)) {
    result.Minute = Q(yield* ToIntegerWithTruncation(minute));
    any = true;
  }
  const nanosecond = Q(yield* Get(temporalTimeLike, Value('nanosecond')));
  if (!(nanosecond instanceof UndefinedValue)) {
    result.Nanosecond = Q(yield* ToIntegerWithTruncation(nanosecond));
    any = true;
  }
  const second = Q(yield* Get(temporalTimeLike, Value('second')));
  if (!(second instanceof UndefinedValue)) {
    result.Second = Q(yield* ToIntegerWithTruncation(second));
    any = true;
  }
  if (!any) {
    return Throw.TypeError('$1 does not look like a TemporalTimeLike object', temporalTimeLike);
  }
  return result;
}


/** https://tc39.es/proposal-temporal/#sec-temporal-timerecordtostring */
export function TimeRecordToString(time: TimeRecord, precision: number | 'minute' | 'auto'): string {
  const subSecondNanoseconds = time.Millisecond * 1e6 + time.Microsecond * 1e3 + time.Nanosecond;
  return FormatTimeString(time.Hour, time.Minute, time.Second, subSecondNanoseconds, precision);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimerecord */
export function CompareTimeRecord(time1: TimeRecord, time2: TimeRecord): -1 | 0 | 1 {
  if (time1.Hour > time2.Hour) return 1;
  if (time1.Hour < time2.Hour) return -1;
  if (time1.Minute > time2.Minute) return 1;
  if (time1.Minute < time2.Minute) return -1;
  if (time1.Second > time2.Second) return 1;
  if (time1.Second < time2.Second) return -1;
  if (time1.Millisecond > time2.Millisecond) return 1;
  if (time1.Millisecond < time2.Millisecond) return -1;
  if (time1.Microsecond > time2.Microsecond) return 1;
  if (time1.Microsecond < time2.Microsecond) return -1;
  if (time1.Nanosecond > time2.Nanosecond) return 1;
  if (time1.Nanosecond < time2.Nanosecond) return -1;
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addtime */
export function AddTime(time: TimeRecord, timeDuration: TimeDuration): TimeRecord {
  return BalanceTime(time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, time.Nanosecond + Number(timeDuration));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtime */
export function RoundTime(time: TimeRecord, increment: number, unit: TimeUnit | TemporalUnit.Day, roundingMode: RoundingMode): TimeRecord {
  let quantity: number;
  if (unit === TemporalUnit.Day || unit === TemporalUnit.Hour) {
    quantity = (((((time.Hour * 60 + time.Minute) * 60 + time.Second) * 1000 + time.Millisecond) * 1000 + time.Microsecond) * 1000 + time.Nanosecond);
  } else if (unit === TemporalUnit.Minute) {
    quantity = ((((time.Minute * 60 + time.Second) * 1000 + time.Millisecond) * 1000 + time.Microsecond) * 1000 + time.Nanosecond);
  } else if (unit === TemporalUnit.Second) {
    quantity = (((time.Second * 1000 + time.Millisecond) * 1000 + time.Microsecond) * 1000 + time.Nanosecond);
  } else if (unit === TemporalUnit.Millisecond) {
    quantity = ((time.Millisecond * 1000 + time.Microsecond) * 1000 + time.Nanosecond);
  } else if (unit === TemporalUnit.Microsecond) {
    quantity = time.Microsecond * 1000 + time.Nanosecond;
  } else {
    Assert(unit === TemporalUnit.Nanosecond);
    quantity = time.Nanosecond;
  }
  const unitLength = Table21_LengthInNanoSeconds[unit];
  const result = RoundNumberToIncrement(quantity, increment * unitLength, roundingMode) / unitLength;
  if (unit === TemporalUnit.Day) return CreateTimeRecord(0, 0, 0, 0, 0, 0, result);
  if (unit === TemporalUnit.Hour) return BalanceTime(result, 0, 0, 0, 0, 0);
  if (unit === TemporalUnit.Minute) return BalanceTime(time.Hour, result, 0, 0, 0, 0);
  if (unit === TemporalUnit.Second) return BalanceTime(time.Hour, time.Minute, result, 0, 0, 0);
  if (unit === TemporalUnit.Millisecond) return BalanceTime(time.Hour, time.Minute, time.Second, result, 0, 0);
  if (unit === TemporalUnit.Microsecond) return BalanceTime(time.Hour, time.Minute, time.Second, time.Millisecond, result, 0);
  Assert(unit === TemporalUnit.Nanosecond);
  return BalanceTime(time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, result);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaintime */
export function* DifferenceTemporalPlainTime(operation: 'since' | 'until', temporalTime: TemporalPlainTimeObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalTime(_other));
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(operation, resolvedOptions, 'time', [], TemporalUnit.Nanosecond, TemporalUnit.Hour));
  let timeDuration = DifferenceTime(temporalTime.Time, other.Time);
  // TODO(temporal): unsafe cast of settings.SmallestUnit
  timeDuration = X(RoundTimeDuration(timeDuration, settings.RoundingIncrement, settings.SmallestUnit as TimeUnit, settings.RoundingMode));
  const duration = CombineDateAndTimeDuration(ZeroDateDuration(), timeDuration);
  let result = X(TemporalDurationFromInternal(duration, settings.LargestUnit));
  if (operation === 'since') {
    result = CreateNegatedTemporalDuration(result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtotime */
export function* AddDurationToTime(operation: 'add' | 'subtract', temporalTime: TemporalPlainTimeObject, temporalDurationLike: Value): ValueEvaluator<TemporalPlainTimeObject> {
  let duration = Q(yield* ToTemporalDuration(temporalDurationLike));
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const internalDuration = ToInternalDurationRecord(duration);
  const result = AddTime(temporalTime.Time, internalDuration.Time);
  return X(CreateTemporalTime(result));
}
