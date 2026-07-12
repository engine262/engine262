import { bootstrapPrototype } from '../bootstrap.mts';
import {
  GetRoundingIncrementOption, GetRoundingModeOption, RoundingMode,
} from '../../abstract-ops/temporal/addition.mts';
import {
  GetTemporalFractionalSecondDigitsOption,
  GetTemporalShowCalendarNameOption,
  GetTemporalUnitValuedOption,
  GetTemporalOverflowOption,
  GetTemporalDisambiguationOption,
  IsPartialTemporalObject,
  ISODateToFields,
  MaximumTemporalDurationRoundingIncrement,
  TemporalUnit,
  ToSecondsStringPrecisionRecord,
  ValidateTemporalRoundingIncrement,
  ValidateTemporalUnitValue,
  type TimeUnit,
} from '../../abstract-ops/temporal/temporal.mts';
import {
  CalendarEquals, CalendarISOToDate, CalendarMergeFields, PrepareCalendarFields,
  ToTemporalCalendarIdentifier,
} from '../../abstract-ops/temporal/calendar.mts';
import {
  CombineISODateAndTimeRecord,
  CompareISODateTime,
  CreateTemporalDateTime,
  DifferenceTemporalPlainDateTime,
  AddDurationToDateTime,
  InterpretTemporalDateTimeFields,
  FormatISODateTime,
  ISODateTimeWithinLimits,
  RoundISODateTime,
  ToTemporalDateTime,
} from '../../abstract-ops/temporal/plain-date-time.mts';
import { ToTimeRecordOrMidnight, CreateTemporalTime } from '../../abstract-ops/temporal/plain-time.mts';
import { CreateTemporalDate } from '../../abstract-ops/temporal/plain-date.mts';
import { CreateTemporalZonedDateTime } from '../../abstract-ops/temporal/zoned-datetime.mts';
import { GetEpochNanosecondsFor, ToTemporalTimeZoneIdentifier } from '../../abstract-ops/temporal/time-zone.mts';
import type { TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import type { TemporalPlainDateTimeObject } from './PlainDateTime.mts';
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

function thisTemporalDateTimeValue(value: Value): PlainCompletion<TemporalPlainDateTimeObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalDateTime'));
  return value as TemporalPlainDateTimeObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.calendarid */
function Temporal_PlainDateTimeProto_calendarId_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Value(plainDateTime.Calendar);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.era */
function Temporal_PlainDateTimeProto_era_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Value(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).Era);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.erayear */
function Temporal_PlainDateTimeProto_eraYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const result = CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).EraYear;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.year */
function Temporal_PlainDateTimeProto_year_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).Year));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.month */
function Temporal_PlainDateTimeProto_month_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).Month));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.monthcode */
function Temporal_PlainDateTimeProto_monthCode_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Value(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).MonthCode);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.day */
function Temporal_PlainDateTimeProto_day_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).Day));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.hour */
function Temporal_PlainDateTimeProto_hour_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(plainDateTime.ISODateTime.Time.Hour));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.minute */
function Temporal_PlainDateTimeProto_minute_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(plainDateTime.ISODateTime.Time.Minute));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.second */
function Temporal_PlainDateTimeProto_second_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(plainDateTime.ISODateTime.Time.Second));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.millisecond */
function Temporal_PlainDateTimeProto_millisecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(plainDateTime.ISODateTime.Time.Millisecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.microsecond */
function Temporal_PlainDateTimeProto_microsecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(plainDateTime.ISODateTime.Time.Microsecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.nanosecond */
function Temporal_PlainDateTimeProto_nanosecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(plainDateTime.ISODateTime.Time.Nanosecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.dayofweek */
function Temporal_PlainDateTimeProto_dayOfWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).DayOfWeek));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.dayofyear */
function Temporal_PlainDateTimeProto_dayOfYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).DayOfYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.weekofyear */
function Temporal_PlainDateTimeProto_weekOfYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const result = CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).WeekOfYear.Week;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.yearofweek */
function Temporal_PlainDateTimeProto_yearOfWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const result = CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).WeekOfYear.Year;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinweek */
function Temporal_PlainDateTimeProto_daysInWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).DaysInWeek));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinmonth */
function Temporal_PlainDateTimeProto_daysInMonth_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).DaysInMonth));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinyear */
function Temporal_PlainDateTimeProto_daysInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).DaysInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.monthsinyear */
function Temporal_PlainDateTimeProto_monthsInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return F(Number(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).MonthsInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.inleapyear */
function Temporal_PlainDateTimeProto_inLeapYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Value(CalendarISOToDate(plainDateTime.Calendar, plainDateTime.ISODateTime.ISODate).InLeapYear);
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.with */
function* Temporal_PlainDateTimeProto_with([temporalDateTimeLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  if (!Q(yield* IsPartialTemporalObject(temporalDateTimeLike))) {
    return Throw.TypeError('$1 is not a partial Temporal object', temporalDateTimeLike);
  }
  const calendar = plainDateTime.Calendar;
  let fields = ISODateToFields(calendar, plainDateTime.ISODateTime.ISODate, 'date');
  fields.Hour = plainDateTime.ISODateTime.Time.Hour;
  fields.Minute = plainDateTime.ISODateTime.Time.Minute;
  fields.Second = plainDateTime.ISODateTime.Time.Second;
  fields.Millisecond = plainDateTime.ISODateTime.Time.Millisecond;
  fields.Microsecond = plainDateTime.ISODateTime.Time.Microsecond;
  fields.Nanosecond = plainDateTime.ISODateTime.Time.Nanosecond;
  const partialDateTime = Q(yield* PrepareCalendarFields(calendar, temporalDateTimeLike as ObjectValue, ['year', 'month', 'month-code', 'day'], ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'], 'partial'));
  fields = CalendarMergeFields(calendar, fields, partialDateTime);
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const result = Q(yield* InterpretTemporalDateTimeFields(calendar, fields, overflow));
  return Q(yield* CreateTemporalDateTime(result, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.withplaintime */
function* Temporal_PlainDateTimeProto_withPlainTime([plainTimeLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const time = Q(yield* ToTimeRecordOrMidnight(plainTimeLike));
  const isoDateTime = CombineISODateAndTimeRecord(plainDateTime.ISODateTime.ISODate, time);
  return Q(yield* CreateTemporalDateTime(isoDateTime, plainDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.withcalendar */
function Temporal_PlainDateTimeProto_withCalendar([calendarLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const calendar = Q(ToTemporalCalendarIdentifier(calendarLike));
  return X(CreateTemporalDateTime(plainDateTime.ISODateTime, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.add */
function* Temporal_PlainDateTimeProto_add([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Q(yield* AddDurationToDateTime('add', plainDateTime, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.subtract */
function* Temporal_PlainDateTimeProto_subtract([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Q(yield* AddDurationToDateTime('subtract', plainDateTime, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.until */
function* Temporal_PlainDateTimeProto_until([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Q(yield* DifferenceTemporalPlainDateTime('until', plainDateTime, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.since */
function* Temporal_PlainDateTimeProto_since([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Q(yield* DifferenceTemporalPlainDateTime('since', plainDateTime, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.round */
function* Temporal_PlainDateTimeProto_round([roundTo = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
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
  Q(ValidateTemporalUnitValue(smallestUnit, 'time', [TemporalUnit.Day]));
  let maximum: bigint;
  let inclusive: boolean;
  if (smallestUnit === TemporalUnit.Day) {
    maximum = 1n;
    inclusive = true;
  } else {
    const maximum2 = MaximumTemporalDurationRoundingIncrement(smallestUnit as TemporalUnit);
    Assert(maximum2 !== 'unset');
    maximum = maximum2;
    inclusive = false;
  }
  Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, inclusive));
  if (smallestUnit === TemporalUnit.Nanosecond && roundingIncrement === 1n) {
    return X(CreateTemporalDateTime(plainDateTime.ISODateTime, plainDateTime.Calendar));
  }
  const result = RoundISODateTime(
    plainDateTime.ISODateTime,
    roundingIncrement,
    smallestUnit as TimeUnit,
    roundingMode,
  );
  return Q(yield* CreateTemporalDateTime(result, plainDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.equals */
function* Temporal_PlainDateTimeProto_equals([_other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const other = Q(yield* ToTemporalDateTime(_other));
  if (CompareISODateTime(plainDateTime.ISODateTime, other.ISODateTime) !== 0n) {
    return Value.false;
  }
  return Value(CalendarEquals(plainDateTime.Calendar, other.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tostring */
function* Temporal_PlainDateTimeProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const showCalendar = Q(yield* GetTemporalShowCalendarNameOption(resolvedOptions));
  const digits = Q(yield* GetTemporalFractionalSecondDigitsOption(resolvedOptions));
  const roundingMode = Q(yield* GetRoundingModeOption(resolvedOptions, 3));
  const smallestUnit = Q(yield* GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'unset'));
  Q(ValidateTemporalUnitValue(smallestUnit, 'time'));
  if (smallestUnit === TemporalUnit.Hour) {
    return Throw.RangeError('smallestUnit cannot be hour');
  }
  const precision = ToSecondsStringPrecisionRecord(smallestUnit as Exclude<TimeUnit, TemporalUnit.Hour> | 'unset', digits);
  const result = RoundISODateTime(plainDateTime.ISODateTime, precision.Increment, precision.Unit, roundingMode);
  if (!ISODateTimeWithinLimits(result)) {
    return Throw.RangeError('DateTime outside of range');
  }
  return Value(FormatISODateTime(result, plainDateTime.Calendar, precision.Precision, showCalendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tolocalestring */
function Temporal_PlainDateTimeProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Value(FormatISODateTime(plainDateTime.ISODateTime, plainDateTime.Calendar, 'auto', 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tojson */
function Temporal_PlainDateTimeProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return Value(FormatISODateTime(plainDateTime.ISODateTime, plainDateTime.Calendar, 'auto', 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.valueof */
function Temporal_PlainDateTimeProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalDateTimeValue(thisValue));
  return Throw.TypeError('Temporal.PlainDateTime cannot be converted to primitive value. If you are comparing two Temporal.PlainDateTime objects with > or <, use Temporal.PlainDateTime.compare() instead.');
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tozoneddatetime */
function* Temporal_PlainDateTimeProto_toZonedDateTime([temporalTimeZoneLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  const timeZone = Q(ToTemporalTimeZoneIdentifier(temporalTimeZoneLike)) as TimeZoneIdentifier;
  const resolvedOptions = Q(GetOptionsObject(options));
  const disambiguation = Q(yield* GetTemporalDisambiguationOption(resolvedOptions));
  const epochNs = Q(GetEpochNanosecondsFor(timeZone, plainDateTime.ISODateTime, disambiguation));
  return X(CreateTemporalZonedDateTime(epochNs, timeZone, plainDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.toplaindate */
function Temporal_PlainDateTimeProto_toPlainDate(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return X(CreateTemporalDate(plainDateTime.ISODateTime.ISODate, plainDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.toplaintime */
function Temporal_PlainDateTimeProto_toPlainTime(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDateTime = Q(thisTemporalDateTimeValue(thisValue));
  return X(CreateTemporalTime(plainDateTime.ISODateTime.Time));
}

export function bootstrapTemporalPlainDateTimePrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['calendarId', [Temporal_PlainDateTimeProto_calendarId_getter]],
    ['era', [Temporal_PlainDateTimeProto_era_getter]],
    ['eraYear', [Temporal_PlainDateTimeProto_eraYear_getter]],
    ['year', [Temporal_PlainDateTimeProto_year_getter]],
    ['month', [Temporal_PlainDateTimeProto_month_getter]],
    ['monthCode', [Temporal_PlainDateTimeProto_monthCode_getter]],
    ['day', [Temporal_PlainDateTimeProto_day_getter]],
    ['hour', [Temporal_PlainDateTimeProto_hour_getter]],
    ['minute', [Temporal_PlainDateTimeProto_minute_getter]],
    ['second', [Temporal_PlainDateTimeProto_second_getter]],
    ['millisecond', [Temporal_PlainDateTimeProto_millisecond_getter]],
    ['microsecond', [Temporal_PlainDateTimeProto_microsecond_getter]],
    ['nanosecond', [Temporal_PlainDateTimeProto_nanosecond_getter]],
    ['dayOfWeek', [Temporal_PlainDateTimeProto_dayOfWeek_getter]],
    ['dayOfYear', [Temporal_PlainDateTimeProto_dayOfYear_getter]],
    ['weekOfYear', [Temporal_PlainDateTimeProto_weekOfYear_getter]],
    ['yearOfWeek', [Temporal_PlainDateTimeProto_yearOfWeek_getter]],
    ['daysInWeek', [Temporal_PlainDateTimeProto_daysInWeek_getter]],
    ['daysInMonth', [Temporal_PlainDateTimeProto_daysInMonth_getter]],
    ['daysInYear', [Temporal_PlainDateTimeProto_daysInYear_getter]],
    ['monthsInYear', [Temporal_PlainDateTimeProto_monthsInYear_getter]],
    ['inLeapYear', [Temporal_PlainDateTimeProto_inLeapYear_getter]],
    ['with', Temporal_PlainDateTimeProto_with, 1],
    ['withPlainTime', Temporal_PlainDateTimeProto_withPlainTime, 0],
    ['withCalendar', Temporal_PlainDateTimeProto_withCalendar, 1],
    ['add', Temporal_PlainDateTimeProto_add, 1],
    ['subtract', Temporal_PlainDateTimeProto_subtract, 1],
    ['until', Temporal_PlainDateTimeProto_until, 1],
    ['since', Temporal_PlainDateTimeProto_since, 1],
    ['round', Temporal_PlainDateTimeProto_round, 1],
    ['equals', Temporal_PlainDateTimeProto_equals, 1],
    ['toString', Temporal_PlainDateTimeProto_toString, 0],
    ['toLocaleString', Temporal_PlainDateTimeProto_toLocaleString, 0],
    ['toJSON', Temporal_PlainDateTimeProto_toJSON, 0],
    ['valueOf', Temporal_PlainDateTimeProto_valueOf, 0],
    ['toZonedDateTime', Temporal_PlainDateTimeProto_toZonedDateTime, 1],
    ['toPlainDate', Temporal_PlainDateTimeProto_toPlainDate, 0],
    ['toPlainTime', Temporal_PlainDateTimeProto_toPlainTime, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.PlainDateTime');
  realmRec.Intrinsics['%Temporal.PlainDateTime.prototype%'] = prototype;
  return prototype;
}
