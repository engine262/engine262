import { bootstrapConstructor } from '../bootstrap.mts';
import {
  CanonicalizeCalendar,
  type CalendarType,
} from '../../abstract-ops/temporal/calendar.mts';
import { bootstrapTemporalPlainDateTimePrototype } from './PlainDateTimePrototype.mts';
import type { ISODateRecord } from './PlainDate.mts';
import {
  JSStringValue,
  Q,
  Throw,
  Value,
  type OrdinaryObject,
  type ValueEvaluator,
  type Realm,
  type Arguments,
  type FunctionCallContext,
  UndefinedValue,
  F,
  CombineISODateAndTimeRecord,
  CompareISODateTime,
  CreateISODateRecord,
  CreateTemporalDateTime,
  CreateTimeRecord,
  IsValidISODate,
  IsValidTime,
  ToIntegerWithTruncation,
  ToTemporalDateTime,
  type TimeRecord,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindatetime-instances */
export interface TemporalPlainDateTimeObject extends OrdinaryObject {
  readonly InitializedTemporalDateTime: never;
  readonly ISODateTime: ISODateTimeRecord;
  readonly Calendar: CalendarType;
}
export function isTemporalPlainDateTimeObject(o: Value): o is TemporalPlainDateTimeObject {
  return 'InitializedTemporalDateTime' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-time-records */
export interface ISODateTimeRecord {
  readonly ISODate: ISODateRecord;
  readonly Time: TimeRecord;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime */
function* PlainDateTimeConstructor([
  _isoYear = Value.undefined,
  _isoMonth = Value.undefined,
  _isoDay = Value.undefined,
  _hour = Value.undefined,
  _minute = Value.undefined,
  _second = Value.undefined,
  _millisecond = Value.undefined,
  _microsecond = Value.undefined,
  _nanosecond = Value.undefined,
  _calendar = Value.undefined,
]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  if (NewTarget instanceof UndefinedValue) {
    return Throw.TypeError('Temporal.PlainDateTime cannot be called without new');
  }
  const isoYear = Q(yield* ToIntegerWithTruncation(_isoYear));
  const isoMonth = Q(yield* ToIntegerWithTruncation(_isoMonth));
  const isoDay = Q(yield* ToIntegerWithTruncation(_isoDay));
  const hour = _hour instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_hour));
  const minute = _minute instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_minute));
  const second = _second instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_second));
  const millisecond = _millisecond instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_millisecond));
  const microsecond = _microsecond instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_microsecond));
  const nanosecond = _nanosecond instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_nanosecond));
  if (_calendar instanceof UndefinedValue) {
    _calendar = Value('iso8601');
  }
  if (!(_calendar instanceof JSStringValue)) {
    return Throw.TypeError('calendar is not a string');
  }
  const calendar = Q(CanonicalizeCalendar(_calendar.stringValue()));
  if (!IsValidISODate(isoYear, isoMonth, isoDay)) {
    return Throw.RangeError('$1-$2-$3 is not a valid date', isoYear, isoMonth, isoDay);
  }
  const isoDate = CreateISODateRecord(isoYear, isoMonth, isoDay);
  if (!IsValidTime(hour, minute, second, millisecond, microsecond, nanosecond)) {
    return Throw.RangeError('Invalid time');
  }
  const time = CreateTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond);
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, time);
  return Q(yield* CreateTemporalDateTime(isoDateTime, calendar, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.from */
function* PlainDateTime_from([item = Value.undefined, options = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalDateTime(item, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.compare */
function* PlainDateTime_compare([_one = Value.undefined, _two = Value.undefined]: Arguments): ValueEvaluator {
  const one = Q(yield* ToTemporalDateTime(_one));
  const two = Q(yield* ToTemporalDateTime(_two));
  return F(CompareISODateTime(one.ISODateTime, two.ISODateTime));
}

export function bootstrapTemporalPlainDateTime(realmRec: Realm) {
  const prototype = bootstrapTemporalPlainDateTimePrototype(realmRec);

  const constructor = bootstrapConstructor(realmRec, PlainDateTimeConstructor, 'PlainDateTime', 3, prototype, [
    ['from', PlainDateTime_from, 1],
    ['compare', PlainDateTime_compare, 2],
  ]);
  realmRec.Intrinsics['%Temporal.PlainDateTime%'] = constructor;
  return constructor;
}
