import { bootstrapPrototype } from '../bootstrap.mts';
import {
  GetRoundingIncrementOption, GetRoundingModeOption, RoundingMode,
} from '../../abstract-ops/temporal/addition.mts';
import {
  GetTemporalFractionalSecondDigitsOption,
  GetTemporalOverflowOption,
  GetTemporalUnitValuedOption,
  IsPartialTemporalObject,
  MaximumTemporalDurationRoundingIncrement,
  TemporalUnit,
  ToSecondsStringPrecisionRecord,
  ValidateTemporalRoundingIncrement,
  ValidateTemporalUnitValue,
  type TimeUnit,
} from '../../abstract-ops/temporal/temporal.mts';
import {
  AddDurationToTime,
  CompareTimeRecord,
  CreateTemporalTime,
  DifferenceTemporalPlainTime,
  RegulateTime,
  RoundTime,
  TimeRecordToString,
  ToTemporalTime,
  ToTemporalTimeRecord,
} from '../../abstract-ops/temporal/plain-time.mts';
import type { TemporalPlainTimeObject } from './PlainTime.mts';
import {
  Assert,
  CreateDataPropertyOrThrow,
  F,
  GetOptionsObject,
  JSStringValue,
  ObjectValue,
  OrdinaryObjectCreate,
  Q,
  RequireInternalSlot,
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

function thisTemporalTimeValue(value: Value): PlainCompletion<TemporalPlainTimeObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalTime'));
  return value as TemporalPlainTimeObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.hour */
function Temporal_PlainTimeProto_hour_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return F(Number(plainTime.Time.Hour));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.minute */
function Temporal_PlainTimeProto_minute_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return F(Number(plainTime.Time.Minute));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.second */
function Temporal_PlainTimeProto_second_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return F(Number(plainTime.Time.Second));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.millisecond */
function Temporal_PlainTimeProto_millisecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return F(Number(plainTime.Time.Millisecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.microsecond */
function Temporal_PlainTimeProto_microsecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return F(Number(plainTime.Time.Microsecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.nanosecond */
function Temporal_PlainTimeProto_nanosecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return F(Number(plainTime.Time.Nanosecond));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.add */
function* Temporal_PlainTimeProto_add([temporalDurationLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return Q(yield* AddDurationToTime('add', plainTime, temporalDurationLike));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.subtract */
function* Temporal_PlainTimeProto_subtract([temporalDurationLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return Q(yield* AddDurationToTime('subtract', plainTime, temporalDurationLike));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.with */
function* Temporal_PlainTimeProto_with([temporalTimeLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  if (!Q(yield* IsPartialTemporalObject(temporalTimeLike))) {
    return Throw.TypeError('$1 is not a partial Temporal object', temporalTimeLike);
  }
  const partialTime = Q(yield* ToTemporalTimeRecord(temporalTimeLike as ObjectValue, 'partial'));
  const hour = partialTime.Hour ?? plainTime.Time.Hour;
  const minute = partialTime.Minute ?? plainTime.Time.Minute;
  const second = partialTime.Second ?? plainTime.Time.Second;
  const millisecond = partialTime.Millisecond ?? plainTime.Time.Millisecond;
  const microsecond = partialTime.Microsecond ?? plainTime.Time.Microsecond;
  const nanosecond = partialTime.Nanosecond ?? plainTime.Time.Nanosecond;
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const result = Q(RegulateTime(hour, minute, second, millisecond, microsecond, nanosecond, overflow));
  return Q(yield* CreateTemporalTime(result));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.until */
function* Temporal_PlainTimeProto_until([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return Q(yield* DifferenceTemporalPlainTime('until', plainTime, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.since */
function* Temporal_PlainTimeProto_since([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return Q(yield* DifferenceTemporalPlainTime('since', plainTime, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.round */
function* Temporal_PlainTimeProto_round([roundTo = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  if (roundTo instanceof UndefinedValue) {
    return Throw.TypeError('Options parameter is required');
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
  const maximum = MaximumTemporalDurationRoundingIncrement(smallestUnit as TemporalUnit);
  Assert(maximum !== 'unset');
  Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, false));
  const result = RoundTime(plainTime.Time, roundingIncrement, smallestUnit as TimeUnit | TemporalUnit.Day, roundingMode);
  return Q(yield* CreateTemporalTime(result));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.equals */
function* Temporal_PlainTimeProto_equals([_other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  const other = Q(yield* ToTemporalTime(_other));
  return CompareTimeRecord(plainTime.Time, other.Time) === 0n ? Value.true : Value.false;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tostring */
function* Temporal_PlainTimeProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const digits = Q(yield* GetTemporalFractionalSecondDigitsOption(resolvedOptions));
  const roundingMode = Q(yield* GetRoundingModeOption(resolvedOptions, 3));
  const smallestUnit = Q(yield* GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'unset'));
  Q(ValidateTemporalUnitValue(smallestUnit, 'time'));
  if (smallestUnit === TemporalUnit.Hour) {
    return Throw.RangeError('smallestUnit cannot be hour');
  }
  const precision = ToSecondsStringPrecisionRecord(
    smallestUnit as Exclude<TimeUnit, TemporalUnit.Hour> | 'unset',
    digits,
  );
  const roundResult = RoundTime(plainTime.Time, precision.Increment, precision.Unit, roundingMode);
  return Value(TimeRecordToString(roundResult, precision.Precision));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tolocalestring */
function Temporal_PlainTimeProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return Value(Q(TimeRecordToString(plainTime.Time, 'auto')));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tojson */
function Temporal_PlainTimeProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainTime = Q(thisTemporalTimeValue(thisValue));
  return Value(Q(TimeRecordToString(plainTime.Time, 'auto')));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.valueof */
function Temporal_PlainTimeProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalTimeValue(thisValue));
  return Throw.TypeError('Temporal.PlainTime cannot be converted to primitive value. If you are comparing two Temporal.PlainTime objects with > or <, use Temporal.PlainTime.compare() instead.');
}

export function bootstrapTemporalPlainTimePrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['hour', [Temporal_PlainTimeProto_hour_getter]],
    ['minute', [Temporal_PlainTimeProto_minute_getter]],
    ['second', [Temporal_PlainTimeProto_second_getter]],
    ['millisecond', [Temporal_PlainTimeProto_millisecond_getter]],
    ['microsecond', [Temporal_PlainTimeProto_microsecond_getter]],
    ['nanosecond', [Temporal_PlainTimeProto_nanosecond_getter]],
    ['add', Temporal_PlainTimeProto_add, 1],
    ['subtract', Temporal_PlainTimeProto_subtract, 1],
    ['with', Temporal_PlainTimeProto_with, 1],
    ['until', Temporal_PlainTimeProto_until, 1],
    ['since', Temporal_PlainTimeProto_since, 1],
    ['round', Temporal_PlainTimeProto_round, 1],
    ['equals', Temporal_PlainTimeProto_equals, 1],
    ['toString', Temporal_PlainTimeProto_toString, 0],
    ['toLocaleString', Temporal_PlainTimeProto_toLocaleString, 0],
    ['toJSON', Temporal_PlainTimeProto_toJSON, 0],
    ['valueOf', Temporal_PlainTimeProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.PlainTime');
  realmRec.Intrinsics['%Temporal.PlainTime.prototype%'] = prototype;
  return prototype;
}
