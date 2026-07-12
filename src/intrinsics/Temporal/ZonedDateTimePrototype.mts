import { bootstrapPrototype } from '../bootstrap.mts';
import {
  GetRoundingIncrementOption,
  GetRoundingModeOption,
  IsOffsetTimeZoneIdentifier,
  RoundingMode,
} from '../../abstract-ops/temporal/addition.mts';
import {
  GetTemporalFractionalSecondDigitsOption,
  GetDirectionOption,
  GetTemporalDisambiguationOption,
  GetTemporalOffsetOption,
  GetTemporalOverflowOption,
  IsPartialTemporalObject,
  GetTemporalShowCalendarNameOption,
  GetTemporalShowOffsetOption,
  GetTemporalShowTimeZoneNameOption,
  GetTemporalUnitValuedOption,
  ISODateToFields,
  MaximumTemporalDurationRoundingIncrement,
  TemporalUnit,
  ToSecondsStringPrecisionRecord,
  ValidateTemporalRoundingIncrement,
  ValidateTemporalUnitValue,
  type TimeUnit,
} from '../../abstract-ops/temporal/temporal.mts';
import {
  CalendarEquals,
  CalendarISOToDate,
  CalendarMergeFields,
  PrepareCalendarFields,
  ToTemporalCalendarIdentifier,
} from '../../abstract-ops/temporal/calendar.mts';
import {
  AddDurationToZonedDateTime,
  CreateTemporalZonedDateTime,
  DifferenceTemporalZonedDateTime,
  InterpretISODateTimeOffset,
  TemporalZonedDateTimeToString,
  ToTemporalZonedDateTime,
} from '../../abstract-ops/temporal/zoned-datetime.mts';
import {
  GetISODateTimeFor,
  GetEpochNanosecondsFor,
  GetOffsetNanosecondsFor,
  GetNamedTimeZoneNextTransition,
  GetNamedTimeZonePreviousTransition,
  FormatUTCOffsetNanoseconds,
  TimeZoneEquals,
  ToTemporalTimeZoneIdentifier,
  GetStartOfDay,
} from '../../abstract-ops/temporal/time-zone.mts';
import { AddDaysToISODate, CreateTemporalDate } from '../../abstract-ops/temporal/plain-date.mts';
import { ParseDateTimeUTCOffset } from '../../parser/TemporalParser.mts';
import { CreateTemporalTime, ToTemporalTime } from '../../abstract-ops/temporal/plain-time.mts';
import {
  CombineISODateAndTimeRecord,
  CreateTemporalDateTime,
  InterpretTemporalDateTimeFields,
  RoundISODateTime,
} from '../../abstract-ops/temporal/plain-date-time.mts';
import { CreateTemporalInstant } from '../../abstract-ops/temporal/instant.mts';
import { __ts_cast__ } from '../../utils/language.mts';
import { floorDiv, min } from '../../abstract-ops/math.mts';
import type { TemporalZonedDateTimeObject } from './ZonedDateTime.mts';
import {
  AddTimeDurationToEpochNanoseconds,
  Assert,
  CreateDataPropertyOrThrow,
  F,
  JSStringValue,
  OrdinaryObjectCreate,
  type ObjectValue,
  Q,
  RequireInternalSlot,
  RoundTimeDurationToIncrement,
  Throw,
  TimeDurationFromEpochNanosecondsDifference,
  UndefinedValue,
  Value,
  X,
  type Arguments,
  type FunctionCallContext,
  type PlainCompletion,
  type Realm,
  type ValueEvaluator,
  TotalTimeDuration,
  GetOptionsObject,
} from '#self';

function thisTemporalZonedDateTimeValue(value: Value): PlainCompletion<TemporalZonedDateTimeObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalZonedDateTime'));
  return value as TemporalZonedDateTimeObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.calendarid */
function Temporal_ZonedDateTimeProto_calendarId_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  return Value(Q(thisTemporalZonedDateTimeValue(thisValue)).Calendar);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.timezoneid */
function Temporal_ZonedDateTimeProto_timeZoneId_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  return Value(Q(thisTemporalZonedDateTimeValue(thisValue)).TimeZone);
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.era */
function Temporal_ZonedDateTimeProto_era_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return Value(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).Era);
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.erayear */
function Temporal_ZonedDateTimeProto_eraYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  const result = CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).EraYear;
  if (result === undefined) return Value.undefined;
  return F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.year */
function Temporal_ZonedDateTimeProto_year_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).Year));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.yearofweek */
function Temporal_ZonedDateTimeProto_yearOfWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  const result = CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).WeekOfYear.Year;
  if (result === undefined) return Value.undefined;
  return F(Number(result));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.inleapyear */
function Temporal_ZonedDateTimeProto_inLeapYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return Value(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).InLeapYear);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.month */
function Temporal_ZonedDateTimeProto_month_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).Month));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.monthsinyear */
function Temporal_ZonedDateTimeProto_monthsInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).MonthsInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.monthcode */
function Temporal_ZonedDateTimeProto_monthCode_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return Value(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).MonthCode);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.day */
function Temporal_ZonedDateTimeProto_day_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).Day));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.dayofweek */
function Temporal_ZonedDateTimeProto_dayOfWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).DayOfWeek));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.dayofyear */
function Temporal_ZonedDateTimeProto_dayOfYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).DayOfYear));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.daysinweek */
function Temporal_ZonedDateTimeProto_daysInWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).DaysInWeek));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.daysinmonth */
function Temporal_ZonedDateTimeProto_daysInMonth_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).DaysInMonth));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.daysinyear */
function Temporal_ZonedDateTimeProto_daysInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).DaysInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hour */
function Temporal_ZonedDateTimeProto_hour_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds).Time.Hour));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.hoursinday */
function Temporal_ZonedDateTimeProto_hoursInDay_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const timeZone = zonedDateTime.TimeZone;
  const isoDateTime = GetISODateTimeFor(timeZone, zonedDateTime.EpochNanoseconds);
  const today = isoDateTime.ISODate;
  const tomorrow = AddDaysToISODate(today, 1n);
  const todayNs = Q(GetStartOfDay(timeZone, today));
  const tomorrowNs = Q(GetStartOfDay(timeZone, tomorrow));
  const diff = TimeDurationFromEpochNanosecondsDifference(tomorrowNs, todayNs);
  return F(TotalTimeDuration(diff, TemporalUnit.Hour).toNumber());
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.weekofyear */
function Temporal_ZonedDateTimeProto_weekOfYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return F(Number(CalendarISOToDate(zonedDateTime.Calendar, isoDateTime.ISODate).WeekOfYear.Week));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.minute */
function Temporal_ZonedDateTimeProto_minute_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds).Time.Minute));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.second */
function Temporal_ZonedDateTimeProto_second_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds).Time.Second));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.millisecond */
function Temporal_ZonedDateTimeProto_millisecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds).Time.Millisecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.microsecond */
function Temporal_ZonedDateTimeProto_microsecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds).Time.Microsecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.nanosecond */
function Temporal_ZonedDateTimeProto_nanosecond_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds).Time.Nanosecond));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.epochmilliseconds */
function Temporal_ZonedDateTimeProto_epochMilliseconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const ns = Q(thisTemporalZonedDateTimeValue(thisValue)).EpochNanoseconds;
  return F(Number(floorDiv(ns, BigInt(1e6))));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.epochnanoseconds */
function Temporal_ZonedDateTimeProto_epochNanoseconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  return Value(Q(thisTemporalZonedDateTimeValue(thisValue)).EpochNanoseconds);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.offsetnanoseconds */
function Temporal_ZonedDateTimeProto_offsetNanoseconds_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return F(Number(GetOffsetNanosecondsFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds)));
}

/** https://tc39.es/ecma262/pr/3759/#sec-get-temporal.zoneddatetime.prototype.offset */
function Temporal_ZonedDateTimeProto_offset_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const offsetNanoseconds = GetOffsetNanosecondsFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return Value(FormatUTCOffsetNanoseconds(offsetNanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.with */
function* Temporal_ZonedDateTimeProto_with([temporalZonedDateTimeLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  if (!Q(yield* IsPartialTemporalObject(temporalZonedDateTimeLike))) {
    return Throw.TypeError('$1 is not a partial Temporal object', temporalZonedDateTimeLike);
  }
  const epochNs = zonedDateTime.EpochNanoseconds;
  const timeZone = zonedDateTime.TimeZone;
  const calendar = zonedDateTime.Calendar;
  const offsetNanoseconds = GetOffsetNanosecondsFor(timeZone, epochNs);
  const isoDateTime = GetISODateTimeFor(timeZone, epochNs);
  let fields = ISODateToFields(calendar, isoDateTime.ISODate, 'date');
  fields.Hour = isoDateTime.Time.Hour;
  fields.Minute = isoDateTime.Time.Minute;
  fields.Second = isoDateTime.Time.Second;
  fields.Millisecond = isoDateTime.Time.Millisecond;
  fields.Microsecond = isoDateTime.Time.Microsecond;
  fields.Nanosecond = isoDateTime.Time.Nanosecond;
  fields.OffsetString = FormatUTCOffsetNanoseconds(offsetNanoseconds);
  const partialZonedDateTime = Q(yield* PrepareCalendarFields(calendar, temporalZonedDateTimeLike as ObjectValue, ['year', 'month', 'month-code', 'day'], ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset'], 'partial'));
  fields = CalendarMergeFields(calendar, fields, partialZonedDateTime);
  const resolvedOptions = Q(GetOptionsObject(options));
  const disambiguation = Q(yield* GetTemporalDisambiguationOption(resolvedOptions));
  const offset = Q(yield* GetTemporalOffsetOption(resolvedOptions, 'prefer'));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const dateTimeResult = Q(yield* InterpretTemporalDateTimeFields(calendar, fields, overflow));
  const offsetString = fields.OffsetString!;
  const newOffsetNanoseconds = X(ParseDateTimeUTCOffset(offsetString));
  const epochNanoseconds = Q(InterpretISODateTimeOffset(dateTimeResult.ISODate, dateTimeResult.Time, 'option', newOffsetNanoseconds, timeZone, disambiguation, offset, 'match-exactly'));
  return X(CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withplaintime */
function* Temporal_ZonedDateTimeProto_withPlainTime([plainTimeLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const timeZone = zonedDateTime.TimeZone;
  const calendar = zonedDateTime.Calendar;
  const isoDateTime = GetISODateTimeFor(timeZone, zonedDateTime.EpochNanoseconds);
  let epochNs;
  if (plainTimeLike instanceof UndefinedValue) {
    epochNs = Q(GetStartOfDay(timeZone, isoDateTime.ISODate));
  } else {
    const plainTime = Q(yield* ToTemporalTime(plainTimeLike));
    const resultISODateTime = CombineISODateAndTimeRecord(isoDateTime.ISODate, plainTime.Time);
    epochNs = Q(GetEpochNanosecondsFor(timeZone, resultISODateTime, 'compatible'));
  }
  return X(CreateTemporalZonedDateTime(epochNs, timeZone, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withtimezone */
function* Temporal_ZonedDateTimeProto_withTimeZone([timeZoneLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const timeZone = Q(ToTemporalTimeZoneIdentifier(timeZoneLike));
  return X(CreateTemporalZonedDateTime(zonedDateTime.EpochNanoseconds, timeZone, zonedDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withcalendar */
function Temporal_ZonedDateTimeProto_withCalendar([calendarLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const calendar = Q(ToTemporalCalendarIdentifier(calendarLike));
  return X(CreateTemporalZonedDateTime(zonedDateTime.EpochNanoseconds, zonedDateTime.TimeZone, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.add */
function* Temporal_ZonedDateTimeProto_add([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return Q(yield* AddDurationToZonedDateTime('add', zonedDateTime, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.subtract */
function* Temporal_ZonedDateTimeProto_subtract([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return Q(yield* AddDurationToZonedDateTime('subtract', zonedDateTime, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.until */
function* Temporal_ZonedDateTimeProto_until([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return Q(yield* DifferenceTemporalZonedDateTime('until', zonedDateTime, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.since */
function* Temporal_ZonedDateTimeProto_since([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return Q(yield* DifferenceTemporalZonedDateTime('since', zonedDateTime, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.round */
function* Temporal_ZonedDateTimeProto_round([roundTo = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
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
  let maximum;
  let inclusive;
  if (smallestUnit === TemporalUnit.Day) {
    maximum = 1n;
    inclusive = true;
  } else {
    maximum = MaximumTemporalDurationRoundingIncrement(smallestUnit as TemporalUnit);
    Assert(maximum !== 'unset');
    inclusive = false;
  }
  Q(ValidateTemporalRoundingIncrement(roundingIncrement, maximum, inclusive));
  if (smallestUnit === TemporalUnit.Nanosecond && roundingIncrement === 1n) {
    return X(CreateTemporalZonedDateTime(zonedDateTime.EpochNanoseconds, zonedDateTime.TimeZone, zonedDateTime.Calendar));
  }
  let thisNs = zonedDateTime.EpochNanoseconds;
  const timeZone = zonedDateTime.TimeZone;
  const calendar = zonedDateTime.Calendar;
  const isoDateTime = GetISODateTimeFor(timeZone, thisNs);
  let epochNanoseconds;
  if (smallestUnit === TemporalUnit.Day) {
    const dateStart = isoDateTime.ISODate;
    const dateEnd = AddDaysToISODate(dateStart, 1n);
    const startNs = Q(GetStartOfDay(timeZone, dateStart));
    Assert(thisNs >= startNs);
    const endNs = Q(GetStartOfDay(timeZone, dateEnd));
    thisNs = min(thisNs, endNs - 1n);
    const dayLengthNs = endNs - startNs;
    const dayProgressNs = TimeDurationFromEpochNanosecondsDifference(thisNs, startNs);
    const roundedDayNs = X(RoundTimeDurationToIncrement(dayProgressNs, dayLengthNs, roundingMode));
    epochNanoseconds = AddTimeDurationToEpochNanoseconds(roundedDayNs, startNs);
  } else {
    const roundResult = RoundISODateTime(isoDateTime, roundingIncrement, smallestUnit as TimeUnit | TemporalUnit.Day, roundingMode);
    const offsetNanoseconds = GetOffsetNanosecondsFor(timeZone, thisNs);
    epochNanoseconds = Q(InterpretISODateTimeOffset(roundResult.ISODate, roundResult.Time, 'option', offsetNanoseconds, timeZone, 'compatible', 'prefer', 'match-exactly'));
  }
  return X(CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.equals */
function* Temporal_ZonedDateTimeProto_equals([_other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const other = Q(yield* ToTemporalZonedDateTime(_other));
  if (zonedDateTime.EpochNanoseconds !== other.EpochNanoseconds) {
    return Value.false;
  }
  if (!TimeZoneEquals(zonedDateTime.TimeZone, other.TimeZone)) {
    return Value.false;
  }
  return Value(CalendarEquals(zonedDateTime.Calendar, other.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tostring */
function* Temporal_ZonedDateTimeProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const showCalendar = Q(yield* GetTemporalShowCalendarNameOption(resolvedOptions));
  const digits = Q(yield* GetTemporalFractionalSecondDigitsOption(resolvedOptions));
  const showOffset = Q(yield* GetTemporalShowOffsetOption(resolvedOptions));
  const roundingMode = Q(yield* GetRoundingModeOption(resolvedOptions, 3));
  const smallestUnit = Q(yield* GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'unset'));
  const showTimeZone = Q(yield* GetTemporalShowTimeZoneNameOption(resolvedOptions));
  Q(ValidateTemporalUnitValue(smallestUnit, 'time'));
  if (smallestUnit === TemporalUnit.Hour) {
    return Throw.RangeError('smallestUnit cannot be hour');
  }
  const precision = ToSecondsStringPrecisionRecord(
    smallestUnit as Exclude<TimeUnit, TemporalUnit.Hour> | 'unset',
    digits,
  );
  return Value(TemporalZonedDateTimeToString(zonedDateTime, precision.Precision, showCalendar, showTimeZone, showOffset, precision.Increment, precision.Unit, roundingMode));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tolocalestring */
function Temporal_ZonedDateTimeProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return Value(TemporalZonedDateTimeToString(zonedDateTime, 'auto', 'auto', 'auto', 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tojson */
function Temporal_ZonedDateTimeProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return Value(TemporalZonedDateTimeToString(zonedDateTime, 'auto', 'auto', 'auto', 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.valueof */
function Temporal_ZonedDateTimeProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalZonedDateTimeValue(thisValue));
  return Throw.TypeError('Temporal.ZonedDateTime cannot be converted to primitive value. If you are comparing two Temporal.ZonedDateTime objects with > or <, use Temporal.ZonedDateTime.compare() instead.');
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.startofday */
function Temporal_ZonedDateTimeProto_startOfDay(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const timeZone = zonedDateTime.TimeZone;
  const calendar = zonedDateTime.Calendar;
  const isoDateTime = GetISODateTimeFor(timeZone, zonedDateTime.EpochNanoseconds).ISODate;
  const epochNanoseconds = Q(GetStartOfDay(timeZone, isoDateTime));
  return X(CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.gettimezonetransition */
function* Temporal_ZonedDateTimeProto_getTimeZoneTransition([directionParam = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const timeZone = zonedDateTime.TimeZone;
  if (directionParam instanceof UndefinedValue) {
    return Throw.TypeError('directionParam is required');
  }
  if (directionParam instanceof JSStringValue) {
    const paramString = directionParam;
    directionParam = OrdinaryObjectCreate(Value.null);
    X(CreateDataPropertyOrThrow(directionParam, Value('direction'), paramString));
  } else {
    directionParam = Q(GetOptionsObject(directionParam));
  }
  const direction = Q(yield* GetDirectionOption(directionParam));
  if (IsOffsetTimeZoneIdentifier(timeZone)) {
    return Value.null;
  }
  let transition;
  if (direction === 'next') {
    transition = GetNamedTimeZoneNextTransition(timeZone, zonedDateTime.EpochNanoseconds);
  } else {
    Assert(direction === 'previous');
    transition = GetNamedTimeZonePreviousTransition(timeZone, zonedDateTime.EpochNanoseconds);
  }
  if (transition === null) return Value.null;
  return X(CreateTemporalZonedDateTime(transition, timeZone, zonedDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toinstant */
function Temporal_ZonedDateTimeProto_toInstant(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  return X(CreateTemporalInstant(zonedDateTime.EpochNanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaindate */
function Temporal_ZonedDateTimeProto_toPlainDate(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return X(CreateTemporalDate(isoDateTime.ISODate, zonedDateTime.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaintime */
function Temporal_ZonedDateTimeProto_toPlainTime(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return X(CreateTemporalTime(isoDateTime.Time));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaindatetime */
function Temporal_ZonedDateTimeProto_toPlainDateTime(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const zonedDateTime = Q(thisTemporalZonedDateTimeValue(thisValue));
  const isoDateTime = GetISODateTimeFor(zonedDateTime.TimeZone, zonedDateTime.EpochNanoseconds);
  return X(CreateTemporalDateTime(isoDateTime, zonedDateTime.Calendar));
}

export function bootstrapTemporalZonedDateTimePrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['calendarId', [Temporal_ZonedDateTimeProto_calendarId_getter]],
    ['timeZoneId', [Temporal_ZonedDateTimeProto_timeZoneId_getter]],
    ['era', [Temporal_ZonedDateTimeProto_era_getter]],
    ['eraYear', [Temporal_ZonedDateTimeProto_eraYear_getter]],
    ['year', [Temporal_ZonedDateTimeProto_year_getter]],
    ['yearOfWeek', [Temporal_ZonedDateTimeProto_yearOfWeek_getter]],
    ['inLeapYear', [Temporal_ZonedDateTimeProto_inLeapYear_getter]],
    ['month', [Temporal_ZonedDateTimeProto_month_getter]],
    ['monthCode', [Temporal_ZonedDateTimeProto_monthCode_getter]],
    ['monthsInYear', [Temporal_ZonedDateTimeProto_monthsInYear_getter]],
    ['day', [Temporal_ZonedDateTimeProto_day_getter]],
    ['weekOfYear', [Temporal_ZonedDateTimeProto_weekOfYear_getter]],
    ['dayOfWeek', [Temporal_ZonedDateTimeProto_dayOfWeek_getter]],
    ['dayOfYear', [Temporal_ZonedDateTimeProto_dayOfYear_getter]],
    ['daysInWeek', [Temporal_ZonedDateTimeProto_daysInWeek_getter]],
    ['daysInMonth', [Temporal_ZonedDateTimeProto_daysInMonth_getter]],
    ['daysInYear', [Temporal_ZonedDateTimeProto_daysInYear_getter]],
    ['hour', [Temporal_ZonedDateTimeProto_hour_getter]],
    ['hoursInDay', [Temporal_ZonedDateTimeProto_hoursInDay_getter]],
    ['minute', [Temporal_ZonedDateTimeProto_minute_getter]],
    ['second', [Temporal_ZonedDateTimeProto_second_getter]],
    ['millisecond', [Temporal_ZonedDateTimeProto_millisecond_getter]],
    ['microsecond', [Temporal_ZonedDateTimeProto_microsecond_getter]],
    ['nanosecond', [Temporal_ZonedDateTimeProto_nanosecond_getter]],
    ['epochMilliseconds', [Temporal_ZonedDateTimeProto_epochMilliseconds_getter]],
    ['epochNanoseconds', [Temporal_ZonedDateTimeProto_epochNanoseconds_getter]],
    ['offsetNanoseconds', [Temporal_ZonedDateTimeProto_offsetNanoseconds_getter]],
    ['offset', [Temporal_ZonedDateTimeProto_offset_getter]],
    ['with', Temporal_ZonedDateTimeProto_with, 1],
    ['withTimeZone', Temporal_ZonedDateTimeProto_withTimeZone, 1],
    ['withCalendar', Temporal_ZonedDateTimeProto_withCalendar, 1],
    ['withPlainTime', Temporal_ZonedDateTimeProto_withPlainTime, 0],
    ['add', Temporal_ZonedDateTimeProto_add, 1],
    ['subtract', Temporal_ZonedDateTimeProto_subtract, 1],
    ['until', Temporal_ZonedDateTimeProto_until, 1],
    ['since', Temporal_ZonedDateTimeProto_since, 1],
    ['round', Temporal_ZonedDateTimeProto_round, 1],
    ['equals', Temporal_ZonedDateTimeProto_equals, 1],
    ['toString', Temporal_ZonedDateTimeProto_toString, 0],
    ['toLocaleString', Temporal_ZonedDateTimeProto_toLocaleString, 0],
    ['toJSON', Temporal_ZonedDateTimeProto_toJSON, 0],
    ['valueOf', Temporal_ZonedDateTimeProto_valueOf, 0],
    ['startOfDay', Temporal_ZonedDateTimeProto_startOfDay, 0],
    ['getTimeZoneTransition', Temporal_ZonedDateTimeProto_getTimeZoneTransition, 1],
    ['toInstant', Temporal_ZonedDateTimeProto_toInstant, 0],
    ['toPlainDate', Temporal_ZonedDateTimeProto_toPlainDate, 0],
    ['toPlainTime', Temporal_ZonedDateTimeProto_toPlainTime, 0],
    ['toPlainDateTime', Temporal_ZonedDateTimeProto_toPlainDateTime, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.ZonedDateTime');
  realmRec.Intrinsics['%Temporal.ZonedDateTime.prototype%'] = prototype;
  return prototype;
}
