import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Assert,
  DateFromTime,
  Day,
  HourFromTime,
  Invoke,
  LocalTime,
  LocalTZA,
  MakeDate,
  MakeDay,
  MakeTime,
  MinFromTime,
  MonthFromTime,
  msFromTime,
  msPerMinute,
  OrdinaryToPrimitive,
  SecFromTime,
  TimeClip,
  TimeWithinDay,
  ToNumber,
  ToPrimitive,
  ToObject,
  UTC,
  WeekDay,
  YearFromTime,
  F, R,
  Realm,
} from '../abstract-ops/all.mts';
import {
  JSStringValue,
  NumberValue,
  ObjectValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  Q, X, type ValueCompletion, type ValueEvaluator,
} from '../completion.mts';
import { StringPad } from '../runtime-semantics/all.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import type { DateObject } from './Date.mts';


export function thisTimeValue(value: Value): ValueCompletion<NumberValue> {
  if (value instanceof ObjectValue && 'DateValue' in value) {
    return (value as DateObject).DateValue;
  }
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Date', value);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getdate */
function DateProto_getDate(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return DateFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.getday */
function DateProto_getDay(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return WeekDay(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.getfullyear */
function DateProto_getFullYear(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return YearFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.gethours */
function DateProto_getHours(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return HourFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.getmilliseconds */
function DateProto_getMilliseconds(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return msFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.getminutes */
function DateProto_getMinutes(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return MinFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.getmonth */
function DateProto_getMonth(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return MonthFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.getseconds */
function DateProto_getSeconds(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return SecFromTime(LocalTime(t));
}

/** https://tc39.es/ecma262/#sec-date.prototype.gettime */
function DateProto_getTime(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  return Q(thisTimeValue(thisValue));
}

/** https://tc39.es/ecma262/#sec-date.prototype.gettimezoneoffset */
function DateProto_getTimezoneOffset(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return F((R(t) - R(LocalTime(t))) / msPerMinute);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcdate */
function DateProto_getUTCDate(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return DateFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcday */
function DateProto_getUTCDay(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return WeekDay(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcfullyear */
function DateProto_getUTCFullYear(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return YearFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutchours */
function DateProto_getUTCHours(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return HourFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcmilliseconds */
function DateProto_getUTCMilliseconds(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return msFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcminutes */
function DateProto_getUTCMinutes(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return MinFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcmonth */
function DateProto_getUTCMonth(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return MonthFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.getutcseconds */
function DateProto_getUTCSeconds(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    return F(NaN);
  }
  return SecFromTime(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.setdate */
function* DateProto_setDate([date = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  let t = Q(thisTimeValue(thisValue));
  const dt = Q(yield* ToNumber(date));
  if (t.isNaN()) {
    return t;
  }
  t = LocalTime(t);
  const newDate = MakeDate(MakeDay(YearFromTime(t), MonthFromTime(t), dt), TimeWithinDay(t));
  const u = TimeClip(UTC(newDate));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setfullyear */
function* DateProto_setFullYear([year = Value.undefined, month, date]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  let t = Q(thisTimeValue(thisValue));
  t = t.isNaN() ? F(+0) : LocalTime(t);
  const y = Q(yield* ToNumber(year));
  let m;
  if (month !== undefined) {
    m = Q(yield* ToNumber(month));
  } else {
    m = MonthFromTime(t);
  }
  let dt;
  if (date !== undefined) {
    dt = Q(yield* ToNumber(date));
  } else {
    dt = DateFromTime(t);
  }
  const newDate = MakeDate(MakeDay(y, m, dt), TimeWithinDay(t));
  const u = TimeClip(UTC(newDate));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.sethours */
function* DateProto_setHours([hour = Value.undefined, min, sec, ms]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = LocalTime(Q(thisTimeValue(thisValue)));
  const h = Q(yield* ToNumber(hour));
  let m;
  if (min !== undefined) {
    m = Q(yield* ToNumber(min));
  } else {
    m = MinFromTime(t);
  }
  let s;
  if (sec !== undefined) {
    s = Q(yield* ToNumber(sec));
  } else {
    s = SecFromTime(t);
  }
  let milli;
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = msFromTime(t);
  }
  const date = MakeDate(Day(t), MakeTime(h, m, s, milli));
  const u = TimeClip(UTC(date));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setmilliseconds */
function* DateProto_setMilliseconds([ms = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = LocalTime(Q(thisTimeValue(thisValue)));
  ms = Q(yield* ToNumber(ms));
  const time = MakeTime(HourFromTime(t), MinFromTime(t), SecFromTime(t), ms);
  const u = TimeClip(UTC(MakeDate(Day(t), time)));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setminutes */
function* DateProto_setMinutes([min = Value.undefined, sec, ms]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let t be LocalTime(? thisTimeValue(this value)).
  const t = LocalTime(Q(thisTimeValue(thisValue)));
  // 2. Let m be ? ToNumber(min).
  const m = Q(yield* ToNumber(min));
  let s;
  // 3. If sec is not present, let s be SecFromTime(t); otherwise, let s be ? ToNumber(sec).
  if (sec !== undefined) {
    s = Q(yield* ToNumber(sec));
  } else {
    s = SecFromTime(t);
  }
  let milli;
  // 4. If ms is not present, let milli be msFromTime(t); otherwise, let milli be ? ToNumber(ms).
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = msFromTime(t);
  }
  // 5. Let date be MakeDate(Day(t), MakeTime(HourFromTime(t), m, s, milli)).
  const date = MakeDate(Day(t), MakeTime(HourFromTime(t), m, s, milli));
  // 6. Let u be TimeClip(UTC(date)).
  const u = TimeClip(UTC(date));
  // 7. Set the [[DateValue]] internal slot of this Date object to u.
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  // 8. Return u.
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setmonth */
function* DateProto_setMonth([month = Value.undefined, date]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = LocalTime(Q(thisTimeValue(thisValue)));
  const m = Q(yield* ToNumber(month));
  let dt;
  if (date !== undefined) {
    dt = Q(yield* ToNumber(date));
  } else {
    dt = DateFromTime(t);
  }
  const newDate = MakeDate(MakeDay(YearFromTime(t), m, dt), TimeWithinDay(t));
  const u = TimeClip(UTC(newDate));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setseconds */
function* DateProto_setSeconds([sec = Value.undefined, ms]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = LocalTime(Q(thisTimeValue(thisValue)));
  const s = Q(yield* ToNumber(sec));
  let milli;
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = msFromTime(t);
  }
  const date = MakeDate(Day(t), MakeTime(HourFromTime(t), MinFromTime(t), s, milli));
  const u = TimeClip(UTC(date));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = u;
  return u;
}

/** https://tc39.es/ecma262/#sec-date.prototype.settime */
function* DateProto_setTime([time = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  Q(thisTimeValue(thisValue));
  const t = Q(yield* ToNumber(time));
  const v = TimeClip(t);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutcdate */
function* DateProto_setUTCDate([date = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = Q(thisTimeValue(thisValue));
  const dt = Q(yield* ToNumber(date));
  if (t.isNaN()) {
    return t;
  }
  const newDate = MakeDate(MakeDay(YearFromTime(t), MonthFromTime(t), dt), TimeWithinDay(t));
  const v = TimeClip(newDate);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutcfullyear */
function* DateProto_setUTCFullYear([year = Value.undefined, month, date]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  let t = Q(thisTimeValue(thisValue));
  if (t.isNaN()) {
    t = F(+0);
  }
  const y = Q(yield* ToNumber(year));
  let m;
  if (month !== undefined) {
    m = Q(yield* ToNumber(month));
  } else {
    m = MonthFromTime(t);
  }
  let dt;
  if (date !== undefined) {
    dt = Q(yield* ToNumber(date));
  } else {
    dt = DateFromTime(t);
  }
  const newDate = MakeDate(MakeDay(y, m, dt), TimeWithinDay(t));
  const v = TimeClip(newDate);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutchours */
function* DateProto_setUTCHours([hour = Value.undefined, min, sec, ms]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = Q(thisTimeValue(thisValue));
  const h = Q(yield* ToNumber(hour));
  let m;
  if (min !== undefined) {
    m = Q(yield* ToNumber(min));
  } else {
    m = MinFromTime(t);
  }
  let s;
  if (sec !== undefined) {
    s = Q(yield* ToNumber(sec));
  } else {
    s = SecFromTime(t);
  }
  let milli;
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = msFromTime(t);
  }
  const newDate = MakeDate(Day(t), MakeTime(h, m, s, milli));
  const v = TimeClip(newDate);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutcmilliseconds */
function* DateProto_setUTCMilliseconds([ms = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = Q(thisTimeValue(thisValue));
  const milli = Q(yield* ToNumber(ms));
  const time = MakeTime(HourFromTime(t), MinFromTime(t), SecFromTime(t), milli);
  const v = TimeClip(MakeDate(Day(t), time));
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutcminutes */
function* DateProto_setUTCMinutes([min = Value.undefined, sec, ms]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = Q(thisTimeValue(thisValue));
  const m = Q(yield* ToNumber(min));
  let s;
  if (sec !== undefined) {
    s = Q(yield* ToNumber(sec));
  } else {
    s = SecFromTime(t);
  }
  let milli;
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = msFromTime(t);
  }
  const date = MakeDate(Day(t), MakeTime(HourFromTime(t), m, s, milli));
  const v = TimeClip(date);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutcmonth */
function* DateProto_setUTCMonth([month = Value.undefined, date]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = Q(thisTimeValue(thisValue));
  const m = Q(yield* ToNumber(month));
  let dt;
  if (date !== undefined) {
    dt = Q(yield* ToNumber(date));
  } else {
    dt = DateFromTime(t);
  }
  const newDate = MakeDate(MakeDay(YearFromTime(t), m, dt), TimeWithinDay(t));
  const v = TimeClip(newDate);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.setutcseconds */
function* DateProto_setUTCSeconds([sec = Value.undefined, ms]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const t = Q(thisTimeValue(thisValue));
  const s = Q(yield* ToNumber(sec));
  let milli;
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = msFromTime(t);
  }
  const date = MakeDate(Day(t), MakeTime(HourFromTime(t), MinFromTime(t), s, milli));
  const v = TimeClip(date);
  Q(surroundingAgent.debugger_tryTouchDuringPreview(thisValue as DateObject));
  (thisValue as DateObject).DateValue = v;
  return v;
}

/** https://tc39.es/ecma262/#sec-date.prototype.todatestring */
function* DateProto_toDateString(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const O = thisValue;
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Date', O);
  }
  const tv = Q(thisTimeValue(O));
  if (tv.isNaN()) {
    return Value('Invalid Date');
  }
  const t = LocalTime(tv);
  return DateString(t);
}

/** https://tc39.es/ecma262/#sec-date.prototype.toisostring */
export function DateProto_toISOString(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion<JSStringValue> {
  const t = Q(thisTimeValue(thisValue));
  if (!Number.isFinite(R(t))) {
    return surroundingAgent.Throw('RangeError', 'DateInvalidTime');
  }
  const year = R(YearFromTime(t));
  const month = R(MonthFromTime(t)) + 1;
  const date = R(DateFromTime(t));
  const hour = R(HourFromTime(t));
  const min = R(MinFromTime(t));
  const sec = R(SecFromTime(t));
  const ms = R(msFromTime(t));

  // TODO: figure out if there can be invalid years.
  let YYYY = String(year);
  if (year < 0 || year > 9999) {
    YYYY = year < 0 ? `${String(year).padStart(6, '0')}` : `+${String(year).padStart(6, '0')}`;
  }
  const MM = String(month).padStart(2, '0');
  const DD = String(date).padStart(2, '0');
  const HH = String(hour).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  const sss = String(ms).padStart(3, '0');
  const format = `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}.${sss}Z`;
  return Value(format);
}

/** https://tc39.es/ecma262/#sec-date.prototype.tojson */
function* DateProto_toJSON(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const O = Q(ToObject(thisValue));
  const tv = Q(yield* ToPrimitive(O, 'number'));
  if (tv instanceof NumberValue && !Number.isFinite(R(tv))) {
    return Value.null;
  }
  return Q(yield* Invoke(O, Value('toISOString')));
}

/** https://tc39.es/ecma262/#sec-date.prototype.tolocaledatestring */
function DateProto_toLocaleDateString() {
  // TODO: implement this function.
  return surroundingAgent.Throw('Error', 'Raw', 'Date.prototype.toLocaleDateString is not implemented');
}

/** https://tc39.es/ecma262/#sec-date.prototype.tolocalestring */
function DateProto_toLocaleString() {
  // TODO: implement this function.
  return surroundingAgent.Throw('Error', 'Raw', 'Date.prototype.toLocaleString is not implemented');
}

/** https://tc39.es/ecma262/#sec-date.prototype.tolocaletimestring */
function DateProto_toLocaleTimeString() {
  // TODO: implement this function.
  return surroundingAgent.Throw('Error', 'Raw', 'Date.prototype.toLocaleTimeString is not implemented');
}

/** https://tc39.es/ecma262/#sec-date.prototype.tostring */
function DateProto_toString(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const tv = Q(thisTimeValue(thisValue));
  return ToDateString(tv);
}

/** https://tc39.es/ecma262/#sec-timestring */
function TimeString(tv: NumberValue) {
  Assert(tv instanceof NumberValue);
  Assert(!tv.isNaN());
  const hour = String(R(HourFromTime(tv))).padStart(2, '0');
  const minute = String(R(MinFromTime(tv))).padStart(2, '0');
  const second = String(R(SecFromTime(tv))).padStart(2, '0');
  return Value(`${hour}:${minute}:${second} GMT`);
}

/** https://tc39.es/ecma262/#sec-todatestring-day-names */
const daysOfTheWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** https://tc39.es/ecma262/#sec-todatestring-month-names */
const monthsOfTheYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** https://tc39.es/ecma262/#sec-datestring */
function DateString(tv: NumberValue) {
  Assert(tv instanceof NumberValue);
  Assert(!tv.isNaN());
  const weekday = daysOfTheWeek[R(WeekDay(tv))];
  const month = monthsOfTheYear[R(MonthFromTime(tv))];
  const day = String(R(DateFromTime(tv))).padStart(2, '0');
  const yv = R(YearFromTime(tv));
  const yearSign = yv >= 0 ? '' : '-';
  const year = Value(String(Math.abs(yv)));
  const paddedYear = X(StringPad(year, F(4), Value('0'), 'start')).stringValue();
  return Value(`${weekday} ${month} ${day} ${yearSign}${paddedYear}`);
}

/** https://tc39.es/ecma262/#sec-timezoneestring */
export function TimeZoneString(tv: NumberValue) {
  Assert(tv instanceof NumberValue);
  Assert(!tv.isNaN());
  const offset = LocalTZA(tv, true);
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetMin = String(R(MinFromTime(F(Math.abs(offset))))).padStart(2, '0');
  const offsetHour = String(R(HourFromTime(F(Math.abs(offset))))).padStart(2, '0');
  const tzName = '';
  return Value(`${offsetSign}${offsetHour}${offsetMin}${tzName}`);
}

/** https://tc39.es/ecma262/#sec-todatestring */
export function ToDateString(tv: NumberValue) {
  Assert(tv instanceof NumberValue);
  if (tv.isNaN()) {
    return Value('Invalid Date');
  }
  const t = LocalTime(tv);
  return Value(`${DateString(t).stringValue()} ${TimeString(t).stringValue()}${TimeZoneString(t).stringValue()}`);
}

/** https://tc39.es/ecma262/#sec-date.prototype.totimestring */
function DateProto_toTimeString(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const O = thisValue;
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Date', O);
  }
  const tv = Q(thisTimeValue(O));
  if (tv.isNaN()) {
    return Value('Invalid Date');
  }
  const t = LocalTime(tv);
  return Value(`${TimeString(t).stringValue()}${TimeZoneString(tv).stringValue()}`);
}

/** https://tc39.es/ecma262/#sec-date.prototype.toutcstring */
function DateProto_toUTCString(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const O = thisValue;
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Date', O);
  }
  const tv = Q(thisTimeValue(O));
  if (tv.isNaN()) {
    return Value('Invalid Date');
  }
  const weekday = daysOfTheWeek[R(WeekDay(tv))];
  const month = monthsOfTheYear[R(MonthFromTime(tv))];
  const day = String(R(DateFromTime(tv))).padStart(2, '0');
  const yv = R(YearFromTime(tv));
  const yearSign = yv >= 0 ? '' : '-';
  const year = Value(String(Math.abs(yv)));
  const paddedYear = X(StringPad(year, F(4), Value('0'), 'start')).stringValue();
  return Value(`${weekday}, ${day} ${month} ${yearSign}${paddedYear} ${TimeString(tv).stringValue()}`);
}

/** https://tc39.es/ecma262/#sec-date.prototype.valueof */
function DateProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  return Q(thisTimeValue(thisValue));
}

/** https://tc39.es/ecma262/#sec-date.prototype-@@toprimitive */
function* DateProto_toPrimitive([hint = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const O = thisValue;
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Date', O);
  }
  let tryFirst: 'string' | 'number';
  if (hint instanceof JSStringValue && (hint.stringValue() === 'string' || hint.stringValue() === 'default')) {
    tryFirst = 'string';
  } else if (hint instanceof JSStringValue && hint.stringValue() === 'number') {
    tryFirst = 'number';
  } else {
    return surroundingAgent.Throw('TypeError', 'InvalidHint', hint);
  }
  return Q(yield* OrdinaryToPrimitive(O, tryFirst));
}

export function bootstrapDatePrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['getDate', DateProto_getDate, 0],
    ['getDay', DateProto_getDay, 0],
    ['getFullYear', DateProto_getFullYear, 0],
    ['getHours', DateProto_getHours, 0],
    ['getMilliseconds', DateProto_getMilliseconds, 0],
    ['getMinutes', DateProto_getMinutes, 0],
    ['getMonth', DateProto_getMonth, 0],
    ['getSeconds', DateProto_getSeconds, 0],
    ['getTime', DateProto_getTime, 0],
    ['getTimezoneOffset', DateProto_getTimezoneOffset, 0],
    ['getUTCDate', DateProto_getUTCDate, 0],
    ['getUTCDay', DateProto_getUTCDay, 0],
    ['getUTCFullYear', DateProto_getUTCFullYear, 0],
    ['getUTCHours', DateProto_getUTCHours, 0],
    ['getUTCMilliseconds', DateProto_getUTCMilliseconds, 0],
    ['getUTCMinutes', DateProto_getUTCMinutes, 0],
    ['getUTCMonth', DateProto_getUTCMonth, 0],
    ['getUTCSeconds', DateProto_getUTCSeconds, 0],
    ['setDate', DateProto_setDate, 1],
    ['setFullYear', DateProto_setFullYear, 3],
    ['setHours', DateProto_setHours, 4],
    ['setMilliseconds', DateProto_setMilliseconds, 1],
    ['setMinutes', DateProto_setMinutes, 3],
    ['setMonth', DateProto_setMonth, 2],
    ['setSeconds', DateProto_setSeconds, 2],
    ['setTime', DateProto_setTime, 1],
    ['setUTCDate', DateProto_setUTCDate, 1],
    ['setUTCFullYear', DateProto_setUTCFullYear, 3],
    ['setUTCHours', DateProto_setUTCHours, 4],
    ['setUTCMilliseconds', DateProto_setUTCMilliseconds, 1],
    ['setUTCMinutes', DateProto_setUTCMinutes, 3],
    ['setUTCMonth', DateProto_setUTCMonth, 2],
    ['setUTCSeconds', DateProto_setUTCSeconds, 2],
    ['toDateString', DateProto_toDateString, 0],
    ['toISOString', DateProto_toISOString, 0],
    ['toJSON', DateProto_toJSON, 1],
    ['toLocaleDateString', DateProto_toLocaleDateString, 0],
    ['toLocaleString', DateProto_toLocaleString, 0],
    ['toLocaleTimeString', DateProto_toLocaleTimeString, 0],
    ['toString', DateProto_toString, 0],
    ['toTimeString', DateProto_toTimeString, 0],
    ['toUTCString', DateProto_toUTCString, 0],
    ['valueOf', DateProto_valueOf, 0],
    [wellKnownSymbols.toPrimitive, DateProto_toPrimitive, 1, { Writable: Value.false, Enumerable: Value.false, Configurable: Value.true }],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%Date.prototype%'] = proto;
}
