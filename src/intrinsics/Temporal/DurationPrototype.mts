import { bootstrapPrototype } from '../bootstrap.mts';
import { abs } from '../../abstract-ops/math.mts';
import { __ts_cast__ } from '../../utils/language.mts';
import {
  GetRoundingIncrementOption, GetRoundingModeOption, RoundingMode,
} from '../../abstract-ops/temporal/addition.mts';
import {
  type TemporalDurationObject,
} from './Duration.mts';
import {
  AddDurations,
  AddTime,
  AddZonedDateTime,
  AdjustDateDurationRecord,
  Assert,
  CalendarDateAdd,
  CombineDateAndTimeDuration,
  CombineISODateAndTimeRecord,
  CreateDataPropertyOrThrow,
  CreateDateDurationRecord,
  CreateNegatedTemporalDuration,
  CreateTemporalDuration,
  DefaultTemporalLargestUnit,
  DifferencePlainDateTimeWithRounding,
  DifferencePlainDateTimeWithTotal,
  DifferenceZonedDateTimeWithRounding,
  DifferenceZonedDateTimeWithTotal,
  DurationSign,
  F,
  GetTemporalFractionalSecondDigitsOption,
  GetTemporalRelativeToOption,
  GetTemporalUnitValuedOption,
  IsCalendarUnit,
  JSStringValue,
  LargerOfTwoTemporalUnits,
  MaximumTemporalDurationRoundingIncrement,
  MidnightTimeRecord,
  OrdinaryObjectCreate,
  Q,
  Realm,
  RequireInternalSlot,
  RoundNumberToIncrement,
  RoundTimeDuration,
  TemporalDurationFromInternal,
  TemporalDurationToString,
  TemporalUnit,
  Throw,
  ToInternalDurationRecord,
  ToInternalDurationRecordWith24HourDays,
  ToSecondsStringPrecisionRecord,
  TotalTimeDuration,
  ToPartialDurationRecord,
  UndefinedValue,
  ValidateTemporalRoundingIncrement,
  ValidateTemporalUnitValue,
  Value,
  X,
  isDateUnit,
  ZeroDateDuration,
  type Arguments,
  type FunctionCallContext,
  type PlainCompletion,
  type TimeUnit,
  type ValueEvaluator,
  type MathematicalValue,
  type Integer,
  GetOptionsObject,
} from '#self';

function thisTemporalDurationValue(value: Value): PlainCompletion<TemporalDurationObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalDuration'));
  return value as TemporalDurationObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.years */
function Temporal_DurationProto_years_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Years));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.months */
function Temporal_DurationProto_months_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Months));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.weeks */
function Temporal_DurationProto_weeks_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Weeks));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.days */
function Temporal_DurationProto_days_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Days));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.hours */
function Temporal_DurationProto_hours_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Hours));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.minutes */
function Temporal_DurationProto_minutes_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Minutes));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.seconds */
function Temporal_DurationProto_seconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Seconds));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.milliseconds */
function Temporal_DurationProto_milliseconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Milliseconds));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.microseconds */
function Temporal_DurationProto_microseconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Microseconds));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.nanoseconds */
function Temporal_DurationProto_nanoseconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(Number(duration.Nanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.sign */
function Temporal_DurationProto_sign_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return F(DurationSign(duration));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.blank */
function Temporal_DurationProto_blank_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return DurationSign(duration) === 0 ? Value.true : Value.false;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.with */
function* Temporal_DurationProto_with([_temporalDurationLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
  const temporalDurationLike = Q(yield* ToPartialDurationRecord(_temporalDurationLike));
  const years = BigInt(temporalDurationLike.Years ?? duration.Years);
  const months = BigInt(temporalDurationLike.Months ?? duration.Months);
  const weeks = BigInt(temporalDurationLike.Weeks ?? duration.Weeks);
  const days = BigInt(temporalDurationLike.Days ?? duration.Days);
  const hours = BigInt(temporalDurationLike.Hours ?? duration.Hours);
  const minutes = BigInt(temporalDurationLike.Minutes ?? duration.Minutes);
  const seconds = BigInt(temporalDurationLike.Seconds ?? duration.Seconds);
  const milliseconds = BigInt(temporalDurationLike.Milliseconds ?? duration.Milliseconds);
  const microseconds = BigInt(temporalDurationLike.Microseconds ?? duration.Microseconds);
  const nanoseconds = BigInt(temporalDurationLike.Nanoseconds ?? duration.Nanoseconds);
  return Q(yield* CreateTemporalDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.negated */
function Temporal_DurationProto_negated(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return CreateNegatedTemporalDuration(duration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.abs */
function* Temporal_DurationProto_abs(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return X(CreateTemporalDuration(
    abs(duration.Years),
    abs(duration.Months),
    abs(duration.Weeks),
    abs(duration.Days),
    abs(duration.Hours),
    abs(duration.Minutes),
    abs(duration.Seconds),
    abs(duration.Milliseconds),
    abs(duration.Microseconds),
    abs(duration.Nanoseconds),
  ));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.add */
function* Temporal_DurationProto_add([other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return Q(yield* AddDurations('add', duration, other));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.subtract */
function* Temporal_DurationProto_subtract([other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return Q(yield* AddDurations('subtract', duration, other));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.round */
function* Temporal_DurationProto_round([roundTo = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
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

  let smallestUnitPresent = true;
  let largestUnitPresent = true;

  const largestUnitOption = Q(yield* GetTemporalUnitValuedOption(roundTo, 'largestUnit', 'unset'));
  const relativeToRecord = Q(yield* GetTemporalRelativeToOption(roundTo));
  const zonedRelativeTo = relativeToRecord.ZonedRelativeTo;
  const plainRelativeTo = relativeToRecord.PlainRelativeTo;
  const roundingIncrement = Q(yield* GetRoundingIncrementOption(roundTo));
  const roundingMode = Q(yield* GetRoundingModeOption(roundTo, RoundingMode.HalfExpand));
  let smallestUnit = Q(yield* GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'unset'));
  if (smallestUnit === 'auto') return Throw.RangeError('smallestUnit cannot be auto');

  if (smallestUnit === 'unset') {
    smallestUnitPresent = false;
    smallestUnit = TemporalUnit.Nanosecond;
  }
  __ts_cast__<TemporalUnit>(smallestUnit);

  const existingLargestUnit = DefaultTemporalLargestUnit(duration);
  const defaultLargestUnit = LargerOfTwoTemporalUnits(existingLargestUnit, smallestUnit);
  let largestUnit;
  if (largestUnitOption === 'unset') {
    largestUnitPresent = false;
    largestUnit = defaultLargestUnit;
  } else if (largestUnitOption === 'auto') {
    largestUnit = defaultLargestUnit;
  } else {
    largestUnit = largestUnitOption;
  }

  if (!smallestUnitPresent && !largestUnitPresent) {
    return Throw.RangeError('smallestUnit and largestUnit cannot both be omitted');
  }
  if (LargerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit) {
    return Throw.RangeError('largestUnit must be larger than smallestUnit');
  }

  const maximum = MaximumTemporalDurationRoundingIncrement(smallestUnit);
  if (maximum !== 'unset') {
    Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, false));
  }
  if (roundingIncrement > 1 && largestUnit !== smallestUnit && isDateUnit(smallestUnit)) {
    return Throw.RangeError('roundingIncrement must be 1 when rounding a date unit to a larger unit');
  }

  if (zonedRelativeTo !== undefined) {
    let internalDuration = ToInternalDurationRecord(duration);
    const timeZone = zonedRelativeTo.TimeZone;
    const calendar = zonedRelativeTo.Calendar;
    const relativeEpochNs = zonedRelativeTo.EpochNanoseconds;
    const targetEpochNs = Q(AddZonedDateTime(relativeEpochNs, timeZone, calendar, internalDuration, 'constrain'));
    internalDuration = Q(DifferenceZonedDateTimeWithRounding(relativeEpochNs, targetEpochNs, timeZone, calendar, largestUnit, roundingIncrement, smallestUnit, roundingMode));
    if (isDateUnit(largestUnit)) {
      largestUnit = TemporalUnit.Hour;
    }
    return Q(yield* TemporalDurationFromInternal(internalDuration, largestUnit));
  }

  if (plainRelativeTo !== undefined) {
    let internalDuration = ToInternalDurationRecordWith24HourDays(duration);
    const targetTime = AddTime(MidnightTimeRecord(), internalDuration.Time);
    const calendar = plainRelativeTo.Calendar;
    const dateDuration = Q(AdjustDateDurationRecord(internalDuration.Date, targetTime.Days));
    const targetDate = Q(CalendarDateAdd(calendar, plainRelativeTo.ISODate, dateDuration, 'constrain'));
    const isoDateTime = CombineISODateAndTimeRecord(plainRelativeTo.ISODate, MidnightTimeRecord());
    const targetDateTime = CombineISODateAndTimeRecord(targetDate, targetTime);
    internalDuration = Q(DifferencePlainDateTimeWithRounding(isoDateTime, targetDateTime, calendar, largestUnit, roundingIncrement, smallestUnit, roundingMode));
    return Q(yield* TemporalDurationFromInternal(internalDuration, largestUnit));
  }

  if (IsCalendarUnit(existingLargestUnit) || IsCalendarUnit(largestUnit)) {
    return Throw.RangeError('relativeTo is required for calendar units');
  }
  Assert(IsCalendarUnit(smallestUnit) === false);

  let internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  if (smallestUnit === TemporalUnit.Day) {
    const fractionalDays = TotalTimeDuration(internalDuration.Time, TemporalUnit.Day);
    const days = RoundNumberToIncrement(fractionalDays, roundingIncrement, roundingMode);
    const dateDuration = Q(CreateDateDurationRecord(0n, 0n, 0n, days));
    internalDuration = CombineDateAndTimeDuration(dateDuration, 0n);
  } else {
    const timeDuration = Q(RoundTimeDuration(internalDuration.Time, roundingIncrement, smallestUnit, roundingMode));
    internalDuration = CombineDateAndTimeDuration(ZeroDateDuration(), timeDuration);
  }
  return Q(yield* TemporalDurationFromInternal(internalDuration, largestUnit));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total */
function* Temporal_DurationProto_total([totalOf = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
  if (totalOf instanceof UndefinedValue) {
    return Throw.TypeError('totalOf is required');
  }
  if (totalOf instanceof JSStringValue) {
    const paramString = totalOf;
    totalOf = OrdinaryObjectCreate(Value.null);
    X(CreateDataPropertyOrThrow(totalOf, Value('unit'), paramString));
  } else {
    totalOf = Q(GetOptionsObject(totalOf));
  }

  const relativeToRecord = Q(yield* GetTemporalRelativeToOption(totalOf));
  const zonedRelativeTo = relativeToRecord.ZonedRelativeTo;
  const plainRelativeTo = relativeToRecord.PlainRelativeTo;
  const unit = Q(yield* GetTemporalUnitValuedOption(totalOf, 'unit', 'required'));
  Assert(unit !== 'unset');
  if (unit === 'auto') return Throw.RangeError('unit cannot be auto');

  let total: MathematicalValue;
  if (zonedRelativeTo !== undefined) {
    const internalDuration = ToInternalDurationRecord(duration);
    const timeZone = zonedRelativeTo.TimeZone;
    const calendar = zonedRelativeTo.Calendar;
    const relativeEpochNs = zonedRelativeTo.EpochNanoseconds;
    const targetEpochNs = Q(AddZonedDateTime(relativeEpochNs, timeZone, calendar, internalDuration, 'constrain'));
    total = Q(DifferenceZonedDateTimeWithTotal(relativeEpochNs, targetEpochNs, timeZone, calendar, unit));
  } else if (plainRelativeTo !== undefined) {
    const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
    const targetTime = AddTime(MidnightTimeRecord(), internalDuration.Time);
    const calendar = plainRelativeTo.Calendar;
    const dateDuration = Q(AdjustDateDurationRecord(internalDuration.Date, targetTime.Days));
    const targetDate = Q(CalendarDateAdd(calendar, plainRelativeTo.ISODate, dateDuration, 'constrain'));
    const isoDateTime = CombineISODateAndTimeRecord(plainRelativeTo.ISODate, MidnightTimeRecord());
    const targetDateTime = CombineISODateAndTimeRecord(targetDate, targetTime);
    total = Q(DifferencePlainDateTimeWithTotal(isoDateTime, targetDateTime, calendar, unit));
  } else {
    const largestUnit = DefaultTemporalLargestUnit(duration);
    if (IsCalendarUnit(largestUnit) || IsCalendarUnit(unit)) {
      return Throw.RangeError('relativeTo is required for calendar units');
    }
    const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
    total = TotalTimeDuration(internalDuration.Time, unit);
  }
  return F(total.toNumber());
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tostring */
function* Temporal_DurationProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const duration = Q(thisTemporalDurationValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const digits = Q(yield* GetTemporalFractionalSecondDigitsOption(resolvedOptions));
  const roundingMode = Q(yield* GetRoundingModeOption(resolvedOptions, RoundingMode.Trunc));
  const smallestUnit = Q(yield* GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'unset'));
  Q(ValidateTemporalUnitValue(smallestUnit, 'time'));
  __ts_cast__<TimeUnit | 'unset'>(smallestUnit);

  if (smallestUnit === TemporalUnit.Hour || smallestUnit === TemporalUnit.Minute) {
    return Throw.RangeError('smallestUnit cannot be hour or minute');
  }

  const precision = ToSecondsStringPrecisionRecord(smallestUnit, digits);

  if (precision.Unit === TemporalUnit.Nanosecond && precision.Increment === 1n) {
    return Value(TemporalDurationToString(duration, precision.Precision));
  }

  const largestUnit = DefaultTemporalLargestUnit(duration);
  let internalDuration = ToInternalDurationRecord(duration);
  const timeDuration = Q(RoundTimeDuration(internalDuration.Time, precision.Increment, precision.Unit, roundingMode));
  internalDuration = CombineDateAndTimeDuration(internalDuration.Date, timeDuration);
  const roundedLargestUnit = LargerOfTwoTemporalUnits(largestUnit, TemporalUnit.Second);
  const roundedDuration = Q(yield* TemporalDurationFromInternal(internalDuration, roundedLargestUnit));
  return Value(TemporalDurationToString(roundedDuration, precision.Precision as Integer | 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tojson */
function Temporal_DurationProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return Value(TemporalDurationToString(duration, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tolocalestring */
function Temporal_DurationProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const duration = Q(thisTemporalDurationValue(thisValue));
  return Value(TemporalDurationToString(duration, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.valueof */
function Temporal_DurationProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalDurationValue(thisValue));
  return Throw.TypeError('Temporal.Duration cannot be converted to primitive value. If you are comparing two Temporal.Duration objects with > or <, use Temporal.Duration.compare() instead.');
}

export function bootstrapTemporalDurationPrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['years', [Temporal_DurationProto_years_getter]],
    ['months', [Temporal_DurationProto_months_getter]],
    ['weeks', [Temporal_DurationProto_weeks_getter]],
    ['days', [Temporal_DurationProto_days_getter]],
    ['hours', [Temporal_DurationProto_hours_getter]],
    ['minutes', [Temporal_DurationProto_minutes_getter]],
    ['seconds', [Temporal_DurationProto_seconds_getter]],
    ['milliseconds', [Temporal_DurationProto_milliseconds_getter]],
    ['microseconds', [Temporal_DurationProto_microseconds_getter]],
    ['nanoseconds', [Temporal_DurationProto_nanoseconds_getter]],
    ['sign', [Temporal_DurationProto_sign_getter]],
    ['blank', [Temporal_DurationProto_blank_getter]],
    ['with', Temporal_DurationProto_with, 1],
    ['negated', Temporal_DurationProto_negated, 0],
    ['abs', Temporal_DurationProto_abs, 0],
    ['add', Temporal_DurationProto_add, 1],
    ['subtract', Temporal_DurationProto_subtract, 1],
    ['round', Temporal_DurationProto_round, 1],
    ['total', Temporal_DurationProto_total, 1],
    ['toString', Temporal_DurationProto_toString, 0],
    ['toJSON', Temporal_DurationProto_toJSON, 0],
    ['toLocaleString', Temporal_DurationProto_toLocaleString, 0],
    ['valueOf', Temporal_DurationProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.Duration');
  realmRec.Intrinsics['%Temporal.Duration.prototype%'] = prototype;
  return prototype;
}
