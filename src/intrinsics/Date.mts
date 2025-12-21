import {
  Assert,
  OrdinaryCreateFromConstructor,
  ToPrimitive,
  ToNumber,
  ToIntegerOrInfinity,
  ToString,
  MakeDate,
  MakeDay,
  MakeTime,
  UTC,
  TimeClip,
  F,
  type OrdinaryObject,
  type FunctionObject,
  Realm,
} from '../abstract-ops/all.mts';
import {
  Value, JSStringValue, ObjectValue, type Arguments, type FunctionCallContext, NumberValue,
} from '../value.mts';
import {
  AbruptCompletion,
  Q, ValueOfNormalCompletion, X,
  type ValueEvaluator,
} from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import { ToDateString, thisTimeValue } from './DatePrototype.mts';

export interface DateObject extends OrdinaryObject {
  DateValue: NumberValue;
}
export function isDateObject(value: Value): value is DateObject {
  return 'DateValue' in value;
}
/** https://tc39.es/ecma262/#sec-date-constructor */
function* DateConstructor(args: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  const numberOfArgs = args.length;
  if (numberOfArgs >= 2) {
    /** https://tc39.es/ecma262/#sec-date-year-month-date-hours-minutes-seconds-ms */
    const [year, month, date, hours, minutes, seconds, ms] = args;
    Assert(numberOfArgs >= 2);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(F(now));
    } else {
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
      let yr;
      if (y.isNaN()) {
        yr = F(NaN);
      } else {
        const yi = X(ToIntegerOrInfinity(y));
        if (yi >= 0 && yi <= 99) {
          yr = F(1900 + yi);
        } else {
          yr = y;
        }
      }
      const finalDate = MakeDate(MakeDay(yr, m, dt), MakeTime(h, min, s, milli));
      const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget as FunctionObject, '%Date.prototype%', ['DateValue'])) as Mutable<DateObject>;
      O.DateValue = TimeClip(UTC(finalDate));
      return O;
    }
  } else if (numberOfArgs === 1) {
    const [value] = args;
    /** https://tc39.es/ecma262/#sec-date-value */
    Assert(numberOfArgs === 1);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(F(now));
    } else {
      let tv;
      if (value instanceof ObjectValue && 'DateValue' in value) {
        tv = X(thisTimeValue(value));
      } else {
        const v = Q(yield* ToPrimitive(value!));
        if (v instanceof JSStringValue) {
          // Assert: The next step never returns an abrupt completion because Type(v) is String.
          tv = parseDate(v);
        } else {
          tv = Q(yield* ToNumber(v));
        }
      }
      const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget as FunctionObject, '%Date.prototype%', ['DateValue'])) as Mutable<DateObject>;
      O.DateValue = TimeClip(tv);
      return O;
    }
  } else {
    /** https://tc39.es/ecma262/#sec-date-constructor-date */
    Assert(numberOfArgs === 0);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(F(now));
    } else {
      const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget as FunctionObject, '%Date.prototype%', ['DateValue'])) as Mutable<DateObject>;
      O.DateValue = F(Date.now());
      return O;
    }
  }
}

/** https://tc39.es/ecma262/#sec-date.now */
function Date_now() {
  const now = Date.now();
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

  let yr;
  if (y.isNaN()) {
    yr = F(NaN);
  } else {
    const yi = X(ToIntegerOrInfinity(y));
    if (yi >= 0 && yi <= 99) {
      yr = F(1900 + yi);
    } else {
      yr = y;
    }
  }

  return TimeClip(MakeDate(MakeDay(yr, m, dt), MakeTime(h, min, s, milli)));
}

function parseDate(dateTimeString: JSStringValue) {
  /** https://tc39.es/ecma262/#sec-date-time-string-format */
  // TODO: implement parsing without the host.
  const parsed = Date.parse(dateTimeString.stringValue());
  return F(parsed);
}

export function bootstrapDate(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, DateConstructor, 'Date', 7, realmRec.Intrinsics['%Date.prototype%'], [
    ['now', Date_now, 0],
    ['parse', Date_parse, 1],
    ['UTC', Date_UTC, 7],
  ]);

  realmRec.Intrinsics['%Date%'] = cons;
}
