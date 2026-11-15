import {
  Value, JSStringValue, ObjectValue, type Arguments, type FunctionCallContext, NumberValue,
} from '../value.mts';
import {
  AbruptCompletion,
  Q, ValueOfNormalCompletion, X,
  type ValueEvaluator,
} from '../completion.mts';
import type { Mutable } from '../utils/language.mts';
import {
  DateFromTime, GetUTCEpochNanoseconds, ParseDateTimeUTCOffset, UTC, type FiniteTimeValue,
} from '../abstract-ops/date-objects.mts';
import { ParseISODateTime } from '../parser/TemporalParser.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import { ToDateString, thisTimeValue } from './DatePrototype.mts';
import {
  Assert,
  OrdinaryCreateFromConstructor,
  ToPrimitive,
  ToNumber,
  ToString,
  MakeDate,
  MakeDay,
  MakeTime,
  TimeClip,
  F,
  type OrdinaryObject,
  type FunctionObject,
  Realm,
  R,
  SystemUTCEpochMilliseconds,
  ThrowCompletion,
  EnsureCompletion,
  NormalCompletion,
  BalanceISODateTime,
  ValidateISODaysRange,
  IsWithinEpochNanosecondsInterval,
  MakeFullYear,
} from '#self';

export interface DateObject extends OrdinaryObject {
  DateValue: number;
}
export function isDateObject(value: Value): value is DateObject {
  return 'DateValue' in value;
}
/** https://tc39.es/ecma262/#sec-date-constructor */
function* DateConstructor(values: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  if (NewTarget === Value.undefined) {
    return ToDateString(Value(SystemUTCEpochMilliseconds()));
  }
  const numberOfArgs = values.length;
  if (numberOfArgs >= 2) {
    /** https://tc39.es/ecma262/#sec-date-year-month-date-hours-minutes-seconds-ms */
    const [year, month, date, hours, minutes, seconds, ms] = values;
    Assert(numberOfArgs >= 2);
    const y = Q(yield* ToNumber(year!));
    const m = Q(yield* ToNumber(month!));
    let dt;
    if (date !== undefined) {
      dt = Q(yield* ToNumber(date));
    } else {
      dt = F(1);
    }
    let h;
    if (hours !== undefined) {
      h = Q(yield* ToNumber(hours));
    } else {
      h = F(+0);
    }
    let min;
    if (minutes !== undefined) {
      min = Q(yield* ToNumber(minutes));
    } else {
      min = F(+0);
    }
    let s;
    if (seconds !== undefined) {
      s = Q(yield* ToNumber(seconds));
    } else {
      s = F(+0);
    }
    let milli;
    if (ms !== undefined) {
      milli = Q(yield* ToNumber(ms));
    } else {
      milli = F(+0);
    }
    const yr = MakeFullYear(y);
    const finalDate = MakeDate(MakeDay(yr, R(m), R(dt)), MakeTime(R(h), R(min), R(s), R(milli)));
    const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget as FunctionObject, '%Date.prototype%', ['DateValue'])) as Mutable<DateObject>;
    O.DateValue = TimeClip(UTC(finalDate));
    return O;
  } else if (numberOfArgs === 1) {
    const [value] = values;
    /** https://tc39.es/ecma262/#sec-date-value */
    Assert(numberOfArgs === 1);
    let tv;
    if (value instanceof ObjectValue && 'DateValue' in value) {
      tv = X(thisTimeValue(value));
    } else {
      const v = Q(yield* ToPrimitive(value!));
      if (v instanceof JSStringValue) {
        // Assert: The next step never returns an abrupt completion because Type(v) is String.
        tv = parseDate(v.stringValue());
      } else {
        tv = Q(yield* ToNumber(v));
      }
    }
    const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget as FunctionObject, '%Date.prototype%', ['DateValue'])) as Mutable<DateObject>;
    O.DateValue = TimeClip(R(tv));
    return O;
  } else {
    /** https://tc39.es/ecma262/#sec-date-constructor-date */
    Assert(numberOfArgs === 0);
    const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget as FunctionObject, '%Date.prototype%', ['DateValue'])) as Mutable<DateObject>;
    O.DateValue = SystemUTCEpochMilliseconds();
    return O;
  }
}

/** https://tc39.es/ecma262/#sec-date.now */
function Date_now() {
  const now = SystemUTCEpochMilliseconds();
  return F(now);
}

/** https://tc39.es/ecma262/#sec-date.parse */
function* Date_parse([string = Value.undefined]: Arguments): ValueEvaluator<NumberValue> {
  const str = yield* ToString(string);
  if (str instanceof AbruptCompletion) {
    return str;
  }
  return parseDate(ValueOfNormalCompletion(str));
}

/** https://tc39.es/ecma262/#sec-date.utc */
function* Date_UTC([year = Value.undefined, month, date, hours, minutes, seconds, ms]: Arguments): ValueEvaluator {
  const y = Q(yield* ToNumber(year));
  let m;
  if (month !== undefined) {
    m = Q(yield* ToNumber(month));
  } else {
    m = F(+0);
  }
  let dt;
  if (date !== undefined) {
    dt = Q(yield* ToNumber(date));
  } else {
    dt = F(1);
  }
  let h;
  if (hours !== undefined) {
    h = Q(yield* ToNumber(hours));
  } else {
    h = F(+0);
  }
  let min;
  if (minutes !== undefined) {
    min = Q(yield* ToNumber(minutes));
  } else {
    min = F(+0);
  }
  let s;
  if (seconds !== undefined) {
    s = Q(yield* ToNumber(seconds));
  } else {
    s = F(+0);
  }
  let milli;
  if (ms !== undefined) {
    milli = Q(yield* ToNumber(ms));
  } else {
    milli = F(+0);
  }

  const yr = MakeFullYear(y);
  return Value(TimeClip(MakeDate(MakeDay(yr, R(m), R(dt)), MakeTime(R(h), R(min), R(s), R(milli)))));
}

/** https://tc39.es/ecma262/#sec-date-time-string-format */
function parseDate(dateTimeString: string): NumberValue {
  const str = dateTimeString;
  const result = EnsureCompletion(ParseISODateTime(str, 'non-spec-date'));
  if (result instanceof NormalCompletion) {
    const parsed = result.Value;
    const OffsetString = parsed.TimeZone.OffsetString;
    let offsetNanoseconds = 0n;
    if (OffsetString !== undefined) {
      offsetNanoseconds = X(ParseDateTimeUTCOffset(OffsetString));
    }
    const time = parsed.Time;
    Assert(time !== 'start-of-day');
    const balanced = BalanceISODateTime(parsed.Year!, parsed.Month, parsed.Day, time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, time.Nanosecond - offsetNanoseconds);
    if (ValidateISODaysRange(balanced.ISODate) instanceof ThrowCompletion) {
      return F(NaN);
    }
    const epochNanoseconds = GetUTCEpochNanoseconds(balanced);
    if (!IsWithinEpochNanosecondsInterval(epochNanoseconds)) {
      return F(NaN);
    }
    return F(Number(epochNanoseconds / 1000000n));
  }

  // The date-only forms YYYY and YYYY-MM of the Date Time String Format, with an optional time.
  const partial = /^(?<year>[+-]\d{6}|\d{4})(?:-(?<month>\d{2}))?(?:T(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<millisecond>\d{3}))?)?(?<offset>Z|(?<offsetSign>[+-])(?<offsetHour>\d{2}):(?<offsetMinute>\d{2}))?)?$/.exec(str);
  if (partial) {
    const groups = partial.groups!;
    if (groups.year === '-000000') {
      return F(NaN);
    }
    const month = Number(groups.month ?? 1);
    const hour = Number(groups.hour ?? 0);
    const minute = Number(groups.minute ?? 0);
    const offsetHour = Number(groups.offsetHour ?? 0);
    const offsetMinute = Number(groups.offsetMinute ?? 0);
    if (month < 1 || month > 12 || hour > 23 || minute > 59 || Number(groups.second ?? 0) > 59 || offsetHour > 23 || offsetMinute > 59) {
      return F(NaN);
    }
    const t = MakeDate(MakeDay(Number(groups.year), month - 1, 1), MakeTime(hour, minute, Number(groups.second ?? 0), Number(groups.millisecond ?? 0)));
    if (groups.offset === undefined) {
      // Date-only forms are UTC time, date-time forms are local time.
      return F(TimeClip(groups.hour === undefined ? t : UTC(t)));
    }
    const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 60000;
    return F(TimeClip(groups.offsetSign === '-' ? t + offsetMilliseconds : t - offsetMilliseconds));
  }

  // Match the formats of Date.prototype.toString, toDateString and toUTCString:
  // Thu Jan 01 1970 00:00:00 GMT+0000
  // Thu, 01 Jan 1970 00:00:00 GMT
  // Thu Jan 01 1970
  // The whole string has to match, and a field out of range gives NaN.
  const match = /^(?:(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),? )?(?:(?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?<day>\d{1,2})|(?<day2>\d{1,2}) (?<month2>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)) (?<year>[+-]?\d+)(?: (?<hour>\d{1,2}):(?<minute>\d{1,2})(?::(?<second>\d{1,2}))?(?: (?<zone>GMT|UTC|UT)(?:(?<offsetSign>[+-])(?<offsetHour>\d{2}):?(?<offsetMinute>\d{2}))?(?: \([^()]*\))?)?)?$/.exec(str);
  if (!match) {
    return F(NaN);
  }
  const groups = match.groups!;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf((groups.month ?? groups.month2)!);
  const day = Number(groups.day ?? groups.day2);
  const year = Number(groups.year);
  if (Object.is(year, -0)) {
    return F(NaN);
  }
  const hour = Number(groups.hour ?? 0);
  const minute = Number(groups.minute ?? 0);
  const second = Number(groups.second ?? 0);
  const offsetHour = Number(groups.offsetHour ?? 0);
  const offsetMinute = Number(groups.offsetMinute ?? 0);
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) {
    return F(NaN);
  }
  const dayValue = MakeDay(year, month, day);
  if (!Number.isFinite(dayValue)) {
    return F(NaN);
  }
  // Reject a day that does not exist in the month, such as Feb 30.
  if (day < 1 || Number(DateFromTime(MakeDate(dayValue, 0) as FiniteTimeValue)) !== day) {
    return F(NaN);
  }
  const t = MakeDate(dayValue, MakeTime(hour, minute, second, 0));
  if (groups.zone === undefined) {
    // No time zone: the time is local time.
    return F(TimeClip(UTC(t)));
  }
  const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 60000;
  return F(TimeClip(groups.offsetSign === '-' ? t + offsetMilliseconds : t - offsetMilliseconds));
}

export function bootstrapDate(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, DateConstructor, 'Date', 7, realmRec.Intrinsics['%Date.prototype%'], [
    ['now', Date_now, 0],
    ['parse', Date_parse, 1],
    ['UTC', Date_UTC, 7],
  ]);

  realmRec.Intrinsics['%Date%'] = cons;
}
