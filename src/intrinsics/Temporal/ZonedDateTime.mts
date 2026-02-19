import { GetUTCEpochNanoseconds, RoundingMode, type TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import { CheckISODaysRange, RoundNumberToIncrement, type TemporalUnit } from '../../abstract-ops/temporal/temporal.mts';
import {
  DisambiguatePossibleEpochNanoseconds,
  GetEpochNanosecondsFor,
  GetPossibleEpochNanoseconds,
  GetStartOfDay,
} from '../../abstract-ops/temporal/time-zone.mts';
import type { CalendarType } from '../../abstract-ops/temporal/calendar.mts';
import type { InternalDurationRecord, TemporalDurationObject } from './Duration.mts';
import { BalanceISODateTime, CombineISODateAndTimeRecord } from './PlainDateTime.mts';
import type { ISODateRecord } from './PlainDate.mts';
import type { TimeRecord } from './PlainTime.mts';
import {
  Assert,
  OrdinaryCreateFromConstructor,
  Q,
  surroundingAgent,
  type Mutable,
  type FunctionObject,
  type ObjectValue,
  type OrdinaryObject,
  type PlainCompletion,
  type Value,
  type ValueEvaluator,
  Throw,
} from '#self';
import { IsValidEpochNanoseconds } from './Instant.mts';

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
export function InterpretISODateTimeOffset(
  isoDate: ISODateRecord,
  time: TimeRecord | 'start-of-day',
  offsetBehaviour: ISODateTimeOffsetBehaviour,
  offsetNanoseconds: number,
  timeZone: TimeZoneIdentifier,
  disambiguation: 'earlier' | 'later' | 'compatible' | 'reject',
  offsetOption: 'ignore' | 'use' | 'prefer' | 'reject',
  matchBehaviour: ISODateTimeMatchBehaviour
): PlainCompletion<bigint> {
  if (time === 'start-of-day') {
    Assert(offsetBehaviour === 'wall');
    Assert(offsetNanoseconds === 0);
    return Q(GetStartOfDay(timeZone, isoDate));
  }
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, time);
  if (offsetBehaviour === 'wall' || (offsetBehaviour === 'option' && offsetOption === 'ignore')) {
    return Q(GetEpochNanosecondsFor(timeZone, isoDateTime, disambiguation));
  }
  if (offsetBehaviour === 'exact' || (offsetBehaviour === 'option' && offsetOption === 'use')) {
    const balanced = BalanceISODateTime(isoDate.Year, isoDate.Month, isoDate.Day, time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, time.Nanosecond - offsetNanoseconds);
    Q(CheckISODaysRange(balanced.ISODate));
    const epochNanoseconds = GetUTCEpochNanoseconds(balanced);
    if (!IsValidEpochNanoseconds(epochNanoseconds)) {
      return Throw.RangeError('Invalid date');
    }
    return epochNanoseconds;
  }
  Assert(offsetBehaviour === 'option');
  Assert(offsetOption === 'prefer' || offsetOption === 'reject');
  Q(CheckISODaysRange(isoDate));
  const utcEpochNanoseconds = GetUTCEpochNanoseconds(isoDateTime);
  const possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, isoDateTime));
  for (const candidate of possibleEpochNs) {
    const candidateOffset = utcEpochNanoseconds - candidate;
    if (candidateOffset === BigInt(offsetNanoseconds)) {
      return candidate;
    }
    if (matchBehaviour === 'match-minutes') {
      const roundedCandidateNanoseconds = RoundNumberToIncrement(Number(candidateOffset), 60 * 1e9, RoundingMode.HalfExpand);
      if (roundedCandidateNanoseconds === offsetNanoseconds) {
        return candidate;
      }
    }
  }
  if (offsetOption === 'reject') {
    return Throw.RangeError('No matching offset found for the given date and time');
  }
  return Q(DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, isoDateTime, disambiguation));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime */
export declare function ToTemporalZonedDateTime(
  item: Value,
  options?: Value
): ValueEvaluator<TemporalZonedDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalzoneddatetime */
export function* CreateTemporalZonedDateTime(
  epochNanoseconds: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  newTarget?: FunctionObject
): ValueEvaluator<TemporalZonedDateTimeObject> {
  Assert(IsValidEpochNanoseconds(epochNanoseconds));
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.ZonedDateTime%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.ZonedDateTime.prototype%', [
    'InitializedTemporalZonedDateTime',
    'EpochNanoseconds',
    'TimeZone',
    'Calendar',
  ])) as Mutable<TemporalZonedDateTimeObject>;
  object.EpochNanoseconds = epochNanoseconds;
  object.TimeZone = timeZone;
  object.Calendar = calendar;
  return object;
}

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
