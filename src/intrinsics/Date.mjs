import {
  Assert,
  OrdinaryCreateFromConstructor,
  ToPrimitive,
  ToNumber,
  ToInteger,
  MakeDate,
  MakeDay,
  MakeTime,
  UTC,
  TimeClip,
} from '../abstract-ops/all.mjs';
import { Value, Type } from '../value.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { ToDateString, thisTimeValue } from './DatePrototype.mjs';
import { Q, X } from '../completion.mjs';

function DateConstructor([year, month, date, hours, minutes, seconds, ms], { NewTarget, callLength }) {
  const numberOfArgs = callLength;
  if (numberOfArgs >= 2) {
    // 20.3.2.1 #sec-date-year-month-date-hours-minutes-seconds-ms
    Assert(numberOfArgs >= 2);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(now);
    } else {
      const y = Q(ToNumber(year));
      const m = Q(ToNumber(month));
      const dt = date ? Q(ToNumber(date)) : new Value(1);
      const h = hours ? Q(ToNumber(hours)) : new Value(0);
      const min = minutes ? Q(ToNumber(minutes)) : new Value(0);
      const s = seconds ? Q(ToNumber(seconds)) : new Value(0);
      const milli = ms ? Q(ToNumber(ms)) : new Value(0);
      let yr;
      if (y.isNaN()) {
        yr = new Value(NaN);
      } else {
        const yi = X(ToInteger(y)).numberValue();
        if (yi >= 0 && yi <= 99) {
          yr = new Value(1900 + yi);
        } else {
          yr = y;
        }
      }
      const finalDate = MakeDate(MakeDay(yr, m, dt), MakeTime(h, min, s, milli));
      const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%DatePrototype%', ['DateValue']));
      O.DateValue = TimeClip(UTC(finalDate));
      return O;
    }
  } else if (numberOfArgs === 1) {
    const value = year;
    // 20.3.2.2 #sec-date-value
    Assert(numberOfArgs === 1);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(now);
    } else {
      let tv;
      if (Type(value) === 'Object' && 'DateValue' in value) {
        tv = thisTimeValue(value);
      } else {
        const v = Q(ToPrimitive(value));
        if (Type(v) === 'String') {
          tv = undefined;
        } else {
          tv = Q(ToNumber(v));
        }
      }
      const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%DatePrototype%', ['DateValue']));
      O.DateValue = TimeClip(tv);
      return O;
    }
  } else {
    // 20.3.2.3 #sec-date-constructor-date
    Assert(numberOfArgs === 0);
    if (NewTarget === Value.undefined) {
      const now = Date.now();
      return ToDateString(now);
    } else {
      const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%DatePrototype%', ['DateValue']));
      O.DateValue = Date.now();
      return O;
    }
  }
}

export function CreateDate(realmRec) {
  const cons = BootstrapConstructor(realmRec, DateConstructor, 'Date', 1, realmRec.Intrinsics['%DatePrototype%'], [
    // now
    // parse
    // UTC
  ]);

  realmRec.Intrinsics['%Date%'] = cons;
}
