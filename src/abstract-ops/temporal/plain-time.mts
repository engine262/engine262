import type { TemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import { isTemporalPlainDateTimeObject } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { type TemporalPlainTimeObject, isTemporalPlainTimeObject } from '../../intrinsics/Temporal/PlainTime.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import {
  abs, floorDiv, max, min, modulo,
} from '../math.mts';
import { Decimal } from '../../host-defined/decimal.mts';
import { GetOptionsObject, SnapToInteger, type RoundingMode } from './addition.mts';
import {
  Assert, type TimeDuration, TimeDurationFromComponents, nsPerDay, Value, type ValueEvaluator, ObjectValue, Q, GetTemporalOverflowOption, X, GetISODateTimeFor, JSStringValue, Throw, type PlainEvaluator, UndefinedValue, type PlainCompletion, type FunctionObject, surroundingAgent, OrdinaryCreateFromConstructor, type Mutable, Get, FormatTimeString, type TimeUnit, TemporalUnit, Table21_LengthInNanoSeconds, RoundNumberToIncrement, GetDifferenceSettings, RoundTimeDuration, CombineDateAndTimeDuration, ZeroDateDuration, TemporalDurationFromInternal, CreateNegatedTemporalDuration, ToTemporalDuration, ToInternalDurationRecord,
  type Integer,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-temporal-time-records */
export interface TimeRecord {
  readonly Days: Integer;
  readonly Hour: Integer;
  readonly Minute: Integer;
  readonly Second: Integer;
  readonly Millisecond: Integer;
  readonly Microsecond: Integer;
  readonly Nanosecond: Integer;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtimerecord */
export function CreateTimeRecord(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer, deltaDays: Integer = 0n): TimeRecord {
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
    Days: 0n,
    Hour: 0n,
    Minute: 0n,
    Second: 0n,
    Millisecond: 0n,
    Microsecond: 0n,
    Nanosecond: 0n,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-noontimerecord */
export function NoonTimeRecord(): TimeRecord {
  return {
    Days: 0n,
    Hour: 12n,
    Minute: 0n,
    Second: 0n,
    Millisecond: 0n,
    Microsecond: 0n,
    Nanosecond: 0n,
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
export function RegulateTime(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer, overflow: 'constrain' | 'reject'): PlainCompletion<TimeRecord> {
  if (overflow === 'constrain') {
    hour = max(0n, min(23n, hour));
    minute = max(0n, min(59n, minute));
    second = max(0n, min(59n, second));
    millisecond = max(0n, min(999n, millisecond));
    microsecond = max(0n, min(999n, microsecond));
    nanosecond = max(0n, min(999n, nanosecond));
  } else {
    Assert(overflow === 'reject');
    if (!IsValidTime(hour, minute, second, millisecond, microsecond, nanosecond)) {
      return Throw.RangeError('Invalid time');
    }
  }
  return CreateTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond);
}

/** https://tc39.es/proposal-temporal/#sec-isvalidtime */
export function IsValidTime(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer): boolean {
  if (hour < 0n || hour > 23n) return false;
  if (minute < 0n || minute > 59n) return false;
  if (second < 0n || second > 59n) return false;
  if (millisecond < 0n || millisecond > 999n) return false;
  if (microsecond < 0n || microsecond > 999n) return false;
  if (nanosecond < 0n || nanosecond > 999n) return false;
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-balancetime */
export function BalanceTime(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer): TimeRecord {
  microsecond += floorDiv(nanosecond, 1000n);
  nanosecond = modulo(nanosecond, 1000n);
  millisecond += floorDiv(microsecond, 1000n);
  microsecond = modulo(microsecond, 1000n);
  second += floorDiv(millisecond, 1000n);
  millisecond = modulo(millisecond, 1000n);
  minute += floorDiv(second, 60n);
  second = modulo(second, 60n);
  hour += floorDiv(minute, 60n);
  minute = modulo(minute, 60n);
  const deltaDays = floorDiv(hour, 24n);
  hour = modulo(hour, 24n);
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
  Hour: bigint | undefined;
  Minute: bigint | undefined;
  Second: bigint | undefined;
  Millisecond: bigint | undefined;
  Microsecond: bigint | undefined;
  Nanosecond: bigint | undefined;
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
    result.Hour = 0n;
    result.Minute = 0n;
    result.Second = 0n;
    result.Millisecond = 0n;
    result.Microsecond = 0n;
    result.Nanosecond = 0n;
  }
  let any = false;
  const hour = Q(yield* Get(temporalTimeLike, Value('hour')));
  if (!(hour instanceof UndefinedValue)) {
    result.Hour = Q(yield* SnapToInteger(hour, 'truncate-strict'));
    any = true;
  }
  const microsecond = Q(yield* Get(temporalTimeLike, Value('microsecond')));
  if (!(microsecond instanceof UndefinedValue)) {
    result.Microsecond = Q(yield* SnapToInteger(microsecond, 'truncate-strict'));
    any = true;
  }
  const millisecond = Q(yield* Get(temporalTimeLike, Value('millisecond')));
  if (!(millisecond instanceof UndefinedValue)) {
    result.Millisecond = Q(yield* SnapToInteger(millisecond, 'truncate-strict'));
    any = true;
  }
  const minute = Q(yield* Get(temporalTimeLike, Value('minute')));
  if (!(minute instanceof UndefinedValue)) {
    result.Minute = Q(yield* SnapToInteger(minute, 'truncate-strict'));
    any = true;
  }
  const nanosecond = Q(yield* Get(temporalTimeLike, Value('nanosecond')));
  if (!(nanosecond instanceof UndefinedValue)) {
    result.Nanosecond = Q(yield* SnapToInteger(nanosecond, 'truncate-strict'));
    any = true;
  }
  const second = Q(yield* Get(temporalTimeLike, Value('second')));
  if (!(second instanceof UndefinedValue)) {
    result.Second = Q(yield* SnapToInteger(second, 'truncate-strict'));
    any = true;
  }
  if (!any) {
    return Throw.TypeError('$1 does not look like a TemporalTimeLike object', temporalTimeLike);
  }
  return result;
}


/** https://tc39.es/proposal-temporal/#sec-temporal-timerecordtostring */
export function TimeRecordToString(time: TimeRecord, precision: Integer | TemporalUnit.Minute | 'auto'): string {
  const subSecondNanoseconds = time.Millisecond * BigInt(1e6) + time.Microsecond * BigInt(1e3) + time.Nanosecond;
  return FormatTimeString(time.Hour, time.Minute, time.Second, subSecondNanoseconds, precision);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimerecord */
export function CompareTimeRecord(time1: TimeRecord, time2: TimeRecord): -1n | 0n | 1n {
  if (time1.Hour > time2.Hour) return 1n;
  if (time1.Hour < time2.Hour) return -1n;
  if (time1.Minute > time2.Minute) return 1n;
  if (time1.Minute < time2.Minute) return -1n;
  if (time1.Second > time2.Second) return 1n;
  if (time1.Second < time2.Second) return -1n;
  if (time1.Millisecond > time2.Millisecond) return 1n;
  if (time1.Millisecond < time2.Millisecond) return -1n;
  if (time1.Microsecond > time2.Microsecond) return 1n;
  if (time1.Microsecond < time2.Microsecond) return -1n;
  if (time1.Nanosecond > time2.Nanosecond) return 1n;
  if (time1.Nanosecond < time2.Nanosecond) return -1n;
  return 0n;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addtime */
export function AddTime(time: TimeRecord, timeDuration: TimeDuration): TimeRecord {
  return BalanceTime(time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, time.Nanosecond + timeDuration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtime */
export function RoundTime(time: TimeRecord, increment: Integer, unit: TimeUnit | TemporalUnit.Day, roundingMode: RoundingMode): TimeRecord {
  let quantity: bigint;
  if (unit === TemporalUnit.Day || unit === TemporalUnit.Hour) {
    quantity = (((((time.Hour * 60n + time.Minute) * 60n + time.Second) * 1000n + time.Millisecond) * 1000n + time.Microsecond) * 1000n + time.Nanosecond);
  } else if (unit === TemporalUnit.Minute) {
    quantity = ((((time.Minute * 60n + time.Second) * 1000n + time.Millisecond) * 1000n + time.Microsecond) * 1000n + time.Nanosecond);
  } else if (unit === TemporalUnit.Second) {
    quantity = (((time.Second * 1000n + time.Millisecond) * 1000n + time.Microsecond) * 1000n + time.Nanosecond);
  } else if (unit === TemporalUnit.Millisecond) {
    quantity = ((time.Millisecond * 1000n + time.Microsecond) * 1000n + time.Nanosecond);
  } else if (unit === TemporalUnit.Microsecond) {
    quantity = time.Microsecond * 1000n + time.Nanosecond;
  } else {
    Assert(unit === TemporalUnit.Nanosecond);
    quantity = time.Nanosecond;
  }
  const unitLength = Table21_LengthInNanoSeconds[unit];
  const result = RoundNumberToIncrement(Decimal(quantity), increment * unitLength, roundingMode) / unitLength;
  if (unit === TemporalUnit.Day) return CreateTimeRecord(0n, 0n, 0n, 0n, 0n, 0n, result);
  if (unit === TemporalUnit.Hour) return BalanceTime(result, 0n, 0n, 0n, 0n, 0n);
  if (unit === TemporalUnit.Minute) return BalanceTime(time.Hour, result, 0n, 0n, 0n, 0n);
  if (unit === TemporalUnit.Second) return BalanceTime(time.Hour, time.Minute, result, 0n, 0n, 0n);
  if (unit === TemporalUnit.Millisecond) return BalanceTime(time.Hour, time.Minute, time.Second, result, 0n, 0n);
  if (unit === TemporalUnit.Microsecond) return BalanceTime(time.Hour, time.Minute, time.Second, time.Millisecond, result, 0n);
  Assert(unit === TemporalUnit.Nanosecond);
  return BalanceTime(time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, result);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaintime */
export function* DifferenceTemporalPlainTime(operation: 'since' | 'until', temporalTime: TemporalPlainTimeObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalTime(_other));
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(operation, resolvedOptions, 'time', [], TemporalUnit.Nanosecond, TemporalUnit.Hour));
  let timeDuration = DifferenceTime(temporalTime.Time, other.Time);
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
