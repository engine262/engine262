import { bootstrapPrototype } from '../bootstrap.mts';
import {
  GetOptionsObject,
  GetRoundingIncrementOption,
  GetRoundingModeOption,
  RoundingMode,
  type TimeZoneIdentifier,
} from '../../abstract-ops/temporal/addition.mts';
import {
  GetTemporalFractionalSecondDigitsOption,
  GetTemporalUnitValuedOption,
  TemporalUnit,
  ToSecondsStringPrecisionRecord,
  ValidateTemporalRoundingIncrement,
  ValidateTemporalUnitValue,
  type TimeUnit,
} from '../../abstract-ops/temporal/temporal.mts';
import {
  AddDurationToInstant,
  CreateTemporalInstant,
  DifferenceTemporalInstant,
  nsPerDay,
  RoundTemporalInstant,
  TemporalInstantToString,
  ToTemporalInstant,
} from '../../abstract-ops/temporal/instant.mts';
import { CreateTemporalZonedDateTime } from '../../abstract-ops/temporal/zoned-datetime.mts';
import { ToTemporalTimeZoneIdentifier } from '../../abstract-ops/temporal/time-zone.mts';
import type { TemporalInstantObject } from './Instant.mts';
import {
  Assert,
  CreateDataPropertyOrThrow,
  Get,
  HoursPerDay,
  JSStringValue,
  MinutesPerHour,
  msPerDay,
  OrdinaryObjectCreate,
  Q,
  RequireInternalSlot,
  SecondsPerMinute,
  Throw,
  UndefinedValue,
  Value,
  X,
  type Arguments,
  type FunctionCallContext,
  type PlainCompletion,
  type Realm,
  type ValueEvaluator,
} from '#self';

function thisTemporalInstantValue(value: Value): PlainCompletion<TemporalInstantObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalInstant'));
  return value as TemporalInstantObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.instant.prototype.epochmilliseconds */
function InstantProto_epochMillisecondsGetter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const instant = Q(thisTemporalInstantValue(thisValue));
  const ns = instant.EpochNanoseconds;
  const ms = Math.floor(Number(ns) / 10e6);
  return Value(ms);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.instant.prototype.epochnanoseconds */
function InstantProto_epochNanosecondsGetter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Value(instant.EpochNanoseconds);
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.add */
function* InstantProto_add([temporalDurationLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Q(yield* AddDurationToInstant('add', instant, temporalDurationLike));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.subtract */
function* InstantProto_subtract([temporalDurationLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Q(yield* AddDurationToInstant('subtract', instant, temporalDurationLike));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.until */
function* InstantProto_until([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Q(yield* DifferenceTemporalInstant('until', instant, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.since */
function* InstantProto_since([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Q(yield* DifferenceTemporalInstant('since', instant, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.round */
function* InstantProto_round([roundTo = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  if (roundTo instanceof UndefinedValue) {
    return Throw.TypeError('roundTo is required');
  }
  if (roundTo instanceof JSStringValue) {
    const paramString = roundTo;
    roundTo = OrdinaryObjectCreate(Value.null);
    X(CreateDataPropertyOrThrow(roundTo, Value('smallestUnit'), paramString));
  } else {
    roundTo = Q(GetOptionsObject(roundTo));
  }
  const roundingIncrement = Q(yield* GetRoundingIncrementOption(roundTo));
  const roundingMode = Q(yield* GetRoundingModeOption(roundTo, RoundingMode.HalfExpand));
  const smallestUnit = Q(yield* GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'required'));
  Q(ValidateTemporalUnitValue(smallestUnit, 'time'));
  let maximum: number;
  if (smallestUnit === TemporalUnit.Hour) {
    maximum = HoursPerDay;
  } else if (smallestUnit === TemporalUnit.Minute) {
    maximum = MinutesPerHour * HoursPerDay;
  } else if (smallestUnit === TemporalUnit.Second) {
    maximum = SecondsPerMinute * MinutesPerHour * HoursPerDay;
  } else if (smallestUnit === TemporalUnit.Millisecond) {
    maximum = msPerDay;
  } else if (smallestUnit === TemporalUnit.Microsecond) {
    maximum = 1e3 * msPerDay;
  } else {
    Assert(smallestUnit === TemporalUnit.Nanosecond);
    maximum = nsPerDay;
  }
  Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, true));
  const roundedNs = RoundTemporalInstant(instant.EpochNanoseconds, roundingIncrement, smallestUnit, roundingMode);
  return X(CreateTemporalInstant(roundedNs));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.equals */
function* InstantProto_equals([_other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  const other = Q(yield* ToTemporalInstant(_other));
  return instant.EpochNanoseconds === other.EpochNanoseconds ? Value.true : Value.false;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tostring */
function* InstantProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const instant = Q(thisTemporalInstantValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const digits = Q(yield* GetTemporalFractionalSecondDigitsOption(resolvedOptions));
  const roundingMode = Q(yield* GetRoundingModeOption(resolvedOptions, RoundingMode.Trunc));
  const smallestUnit = Q(yield* GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'unset'));
  const _timeZone = Q(yield* Get(resolvedOptions, Value('timeZone')));
  Q(ValidateTemporalUnitValue(smallestUnit, 'time'));
  if (smallestUnit === TemporalUnit.Hour) {
    return Throw.RangeError('smallestUnit cannot be hour');
  }
  let timeZone: TimeZoneIdentifier | undefined;
  if (!(_timeZone instanceof UndefinedValue)) {
    timeZone = Q(ToTemporalTimeZoneIdentifier(_timeZone));
  }
  const precision = ToSecondsStringPrecisionRecord(
    smallestUnit as Exclude<TimeUnit, TemporalUnit.Hour> | 'unset',
    digits,
  );
  const roundedNs = RoundTemporalInstant(instant.EpochNanoseconds, precision.Increment, precision.Unit, roundingMode);
  const roundedInstant = X(CreateTemporalInstant(roundedNs));
  return Value(TemporalInstantToString(roundedInstant, timeZone, precision.Precision));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tolocalestring */
function InstantProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Value(TemporalInstantToString(instant, undefined, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tojson */
function InstantProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const instant = Q(thisTemporalInstantValue(thisValue));
  return Value(TemporalInstantToString(instant, undefined, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.valueof */
function InstantProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalInstantValue(thisValue));
  return Throw.TypeError('Temporal.Instant cannot be converted to primitive value If you are comparing two Temporal.Duration objects with > or <, use Temporal.Instant.compare() instead.');
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tozoneddatetimeiso */
function InstantProto_toZonedDateTimeISO([_timeZone = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const instant = Q(thisTemporalInstantValue(thisValue));
  const timeZone = Q(ToTemporalTimeZoneIdentifier(_timeZone));
  return X(CreateTemporalZonedDateTime(instant.EpochNanoseconds, timeZone, 'iso8601'));
}

export function bootstrapTemporalInstantPrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['epochMilliseconds', [InstantProto_epochMillisecondsGetter]],
    ['epochNanoseconds', [InstantProto_epochNanosecondsGetter]],
    ['add', InstantProto_add, 1],
    ['subtract', InstantProto_subtract, 1],
    ['until', InstantProto_until, 1],
    ['since', InstantProto_since, 1],
    ['round', InstantProto_round, 1],
    ['equals', InstantProto_equals, 1],
    ['toString', InstantProto_toString, 0],
    ['toLocaleString', InstantProto_toLocaleString, 0],
    ['toJSON', InstantProto_toJSON, 0],
    ['valueOf', InstantProto_valueOf, 0],
    ['toZonedDateTimeISO', InstantProto_toZonedDateTimeISO, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.Instant');
  realmRec.Intrinsics['%Temporal.Instant.prototype%'] = prototype;
  return prototype;
}
