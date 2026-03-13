import { bootstrapConstructor } from '../bootstrap.mts';
import { bootstrapTemporalPlainDatePrototype } from './PlainDatePrototype.mts';
import {
  type Realm, Value, UndefinedValue, Q, JSStringValue, type FunctionCallContext, type Arguments, F, type OrdinaryObject, type ValueEvaluator,
  Throw,
  CompareISODate,
  CreateISODateRecord,
  CreateTemporalDate,
  IsValidISODate,
  ToTemporalDate,
  type CalendarType,
  CanonicalizeCalendar,
  ToIntegerWithTruncation,
} from '#self';

export interface TemporalPlainDateObject extends OrdinaryObject {
  /** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-instances */
  readonly InitializedTemporalDate: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}
export function isTemporalPlainDateObject(o: Value): o is TemporalPlainDateObject {
  return 'InitializedTemporalDate' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-records */
export interface ISODateRecord {
  readonly Year: number;
  readonly Month: number;
  readonly Day: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate */
function* PlainDateConstructor([isoYear = Value.undefined, isoMonth = Value.undefined, isoDay = Value.undefined, _calendar = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  if (NewTarget instanceof UndefinedValue) {
    return Throw.TypeError('Temporal.PlainDate constructor cannot be called without new');
  }
  const y = Q(yield* ToIntegerWithTruncation(isoYear));
  const m = Q(yield* ToIntegerWithTruncation(isoMonth));
  const d = Q(yield* ToIntegerWithTruncation(isoDay));
  if (_calendar instanceof UndefinedValue) {
    _calendar = Value('iso8601');
  }
  if (!(_calendar instanceof JSStringValue)) {
    return Throw.TypeError('calendar must be a string, but $1', _calendar);
  }
  const calendar = Q(CanonicalizeCalendar(_calendar.stringValue()));
  if (!IsValidISODate(y, m, d)) {
    return Throw.RangeError('Invalid date');
  }
  const isoDate = CreateISODateRecord(y, m, d);
  return Q(yield* CreateTemporalDate(isoDate, calendar, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.from */
function* PlainDate_From([item = Value.undefined, options = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalDate(item, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.compare */
function* PlainDate_Compare([_one = Value.undefined, _two = Value.undefined]: Arguments): ValueEvaluator {
  const one = Q(yield* ToTemporalDate(_one));
  const two = Q(yield* ToTemporalDate(_two));
  return F(CompareISODate(one.ISODate, two.ISODate));
}

export function bootstrapTemporalPlainDate(realmRec: Realm) {
  const prototype = bootstrapTemporalPlainDatePrototype(realmRec);
  realmRec.Intrinsics['%Temporal.PlainDate.prototype%'] = prototype;

  const constructor = bootstrapConstructor(realmRec, PlainDateConstructor, 'PlainDate', 3, prototype, [
    ['from', PlainDate_From, 1],
    ['compare', PlainDate_Compare, 2],
  ]);
  realmRec.Intrinsics['%Temporal.PlainDate%'] = constructor;

  return constructor;
}
