import { bootstrapConstructor } from '../bootstrap.mts';
import { NumberToBigInt } from '../../runtime-semantics/all.mts';
import { bootstrapTemporalInstantPrototype } from './InstantPrototype.mts';
import {
  Q,
  Throw,
  X,
  type OrdinaryObject,
  type Realm,
  type Arguments,
  type FunctionCallContext,
  F,
  UndefinedValue,
  ToNumber,
  ToBigInt,
  R,
  Value,
  type ValueEvaluator,
  CompareEpochNanoseconds,
  CreateTemporalInstant,
  IsValidEpochNanoseconds,
  ToTemporalInstant,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-instances */
export interface TemporalInstantObject extends OrdinaryObject {
  readonly InitializedTemporalInstant: never;
  readonly EpochNanoseconds: bigint;
}

export function isTemporalInstantObject(o: Value): o is TemporalInstantObject {
  return 'InitializedTemporalInstant' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant */
function* InstantConstructor([_epochNanoseconds = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  if (NewTarget instanceof UndefinedValue) {
    return Throw.TypeError('Temporal.Instant cannot be called without new');
  }
  const epochNanoseconds = R(Q(yield* ToBigInt(_epochNanoseconds)));
  if (!IsValidEpochNanoseconds(epochNanoseconds)) {
    return Throw.RangeError('$1 is not a valid epoch nanoseconds', epochNanoseconds);
  }
  return Q(yield* CreateTemporalInstant(epochNanoseconds, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.from */
function* Instant_from([item = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalInstant(item));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.fromepochmilliseconds */
function* Instant_fromEpochMilliseconds([___epochMilliseconds = Value.undefined]: Arguments): ValueEvaluator {
  const __epochMilliseconds = Q(yield* ToNumber(___epochMilliseconds));
  const _epochMilliseconds = R(Q(NumberToBigInt(__epochMilliseconds)));
  const epochMilliseconds = _epochMilliseconds * BigInt(10e6);
  if (!IsValidEpochNanoseconds(epochMilliseconds)) {
    return Throw.RangeError('$1 is not a valid epoch nanoseconds', epochMilliseconds);
  }
  return X(CreateTemporalInstant(epochMilliseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.fromepochnanoseconds */
function* Instant_fromEpochNanoseconds([_epochNanoseconds = Value.undefined]: Arguments): ValueEvaluator {
  const epochNanoseconds = R(Q(yield* ToBigInt(_epochNanoseconds)));
  if (!IsValidEpochNanoseconds(epochNanoseconds)) {
    return Throw.RangeError('$1 is not a valid epoch nanoseconds', epochNanoseconds);
  }
  return X(CreateTemporalInstant(epochNanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.instant.compare */
function* Instant_compare([_one = Value.undefined, _two = Value.undefined]: Arguments): ValueEvaluator {
  const one = Q(yield* ToTemporalInstant(_one));
  const two = Q(yield* ToTemporalInstant(_two));
  return F(CompareEpochNanoseconds(one.EpochNanoseconds, two.EpochNanoseconds));
}

export function bootstrapTemporalInstant(realmRec: Realm) {
  const prototype = bootstrapTemporalInstantPrototype(realmRec);

  const constructor = bootstrapConstructor(realmRec, InstantConstructor, 'Instant', 1, prototype, [
    ['from', Instant_from, 1],
    ['fromEpochMilliseconds', Instant_fromEpochMilliseconds, 1],
    ['fromEpochNanoseconds', Instant_fromEpochNanoseconds, 1],
    ['compare', Instant_compare, 2],
  ]);
  realmRec.Intrinsics['%Temporal.Instant%'] = constructor;
  return constructor;
}
