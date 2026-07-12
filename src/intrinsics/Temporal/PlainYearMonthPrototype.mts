import { bootstrapPrototype } from '../bootstrap.mts';
import {
  GetTemporalOverflowOption,
  GetTemporalShowCalendarNameOption,
  IsPartialTemporalObject,
  ISODateToFields,
} from '../../abstract-ops/temporal/temporal.mts';
import {
  CalendarDateFromFields,
  CalendarEquals,
  CalendarISOToDate,
  CalendarMergeFields,
  CalendarYearMonthFromFields,
  PrepareCalendarFields,
} from '../../abstract-ops/temporal/calendar.mts';
import { CompareISODate, CreateTemporalDate } from '../../abstract-ops/temporal/plain-date.mts';
import {
  AddDurationToYearMonth,
  CreateTemporalYearMonth,
  DifferenceTemporalPlainYearMonth,
  TemporalYearMonthToString,
  ToTemporalYearMonth,
} from '../../abstract-ops/temporal/plain-year-month.mts';
import type { TemporalPlainYearMonthObject } from './PlainYearMonth.mts';
import {
  F,
  GetOptionsObject,
  ObjectValue,
  Q,
  RequireInternalSlot,
  Throw,
  Value,
  X,
  type Arguments,
  type FunctionCallContext,
  type PlainCompletion,
  type Realm,
  type ValueEvaluator,
} from '#self';

function thisTemporalYearMonthValue(value: Value): PlainCompletion<TemporalPlainYearMonthObject> {
  Q(RequireInternalSlot(value, 'InitializedTemporalYearMonth'));
  return value as TemporalPlainYearMonthObject;
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.calendarid */
function Temporal_PlainYearMonthProto_calendarId_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Value(plainYearMonth.Calendar);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.era */
function Temporal_PlainYearMonthProto_era_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Value(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).Era);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.erayear */
function Temporal_PlainYearMonthProto_eraYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  const result = CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).EraYear;
  return result === undefined ? Value.undefined : F(Number(result));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.year */
function Temporal_PlainYearMonthProto_year_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return F(Number(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).Year));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.month */
function Temporal_PlainYearMonthProto_month_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return F(Number(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).Month));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.monthcode */
function Temporal_PlainYearMonthProto_monthCode_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Value(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).MonthCode);
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.daysinyear */
function Temporal_PlainYearMonthProto_daysInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return F(Number(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).DaysInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.daysinmonth */
function Temporal_PlainYearMonthProto_daysInMonth_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return F(Number(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).DaysInMonth));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.monthsinyear */
function Temporal_PlainYearMonthProto_monthsInYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return F(Number(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).MonthsInYear));
}

/** https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.inleapyear */
function Temporal_PlainYearMonthProto_inLeapYear_getter(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Value(CalendarISOToDate(plainYearMonth.Calendar, plainYearMonth.ISODate).InLeapYear);
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.with */
function* Temporal_PlainYearMonthProto_with([temporalYearMonthLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  if (!Q(yield* IsPartialTemporalObject(temporalYearMonthLike))) {
    return Throw.TypeError('$1 is not a partial Temporal object', temporalYearMonthLike);
  }
  const calendar = plainYearMonth.Calendar;
  let fields = ISODateToFields(calendar, plainYearMonth.ISODate, 'year-month');
  const partialYearMonth = Q(yield* PrepareCalendarFields(calendar, temporalYearMonthLike as ObjectValue, ['year', 'month', 'month-code'], [], 'partial'));
  fields = CalendarMergeFields(calendar, fields, partialYearMonth);
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const isoDate = Q(yield* CalendarYearMonthFromFields(calendar, fields, overflow));
  return X(CreateTemporalYearMonth(isoDate, calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.add */
function* Temporal_PlainYearMonthProto_add([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Q(yield* AddDurationToYearMonth('add', plainYearMonth, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.subtract */
function* Temporal_PlainYearMonthProto_subtract([temporalDurationLike = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Q(yield* AddDurationToYearMonth('subtract', plainYearMonth, temporalDurationLike, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.until */
function* Temporal_PlainYearMonthProto_until([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Q(yield* DifferenceTemporalPlainYearMonth('until', plainYearMonth, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.since */
function* Temporal_PlainYearMonthProto_since([other = Value.undefined, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Q(yield* DifferenceTemporalPlainYearMonth('since', plainYearMonth, other, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.equals */
function* Temporal_PlainYearMonthProto_equals([_other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  const other = Q(yield* ToTemporalYearMonth(_other));
  if (CompareISODate(plainYearMonth.ISODate, other.ISODate) !== 0n) {
    return Value.false;
  }
  return Value(CalendarEquals(plainYearMonth.Calendar, other.Calendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tostring */
function* Temporal_PlainYearMonthProto_toString([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  const resolvedOptions = Q(GetOptionsObject(options));
  const showCalendar = Q(yield* GetTemporalShowCalendarNameOption(resolvedOptions));
  return Value(TemporalYearMonthToString(plainYearMonth, showCalendar));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tolocalestring */
function Temporal_PlainYearMonthProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Value(TemporalYearMonthToString(plainYearMonth, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tojson */
function Temporal_PlainYearMonthProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  return Value(TemporalYearMonthToString(plainYearMonth, 'auto'));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.valueof */
function Temporal_PlainYearMonthProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): PlainCompletion<Value> {
  Q(thisTemporalYearMonthValue(thisValue));
  return Throw.TypeError('Temporal.PlainYearMonth cannot be converted to primitive value. If you are comparing two Temporal.PlainYearMonth objects with > or <, use Temporal.PlainYearMonth.compare() instead.');
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.toplaindate */
function* Temporal_PlainYearMonthProto_toPlainDate([item = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const plainYearMonth = Q(thisTemporalYearMonthValue(thisValue));
  if (!(item instanceof ObjectValue)) {
    return Throw.TypeError('$1 is not an object', item);
  }
  const calendar = plainYearMonth.Calendar;
  const fields = ISODateToFields(calendar, plainYearMonth.ISODate, 'year-month');
  const inputFields = Q(yield* PrepareCalendarFields(calendar, item, ['day'], [], []));
  const mergedFields = CalendarMergeFields(calendar, fields, inputFields);
  const isoDate = Q(yield* CalendarDateFromFields(calendar, mergedFields, 'constrain'));
  return X(CreateTemporalDate(isoDate, calendar));
}

export function bootstrapTemporalPlainYearMonthPrototype(realmRec: Realm) {
  const prototype = bootstrapPrototype(realmRec, [
    ['calendarId', [Temporal_PlainYearMonthProto_calendarId_getter]],
    ['era', [Temporal_PlainYearMonthProto_era_getter]],
    ['eraYear', [Temporal_PlainYearMonthProto_eraYear_getter]],
    ['year', [Temporal_PlainYearMonthProto_year_getter]],
    ['month', [Temporal_PlainYearMonthProto_month_getter]],
    ['monthCode', [Temporal_PlainYearMonthProto_monthCode_getter]],
    ['daysInYear', [Temporal_PlainYearMonthProto_daysInYear_getter]],
    ['daysInMonth', [Temporal_PlainYearMonthProto_daysInMonth_getter]],
    ['monthsInYear', [Temporal_PlainYearMonthProto_monthsInYear_getter]],
    ['inLeapYear', [Temporal_PlainYearMonthProto_inLeapYear_getter]],
    ['with', Temporal_PlainYearMonthProto_with, 1],
    ['add', Temporal_PlainYearMonthProto_add, 1],
    ['subtract', Temporal_PlainYearMonthProto_subtract, 1],
    ['until', Temporal_PlainYearMonthProto_until, 1],
    ['since', Temporal_PlainYearMonthProto_since, 1],
    ['equals', Temporal_PlainYearMonthProto_equals, 1],
    ['toString', Temporal_PlainYearMonthProto_toString, 0],
    ['toLocaleString', Temporal_PlainYearMonthProto_toLocaleString, 0],
    ['toJSON', Temporal_PlainYearMonthProto_toJSON, 0],
    ['valueOf', Temporal_PlainYearMonthProto_valueOf, 0],
    ['toPlainDate', Temporal_PlainYearMonthProto_toPlainDate, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.PlainYearMonth');
  realmRec.Intrinsics['%Temporal.PlainYearMonth.prototype%'] = prototype;
  return prototype;
}
