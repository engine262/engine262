import { bootstrapConstructor } from '../bootstrap.mts';
import {
  CanonicalizeCalendar,
  type CalendarType,
} from '../../abstract-ops/temporal/calendar.mts';
import { bootstrapTemporalPlainMonthDayPrototype } from './PlainMonthDayPrototype.mts';
import type { ISODateRecord } from './PlainDate.mts';
import {
  JSStringValue,
  Q,
  Throw,
  Value,
  UndefinedValue,
  F,
  ToIntegerWithTruncation,
  type Arguments,
  type FunctionCallContext,
  type Realm,
  type OrdinaryObject,
  type ValueEvaluator,
  CreateISODateRecord,
  CreateTemporalMonthDay,
  IsValidISODate,
  ToTemporalMonthDay,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-instances */
export interface TemporalPlainMonthDayObject extends OrdinaryObject {
  readonly InitializedTemporalMonthDay: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}

export function isTemporalPlainMonthDayObject(o: Value): o is TemporalPlainMonthDayObject {
  return 'InitializedTemporalMonthDay' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday */
function* PlainMonthDayConstructor([
  isoMonth = Value.undefined,
  isoDay = Value.undefined,
  _calendar = Value.undefined,
  referenceISOYear = Value.undefined,
]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  if (NewTarget instanceof UndefinedValue) {
    return Throw.TypeError('Temporal.PlainMonthDay cannot be called without new');
  }
  if (referenceISOYear instanceof UndefinedValue) {
    referenceISOYear = F(1972);
  }
  const m = Q(yield* ToIntegerWithTruncation(isoMonth));
  const d = Q(yield* ToIntegerWithTruncation(isoDay));
  if (_calendar instanceof UndefinedValue) {
    _calendar = Value('iso8601');
  }
  if (!(_calendar instanceof JSStringValue)) {
    return Throw.TypeError('calendar is not a string');
  }
  const calendar = Q(CanonicalizeCalendar(_calendar.stringValue()));
  const y = Q(yield* ToIntegerWithTruncation(referenceISOYear));
  if (!IsValidISODate(y, m, d)) {
    return Throw.RangeError('$1-$2-$3 is not a valid date', y, m, d);
  }
  const isoDate = CreateISODateRecord(y, m, d);
  return Q(yield* CreateTemporalMonthDay(isoDate, calendar, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.from */
function* PlainMonthDay_from([item = Value.undefined, options = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalMonthDay(item, options));
}

export function bootstrapTemporalPlainMonthDay(realmRec: Realm) {
  const prototype = bootstrapTemporalPlainMonthDayPrototype(realmRec);

  const constructor = bootstrapConstructor(realmRec, PlainMonthDayConstructor, 'PlainMonthDay', 2, prototype, [
    ['from', PlainMonthDay_from, 1],
  ]);
  realmRec.Intrinsics['%Temporal.PlainMonthDay%'] = constructor;
  return constructor;
}
