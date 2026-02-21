import { bootstrapConstructor } from '../bootstrap.mts';
import {
  ToIntegerWithTruncation,
} from '../../abstract-ops/temporal/temporal.mts';
import { bootstrapTemporalPlainTimePrototype } from './PlainTimePrototype.mts';
import {
  Q, Throw, UndefinedValue, Value, type OrdinaryObject, type ValueEvaluator,
  type Realm,
  type Arguments,
  type FunctionCallContext,
  F,
  CompareTimeRecord,
  CreateTemporalTime,
  CreateTimeRecord,
  IsValidTime,
  ToTemporalTime,
  type TimeRecord,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-instances */
export interface TemporalPlainTimeObject extends OrdinaryObject {
  readonly InitializedTemporalTime: never;
  readonly Time: TimeRecord;
}

export function isTemporalPlainTimeObject(value: Value): value is TemporalPlainTimeObject {
  return 'InitializedTemporalTime' in value;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime */
function* PlainTimeConstructor([
  _hour = Value.undefined,
  _minute = Value.undefined,
  _second = Value.undefined,
  _millisecond = Value.undefined,
  _microsecond = Value.undefined,
  _nanosecond = Value.undefined,
]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  if (NewTarget instanceof UndefinedValue) {
    return Throw.TypeError('Temporal.PlainTime cannot be called without new');
  }
  const hour = _hour instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_hour));
  const minute = _minute instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_minute));
  const second = _second instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_second));
  const millisecond = _millisecond instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_millisecond));
  const microsecond = _microsecond instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_microsecond));
  const nanosecond = _nanosecond instanceof UndefinedValue ? 0 : Q(yield* ToIntegerWithTruncation(_nanosecond));
  if (!IsValidTime(hour, minute, second, millisecond, microsecond, nanosecond)) {
    return Throw.RangeError('Invalid time');
  }
  const time = CreateTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond);
  return Q(yield* CreateTemporalTime(time, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.from */
function* PlainTime_from([item = Value.undefined, options = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalTime(item, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaintime.compare */
function* PlainTime_compare([_one = Value.undefined, _two = Value.undefined]: Arguments): ValueEvaluator {
  const one = Q(yield* ToTemporalTime(_one));
  const two = Q(yield* ToTemporalTime(_two));
  return F(CompareTimeRecord(one.Time, two.Time));
}

export function bootstrapTemporalPlainTime(realmRec: Realm) {
  const prototype = bootstrapTemporalPlainTimePrototype(realmRec);

  const constructor = bootstrapConstructor(realmRec, PlainTimeConstructor, 'PlainTime', 0, prototype, [
    ['from', PlainTime_from, 1],
    ['compare', PlainTime_compare, 2],
  ]);
  realmRec.Intrinsics['%Temporal.PlainTime%'] = constructor;
  return constructor;
}
