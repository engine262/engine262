import type { FunctionObject, OrdinaryObject, PlainCompletion, Value, ValueEvaluator } from '#self';
import type { RoundingMode, TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import type { TimeUnit } from '../../abstract-ops/temporal/temporal.mts';
import type { InternalDurationRecord, TemporalDurationObject, TimeDuration } from './Duration.mts';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-instances */
export interface TemporalInstantObject extends OrdinaryObject {
  readonly InitializedTemporalInstant: never;
  readonly EpochNanoseconds: bigint;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidepochnanoseconds */
declare function IsValidEpochNanoseconds(epochNanoseconds: bigint): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalinstant */
export declare function CreateTemporalInstant(epochNanoseconds: bigint, newTarget?: FunctionObject): ValueEvaluator<TemporalInstantObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalinstant */
declare function ToTemporalInstant(item: Value): ValueEvaluator<TemporalInstantObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareepochnanoseconds */
declare function CompareEpochNanoseconds(epochNanosecondsOne: bigint, epochNanosecondsTwo: bigint): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-addinstant */
declare function AddInstant(epochNanoseconds: bigint, timeDuration: TimeDuration): PlainCompletion<bigint>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceinstant */
declare function DifferenceInstant(
  ns1: bigint,
  ns2: bigint,
  roundingIncrement: number,
  smallestUnit: TimeUnit,
  roundingMode: RoundingMode,
): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtemporalinstant */
declare function RoundTemporalInstant(
  ns: bigint,
  increment: number,
  unit: TimeUnit,
  roundingMode: RoundingMode,
): bigint;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalinstant-tostring */
declare function TemporalInstantToString(
  instant: TemporalInstantObject,
  timeZone: TimeZoneIdentifier | undefined,
  precision: number | 'minute' | 'auto'
): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalinstant */
declare function DifferenceTemporalInstant(
  operation: 'since' | 'until',
  instant: TemporalInstantObject,
  other: Value,
  options: Value
): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoinstant */
declare function AddDurationToInstant(
  operation: 'add' | 'subtract',
  instant: TemporalInstantObject,
  temporalDurationLike: Value
): ValueEvaluator<TemporalInstantObject>;
