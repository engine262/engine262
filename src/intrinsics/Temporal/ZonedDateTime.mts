import type { FunctionObject, ObjectValue, OrdinaryObject, PlainCompletion, Value, ValueEvaluator } from '#self';
import type { RoundingMode, TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import type { TemporalUnit } from '../../abstract-ops/temporal/temporal.mts';
import type { InternalDurationRecord, TemporalDurationObject } from './Duration.mts';
import type { ISODateRecord } from './PlainDate.mts';
import type { TimeRecord } from './PlainTime.mts';
import type { CalendarType } from '../../abstract-ops/temporal/calendar.mts';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-zoneddatetime-instances */
export interface TemporalZonedDateTimeObject extends OrdinaryObject {
  readonly InitializedTemporalZonedDateTime: never;
  readonly EpochNanoseconds: bigint;
  readonly TimeZone: TimeZoneIdentifier;
  readonly Calendar: CalendarType;
}
export function isTemporalZonedDateTimeObject(o: ObjectValue): o is TemporalZonedDateTimeObject {
  return 'InitializedTemporalZonedDateTime' in o;
}

export type ISODateTimeOffsetBehaviour = 'option' | 'exact' | 'wall';
export type ISODateTimeMatchBehaviour = 'match-exactly' | 'match-minutes';

/** https://tc39.es/proposal-temporal/#sec-temporal-interpretisodatetimeoffset */
export declare function InterpretISODateTimeOffset(
  isoDate: ISODateRecord,
  time: TimeRecord | 'start-of-day',
  offsetBehaviour: ISODateTimeOffsetBehaviour,
  offsetNanoseconds: number,
  timeZone: TimeZoneIdentifier,
  disambiguation: 'earlier' | 'later' | 'compatible' | 'reject',
  offsetOption: 'ignore' | 'use' | 'prefer' | 'reject',
  matchBehaviour: ISODateTimeMatchBehaviour
): PlainCompletion<bigint>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime */
declare function ToTemporalZonedDateTime(
  item: Value,
  options?: Value
): ValueEvaluator<TemporalZonedDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalzoneddatetime */
export declare function CreateTemporalZonedDateTime(
  epochNanoseconds: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  newTarget?: FunctionObject
): ValueEvaluator<TemporalZonedDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalzoneddatetimetostring */
declare function TemporalZonedDateTimeToString(
  zonedDateTime: TemporalZonedDateTimeObject,
  precision: number | 'minute' | 'auto',
  showCalendar: 'auto' | 'always' | 'never' | 'critical',
  showTimeZone: 'auto' | 'never' | 'critical',
  showOffset: 'auto' | 'never',
  increment?: number,
  unit?: 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond',
  roundingMode?: RoundingMode
): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-addzoneddatetime */
declare function AddZonedDateTime(
  epochNanoseconds: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  duration: InternalDurationRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<bigint>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetime */
declare function DifferenceZonedDateTime(
  ns1: bigint,
  ns2: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  largestUnit: TemporalUnit
): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithrounding */
declare function DifferenceZonedDateTimeWithRounding(
  ns1: bigint,
  ns2: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
  roundingIncrement: number,
  smallestUnit: TemporalUnit,
  roundingMode: RoundingMode
): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithtotal */
declare function DifferenceZonedDateTimeWithTotal(
  ns1: bigint,
  ns2: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  unit: TemporalUnit
): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalzoneddatetime */
declare function DifferenceTemporalZonedDateTime(
  operation: 'until' | 'since',
  zonedDateTime: TemporalZonedDateTimeObject,
  other: Value,
  options: Value
): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtozoneddatetime */
declare function AddDurationToZonedDateTime(
  operation: 'add' | 'subtract',
  zonedDateTime: TemporalZonedDateTimeObject,
  temporalDurationLike: Value,
  options: Value
): ValueEvaluator<TemporalZonedDateTimeObject>;
