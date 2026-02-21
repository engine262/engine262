import type { TemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import { type TemporalInstantObject, isTemporalInstantObject } from '../../intrinsics/Temporal/Instant.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { ParseISODateTime, ParseDateTimeUTCOffset } from '../../parser/TemporalParser.mts';
import {
  GetUTCEpochNanoseconds, RoundingMode, type TimeZoneIdentifier, GetOptionsObject,
} from './addition.mts';
import {
  type FunctionObject, type ValueEvaluator, Assert, surroundingAgent, Q, OrdinaryCreateFromConstructor, type Mutable, Value, ObjectValue, X, ToPrimitive, JSStringValue, Throw, CheckISODaysRange, type TimeDuration, type PlainCompletion, AddTimeDurationToEpochNanoseconds, type TimeUnit, type InternalDurationRecord, TimeDurationFromEpochNanosecondsDifference, RoundTimeDuration, CombineDateAndTimeDuration, ZeroDateDuration, Table21_LengthInNanoSeconds, RoundNumberToIncrementAsIfPositive, GetISODateTimeFor, GetOffsetNanosecondsFor, FormatDateTimeUTCOffsetRounded, GetDifferenceSettings, TemporalUnit, TemporalDurationFromInternal, CreateNegatedTemporalDuration, ToTemporalDuration, DefaultTemporalLargestUnit, TemporalUnitCategory, ToInternalDurationRecordWith24HourDays,
  BalanceISODateTime,
  ISODateTimeToString,
} from '#self';

/** https://tc39.es/proposal-temporal/#eqn-nsPerDay */
export const nsPerDay = 8.64e13;
/** https://tc39.es/proposal-temporal/#eqn-nsMaxInstant */
export const nsMaxInstant = 8.64e21;
/** https://tc39.es/proposal-temporal/#eqn-nsMinInstant */
export const nsMinInstant = -8.64e21;

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidepochnanoseconds */
export function IsValidEpochNanoseconds(epochNanoseconds: bigint | number): boolean {
  if (epochNanoseconds < nsMinInstant || epochNanoseconds > nsMaxInstant) {
    return false;
  }
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalinstant */
export function* CreateTemporalInstant(epochNanoseconds: bigint, newTarget?: FunctionObject): ValueEvaluator<TemporalInstantObject> {
  Assert(IsValidEpochNanoseconds(epochNanoseconds));
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.Instant%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.Instant.prototype%', [
    'InitializedTemporalInstant',
    'EpochNanoseconds',
  ])) as Mutable<TemporalInstantObject>;
  object.EpochNanoseconds = epochNanoseconds;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalinstant */
export function* ToTemporalInstant(item: Value): ValueEvaluator<TemporalInstantObject> {
  if (item instanceof ObjectValue) {
    if (isTemporalInstantObject(item) || isTemporalZonedDateTimeObject(item)) {
      return X(CreateTemporalInstant(item.EpochNanoseconds));
    }
    item = Q(yield* ToPrimitive(item, 'string'));
  }
  if (!(item instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', item);
  }
  const parsed = Q(ParseISODateTime(item.stringValue(), ['TemporalInstantString']));
  // Assert: Either parsed.[[TimeZone]].[[OffsetString]] is not empty or parsed.[[TimeZone]].[[Z]] is true, but not both.
  {
    const a = parsed.TimeZone.OffsetString !== undefined;
    const b = parsed.TimeZone.Z;
    Assert((a || b) && !(a && b));
  }
  const OffsetString = parsed.TimeZone.OffsetString!;
  const offsetNanoseconds = parsed.TimeZone.Z ? 0 : X(ParseDateTimeUTCOffset(OffsetString));
  const time = parsed.Time;
  Assert(time !== 'start-of-day');
  const balanced = BalanceISODateTime(parsed.Year!, parsed.Month, parsed.Day, time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, time.Nanosecond - offsetNanoseconds);
  Q(CheckISODaysRange(balanced.ISODate));
  const epochNanoseconds = GetUTCEpochNanoseconds(balanced);
  if (!IsValidEpochNanoseconds(epochNanoseconds)) {
    return Throw.RangeError('$1 is not a valid epoch nanoseconds', epochNanoseconds);
  }
  return X(CreateTemporalInstant(epochNanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-compareepochnanoseconds */
export function CompareEpochNanoseconds(epochNanosecondsOne: bigint, epochNanosecondsTwo: bigint): -1 | 0 | 1 {
  if (epochNanosecondsOne > epochNanosecondsTwo) {
    return 1;
  }
  if (epochNanosecondsOne < epochNanosecondsTwo) {
    return -1;
  }
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addinstant */
export function AddInstant(epochNanoseconds: bigint, timeDuration: TimeDuration): PlainCompletion<bigint> {
  const result = AddTimeDurationToEpochNanoseconds(timeDuration, epochNanoseconds);
  if (!IsValidEpochNanoseconds(result)) {
    return Throw.RangeError('$1 is not a valid epoch nanoseconds', result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceinstant */
export function DifferenceInstant(
  ns1: bigint,
  ns2: bigint,
  roundingIncrement: number,
  smallestUnit: TimeUnit,
  roundingMode: RoundingMode,
): InternalDurationRecord {
  let timeDuration = TimeDurationFromEpochNanosecondsDifference(ns2, ns1);
  timeDuration = X(RoundTimeDuration(timeDuration, roundingIncrement, smallestUnit, roundingMode));
  return CombineDateAndTimeDuration(ZeroDateDuration(), timeDuration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtemporalinstant */
export function RoundTemporalInstant(
  ns: bigint,
  increment: number,
  unit: TimeUnit,
  roundingMode: RoundingMode,
): bigint {
  const unitLength = Table21_LengthInNanoSeconds[unit];
  const incrementNs = increment * unitLength;
  return BigInt(RoundNumberToIncrementAsIfPositive(Number(ns), incrementNs, roundingMode));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalinstant-tostring */
export function TemporalInstantToString(
  instant: TemporalInstantObject,
  timeZone: TimeZoneIdentifier | undefined,
  precision: number | 'minute' | 'auto',
): string {
  let outputTimeZone = timeZone;
  if (outputTimeZone === undefined) {
    outputTimeZone = 'UTC' as TimeZoneIdentifier;
  }
  const epochNs = instant.EpochNanoseconds;
  const isoDateTime = GetISODateTimeFor(outputTimeZone, epochNs);
  const dateTimeString = ISODateTimeToString(isoDateTime, 'iso8601', precision, 'never');
  let timeZoneString;
  if (timeZone === undefined) {
    timeZoneString = 'Z';
  } else {
    const offsetNanoseconds = GetOffsetNanosecondsFor(outputTimeZone, epochNs);
    timeZoneString = FormatDateTimeUTCOffsetRounded(offsetNanoseconds);
  }
  return dateTimeString + timeZoneString;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalinstant */
export function* DifferenceTemporalInstant(
  operation: 'since' | 'until',
  instant: TemporalInstantObject,
  _other: Value,
  options: Value,
): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalInstant(_other));
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(operation, resolvedOptions, 'time', [], TemporalUnit.Nanosecond, TemporalUnit.Second));
  const internalDuration = DifferenceInstant(instant.EpochNanoseconds, other.EpochNanoseconds, settings.RoundingIncrement, settings.SmallestUnit as TimeUnit, settings.RoundingMode);
  let result = X(TemporalDurationFromInternal(internalDuration, settings.LargestUnit));
  if (operation === 'since') {
    result = CreateNegatedTemporalDuration(result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoinstant */
export function* AddDurationToInstant(
  operation: 'add' | 'subtract',
  instant: TemporalInstantObject,
  temporalDurationLike: Value,
): ValueEvaluator<TemporalInstantObject> {
  let duration = Q(yield* ToTemporalDuration(temporalDurationLike));
  if (operation === 'subtract') {
    duration = CreateNegatedTemporalDuration(duration);
  }
  const largestUnit = DefaultTemporalLargestUnit(duration);
  if (TemporalUnitCategory(largestUnit) === 'date') {
    return Throw.RangeError('Cannot add a date to an instant');
  }
  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  const ns = Q(AddInstant(instant.EpochNanoseconds, internalDuration.Time));
  return X(CreateTemporalInstant(ns));
}
