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
} from '../abstract-ops/all.mjs';
import { Value, JSStringValue, ObjectValue } from '../value.mjs';
import {
  AbruptCompletion,
  Q, X,
} from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';
import { ToDateString, thisTimeValue } from './DatePrototype.mjs';

// #sec-date-constructor
function DateConstructor(args, { NewTarget }) {
  const numberOfArgs = args.length;
  if (numberOfArgs >= 2) {
    // 20.3.2.1 #sec-date-year-month-date-hours-minutes-seconds-ms
    const [year, month, date, hours, minutes, seconds, ms] = args;
    Assert(numberOfArgs >= 2);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(F(now));
    } else {
      const y = Q(ToNumber(year));
      const m = Q(ToNumber(month));
      let dt;
      if (date !== undefined) {
        dt = Q(ToNumber(date));
      } else {
        dt = F(1);
      }
      let h;
      if (hours !== undefined) {
        h = Q(ToNumber(hours));
      } else {
        h = F(+0);
      }
      let min;
      if (minutes !== undefined) {
        min = Q(ToNumber(minutes));
      } else {
        min = F(+0);
      }
      let s;
      if (seconds !== undefined) {
        s = Q(ToNumber(seconds));
      } else {
        s = F(+0);
      }
      let milli;
      if (ms !== undefined) {
        milli = Q(ToNumber(ms));
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
      const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%Date.prototype%', ['DateValue']));
      O.DateValue = TimeClip(UTC(finalDate));
      return O;
    }
  } else if (numberOfArgs === 1) {
    const [value] = args;
    // 20.3.2.2 #sec-date-value
    Assert(numberOfArgs === 1);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(F(now));
    } else {
      let tv;
      if (value instanceof ObjectValue && 'DateValue' in value) {
        tv = thisTimeValue(value);
      } else {
        const v = Q(ToPrimitive(value));
        if (v instanceof JSStringValue) {
          // Assert: The next step never returns an abrupt completion because Type(v) is String.
          tv = parseDate(v);
        } else {
          tv = Q(ToNumber(v));
        }
      }
      const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%Date.prototype%', ['DateValue']));
      O.DateValue = TimeClip(tv);
      return O;
    }
  } else {
    // 20.3.2.3 #sec-date-constructor-date
    Assert(numberOfArgs === 0);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(F(now));
    } else {
      const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%Date.prototype%', ['DateValue']));
      O.DateValue = F(Date.now());
      return O;
    }
  }
}

// 20.3.3.1 #sec-date.now
function Date_now() {
  const now = Date.now();
  return F(now);
}

// 20.3.3.2 #sec-date.parse
function Date_parse([string = Value.undefined]) {
  const str = ToString(string);
  if (str instanceof AbruptCompletion) {
    return str;
  }
  return parseDate(str);
}

// 20.3.3.4 #sec-date.utc
function Date_UTC([year = Value.undefined, month, date, hours, minutes, seconds, ms]) {
  const y = Q(ToNumber(year));
  let m;
  if (month !== undefined) {
    m = Q(ToNumber(month));
  } else {
    m = F(+0);
  }
  let dt;
  if (date !== undefined) {
    dt = Q(ToNumber(date));
  } else {
    dt = F(1);
  }
  let h;
  if (hours !== undefined) {
    h = Q(ToNumber(hours));
  } else {
    h = F(+0);
  }
  let min;
  if (minutes !== undefined) {
    min = Q(ToNumber(minutes));
  } else {
    min = F(+0);
  }
  let s;
  if (seconds !== undefined) {
    s = Q(ToNumber(seconds));
  } else {
    s = F(+0);
  }
  let milli;
  if (ms !== undefined) {
    milli = Q(ToNumber(ms));
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

function parseDate(dateTimeString) {
  // 20.3.1.15 #sec-date-time-string-format
  // TODO: implement parsing without the host.
  const parsed = Date.parse(dateTimeString.stringValue());
  return F(parsed);
}

export function bootstrapDate(realmRec) {
  const cons = bootstrapConstructor(realmRec, DateConstructor, 'Date', 7, realmRec.Intrinsics['%Date.prototype%'], [
    ['now', Date_now, 0],
    ['parse', Date_parse, 1],
    ['UTC', Date_UTC, 7],
  ]);

  realmRec.Intrinsics['%Date%'] = cons;
}
