import { bootstrapPrototype } from '../bootstrap.mts';
import type { TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import type { TemporalPlainDateObject } from './PlainDate.mts';
import {
  AddDurationToDate,
  CalendarDateFromFields,
  CalendarEquals,
  CalendarISOToDate,
  CalendarMergeFields,
  CalendarMonthDayFromFields,
  CalendarYearMonthFromFields,
  CompareISODate,
  CombineISODateAndTimeRecord,
  CreateTemporalDate,
  CreateTemporalDateTime,
  CreateTemporalMonthDay,
  CreateTemporalYearMonth,
  CreateTemporalZonedDateTime,
  DifferenceTemporalPlainDate,
  Get,
  GetEpochNanosecondsFor,
  GetStartOfDay,
  GetTemporalOverflowOption,
  GetTemporalShowCalendarNameOption,
  ISODateTimeWithinLimits,
  ISODateToFields,
  IsPartialTemporalObject,
  PrepareCalendarFields,
  Q,
  RequireInternalSlot,
  Throw,
  ToTemporalCalendarIdentifier,
  ToTemporalDate,
  ToTemporalTime,
  ToTemporalTimeZoneIdentifier,
  ToTimeRecordOrMidnight,
  Value,
  X,
  F,
  type Arguments,
  type FunctionCallContext,
  type PlainCompletion,
  type Realm,
  type ValueEvaluator,
  ObjectValue,
  TemporalDateToString,
  GetOptionsObject,
} from '#self';

function thisTemporalDateValue(value: Value): PlainCompletion<TemporalPlainDateObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalDate'));
  return value as TemporalPlainDateObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.calendarid */
function Temporal_PlainDateProto_calendarId_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Value(plainDate.Calendar);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.era */
function Temporal_PlainDateProto_era_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Value(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).Era);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.erayear */
function Temporal_PlainDateProto_eraYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const result = CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).EraYear;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.year */
function Temporal_PlainDateProto_year_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).Year));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.month */
function Temporal_PlainDateProto_month_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).Month));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.monthcode */
function Temporal_PlainDateProto_monthCode_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Value(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).MonthCode);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.day */
function Temporal_PlainDateProto_day_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).Day));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.dayofweek */
function Temporal_PlainDateProto_dayOfWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).DayOfWeek));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.dayofyear */
function Temporal_PlainDateProto_dayOfYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).DayOfYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.weekofyear */
function Temporal_PlainDateProto_weekOfYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const result = CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).WeekOfYear.Week;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.yearofweek */
function Temporal_PlainDateProto_yearOfWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const result = CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).WeekOfYear.Year;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinweek */
function Temporal_PlainDateProto_daysInWeek_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).DaysInWeek));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinmonth */
function Temporal_PlainDateProto_daysInMonth_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).DaysInMonth));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinyear */
function Temporal_PlainDateProto_daysInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).DaysInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.monthsinyear */
function Temporal_PlainDateProto_monthsInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return F(Number(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).MonthsInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.inleapyear */
function Temporal_PlainDateProto_inLeapYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Value(CalendarISOToDate(plainDate.Calendar, plainDate.ISODate).InLeapYear);
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplainyearmonth */
function* Temporal_PlainDateProto_toPlainYearMonth(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const calendar = plainDate.Calendar;
  const fields = ISODateToFields(calendar, plainDate.ISODate, 'date');
  const isoDate = Q(yield* CalendarYearMonthFromFields(calendar, fields, 'constrain'));
  return X(CreateTemporalYearMonth(isoDate, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplainmonthday */
function* Temporal_PlainDateProto_toPlainMonthDay(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const calendar = plainDate.Calendar;
  const fields = ISODateToFields(calendar, plainDate.ISODate, 'date');
  const isoDate = Q(yield* CalendarMonthDayFromFields(calendar, fields, 'constrain'));
  return X(CreateTemporalMonthDay(isoDate, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.add */
function* Temporal_PlainDateProto_add([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Q(yield* AddDurationToDate('add', plainDate, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.subtract */
function* Temporal_PlainDateProto_subtract([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Q(yield* AddDurationToDate('subtract', plainDate, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.with */
function* Temporal_PlainDateProto_with([temporalDateLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  if (!Q(yield* IsPartialTemporalObject(temporalDateLike))) {
    return Throw.TypeError('$1 is not a partial Temporal object', temporalDateLike);
  }
  const calendar = plainDate.Calendar;
  let fields = ISODateToFields(calendar, plainDate.ISODate, 'date');
  const partialDate = Q(yield* PrepareCalendarFields(calendar, temporalDateLike as ObjectValue, ['year', 'month', 'month-code', 'day'], [], 'partial'));
  fields = CalendarMergeFields(calendar, fields, partialDate);
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const isoDate = Q(yield* CalendarDateFromFields(calendar, fields, overflow));
  return X(CreateTemporalDate(isoDate, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.withcalendar */
function Temporal_PlainDateProto_withCalendar([calendarLike = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const calendar = Q(ToTemporalCalendarIdentifier(calendarLike));
  return X(CreateTemporalDate(plainDate.ISODate, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.until */
function* Temporal_PlainDateProto_until([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Q(yield* DifferenceTemporalPlainDate('until', plainDate, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.since */
function* Temporal_PlainDateProto_since([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Q(yield* DifferenceTemporalPlainDate('since', plainDate, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.equals */
function* Temporal_PlainDateProto_equals([_other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const other = Q(yield* ToTemporalDate(_other));
  if (CompareISODate(plainDate.ISODate, other.ISODate) !== 0n) {
    return Value.false;
  }
  return Value(CalendarEquals(plainDate.Calendar, other.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplaindatetime */
function* Temporal_PlainDateProto_toPlainDateTime([temporalTime = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const time = Q(yield* ToTimeRecordOrMidnight(temporalTime));
  const isoDateTime = CombineISODateAndTimeRecord(plainDate.ISODate, time);
  return Q(yield* CreateTemporalDateTime(isoDateTime, plainDate.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tozoneddatetime */
function* Temporal_PlainDateProto_toZonedDateTime([item = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  let timeZone: TimeZoneIdentifier;
  let temporalTime: Value;
  if (item instanceof ObjectValue) {
    const timeZoneLike = Q(yield* Get(item, Value('timeZone')));
    if (timeZoneLike === Value.undefined) {
      timeZone = Q(ToTemporalTimeZoneIdentifier(item));
      temporalTime = Value.undefined;
    } else {
      timeZone = Q(ToTemporalTimeZoneIdentifier(timeZoneLike));
      temporalTime = Q(yield* Get(item, Value('plainTime')));
    }
  } else {
    timeZone = Q(ToTemporalTimeZoneIdentifier(item));
    temporalTime = Value.undefined;
  }
  let epochNs: bigint;
  if (temporalTime === Value.undefined) {
    epochNs = Q(GetStartOfDay(timeZone, plainDate.ISODate));
  } else {
    const temporalTime2 = Q(yield* ToTemporalTime(temporalTime));
    const isoDateTime = CombineISODateAndTimeRecord(plainDate.ISODate, temporalTime2.Time);
    if (!ISODateTimeWithinLimits(isoDateTime)) {
      return Throw.RangeError('DateTime outside of range');
    }
    epochNs = Q(GetEpochNanosecondsFor(timeZone, isoDateTime, 'compatible'));
  }
  return X(CreateTemporalZonedDateTime(epochNs, timeZone, plainDate.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tostring */
function* Temporal_PlainDateProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const showCalendar = Q(yield* GetTemporalShowCalendarNameOption(resolvedOptions));
  return Value(TemporalDateToString(plainDate, showCalendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tolocalestring */
function Temporal_PlainDateProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Value(TemporalDateToString(plainDate, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tojson */
function Temporal_PlainDateProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainDate = Q(thisTemporalDateValue(thisValue));
  return Value(TemporalDateToString(plainDate, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.valueof */
function Temporal_PlainDateProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalDateValue(thisValue));
  return Throw.TypeError('Temporal.PlainDate cannot be converted to primitive value. If you are comparing two Temporal.PlainDate objects with > or <, use Temporal.PlainDate.compare() instead.');
}

export function bootstrapTemporalPlainDatePrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['calendarId', [Temporal_PlainDateProto_calendarId_getter]],
    ['era', [Temporal_PlainDateProto_era_getter]],
    ['eraYear', [Temporal_PlainDateProto_eraYear_getter]],
    ['year', [Temporal_PlainDateProto_year_getter]],
    ['month', [Temporal_PlainDateProto_month_getter]],
    ['monthCode', [Temporal_PlainDateProto_monthCode_getter]],
    ['day', [Temporal_PlainDateProto_day_getter]],
    ['dayOfWeek', [Temporal_PlainDateProto_dayOfWeek_getter]],
    ['dayOfYear', [Temporal_PlainDateProto_dayOfYear_getter]],
    ['weekOfYear', [Temporal_PlainDateProto_weekOfYear_getter]],
    ['yearOfWeek', [Temporal_PlainDateProto_yearOfWeek_getter]],
    ['daysInWeek', [Temporal_PlainDateProto_daysInWeek_getter]],
    ['daysInMonth', [Temporal_PlainDateProto_daysInMonth_getter]],
    ['daysInYear', [Temporal_PlainDateProto_daysInYear_getter]],
    ['monthsInYear', [Temporal_PlainDateProto_monthsInYear_getter]],
    ['inLeapYear', [Temporal_PlainDateProto_inLeapYear_getter]],
    ['toPlainYearMonth', Temporal_PlainDateProto_toPlainYearMonth, 0],
    ['toPlainMonthDay', Temporal_PlainDateProto_toPlainMonthDay, 0],
    ['add', Temporal_PlainDateProto_add, 1],
    ['subtract', Temporal_PlainDateProto_subtract, 1],
    ['with', Temporal_PlainDateProto_with, 1],
    ['withCalendar', Temporal_PlainDateProto_withCalendar, 1],
    ['until', Temporal_PlainDateProto_until, 1],
    ['since', Temporal_PlainDateProto_since, 1],
    ['equals', Temporal_PlainDateProto_equals, 1],
    ['toPlainDateTime', Temporal_PlainDateProto_toPlainDateTime, 0],
    ['toZonedDateTime', Temporal_PlainDateProto_toZonedDateTime, 1],
    ['toString', Temporal_PlainDateProto_toString, 0],
    ['toLocaleString', Temporal_PlainDateProto_toLocaleString, 0],
    ['toJSON', Temporal_PlainDateProto_toJSON, 0],
    ['valueOf', Temporal_PlainDateProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.PlainDate');
  realmRec.Intrinsics['%Temporal.PlainDate.prototype%'] = prototype;
  return prototype;
}
