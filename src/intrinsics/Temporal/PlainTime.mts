import type { RoundingMode } from '../../abstract-ops/temporal/addition.mts';
import type { TimeUnit } from '../../abstract-ops/temporal/temporal.mts';
import type { TemporalDurationObject, TimeDuration } from './Duration.mts';
import {
  ObjectValue, type FunctionObject, type OrdinaryObject, type PlainCompletion, type PlainEvaluator, type Value, type ValueEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-instances */
export interface TemporalPlainTimeObject extends OrdinaryObject {
  readonly InitializedTemporalTime: never;
  readonly Time: TimeRecord;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-time-records */
export interface TimeRecord {
  readonly Days: number;
  readonly Hour: number;
  readonly Minute: number;
  readonly Second: number;
  readonly Millisecond: number;
  readonly Microsecond: number;
  readonly Nanosecond: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtimerecord */
declare function CreateTimeRecord(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number, deltaDays?: number): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-midnighttimerecord */
declare function MidnightTimeRecord(): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-noontimerecord */
declare function NoonTimeRecord(): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetime */
declare function DifferenceTime(one: TimeRecord, two: TimeRecord): TimeDuration;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaltime */
declare function ToTemporalTime(item: Value, options: Value): ValueEvaluator<TemporalPlainTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totimerecordormidnight */
declare function ToTimeRecordOrMidnight(item: Value): PlainEvaluator<TimeRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-regulatetime */
declare function RegulateTime(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number, overflow: 'constrain' | 'reject'): PlainCompletion<TimeRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidtime */
declare function IsValidTime(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-balancetime */
declare function BalanceTime(hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number): PlainCompletion<TimeRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaltime */
export declare function CreateTemporalTime(time: TimeRecord, newTarget?: FunctionObject): ValueEvaluator<TemporalPlainTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaltimerecord */
declare function ToTemporalTimeRecord(temporalTimeLike: ObjectValue, completeness: 'partial' | 'complete'): PlainEvaluator<TimeRecord>;

/** https://tc39.es/proposal-temporal/#table-temporal-temporaltimelike-record-fields */
const TemporalTimeLikeRecord = {
  __proto__: null!,
  Hour: 'hour',
  Minute: 'minute',
  Second: 'second',
  Millisecond: 'millisecond',
  Microsecond: 'microsecond',
  Nanosecond: 'nanosecond',
};
Object.freeze(TemporalTimeLikeRecord);

/** https://tc39.es/proposal-temporal/#sec-temporal-timerecordtostring */
declare function TimeRecordToString(time: TimeRecord, precision: number | 'minute' | 'auto'): PlainCompletion<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimerecord */
declare function CompareTimeRecord(time1: TimeRecord, time2: TimeRecord): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-addtime */
declare function AddTime(time: TimeRecord, timeDuration: TimeDuration): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtime */
declare function RoundTime(time: TimeRecord, increment: number, unit: TimeUnit | 'day', roundingMode: RoundingMode): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaintime */
declare function DifferenceTemporalPlainTime(operation: 'since' | 'until', temporalTime: TemporalPlainTimeObject, other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtotime */
declare function AddDurationToTime(operation: 'add' | 'subtract', temporalTime: TemporalPlainTimeObject, temporalDurationLike: Value): ValueEvaluator<TemporalPlainTimeObject>;
