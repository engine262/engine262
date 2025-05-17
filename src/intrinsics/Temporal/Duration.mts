import type { FunctionObject, OrdinaryObject, PlainCompletion, PlainEvaluator, Value, ValueEvaluator } from '#self';
import type { RoundingMode, TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import type { DateUnit, TemporalUnit, TimeUnit } from '../../abstract-ops/temporal/temporal.mts';
import type { TemporalPlainDateObject } from './PlainDate.mts';
import type { ISODateTimeRecord } from './PlainDateTime.mts';
import type { CalendarType } from '../../abstract-ops/temporal/calendar.mts';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-duration-instances */
export interface TemporalDurationObject extends OrdinaryObject {
  readonly InitializedTemporalDuration: never;
  readonly Years: number;
  readonly Months: number;
  readonly Weeks: number;
  readonly Days: number;
  readonly Hours: number;
  readonly Minutes: number;
  readonly Seconds: number;
  readonly Milliseconds: number;
  readonly Microseconds: number;
  readonly Nanoseconds: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-date-duration-records */
export interface DateDurationRecord {
  readonly Years: number;
  readonly Months: number;
  readonly Weeks: number;
  readonly Days: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-partial-duration-records */
export interface PartialDurationRecord {
  readonly Years: number | undefined;
  readonly Months: number | undefined;
  readonly Weeks: number | undefined;
  readonly Days: number | undefined;
  readonly Hours: number | undefined;
  readonly Minutes: number | undefined;
  readonly Seconds: number | undefined;
  readonly Milliseconds: number | undefined;
  readonly Microseconds: number | undefined;
  readonly Nanoseconds: number | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export interface InternalDurationRecord {
  readonly Date: DateDurationRecord;
  readonly Time: TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export type TimeDuration = number & { readonly TimeDuration: never };

/** https://tc39.es/proposal-temporal/#sec-temporal-zerodateduration */
declare function ZeroDateDuration(): DateDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-tointernaldurationrecord */
declare function ToInternalDurationRecord(duration: TemporalDurationObject): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-tointernaldurationrecordwith24hourdays */
declare function ToInternalDurationRecordWith24HourDays(duration: TemporalDurationObject): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-todatedurationrecordwithouttime */
declare function ToDateDurationRecordWithoutTime(duration: TemporalDurationObject): DateDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationfrominternal */
declare function TemporalDurationFromInternal(internalDuration: InternalDurationRecord, largestUnit: TemporalUnit): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createdatedurationrecord */
declare function CreateDateDurationRecord(years: number, months: number, weeks: number, days: number): DateDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-adjustdatedurationrecord */
declare function AdjustDateDurationRecord(
  dateDuration: DateDurationRecord,
  days: number,
  weeks?: number,
  months?: number
): PlainCompletion<DateDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-combinedateandtimeduration */
declare function CombineDateAndTimeDuration(dateDuration: DateDurationRecord, timeDuration: TimeDuration): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration */
declare function ToTemporalDuration(item: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-durationsign */
declare function DurationSign(duration: TemporalDurationObject): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationsign */
declare function DateDurationSign(dateDuration: DateDurationRecord): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-internaldurationsign */
declare function InternalDurationSign(internalDuration: InternalDurationRecord): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidduration */
declare function IsValidDuration(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number
): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-defaulttemporallargestunit */
declare function DefaultTemporalLargestUnit(duration: TemporalDurationObject): TemporalUnit;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalpartialdurationrecord */
declare function ToTemporalPartialDurationRecord(temporalDurationLike: Value): PlainEvaluator<PartialDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalduration */
declare function CreateTemporalDuration(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number,
  newTarget?: FunctionObject
): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createnegatedtemporalduration */
declare function CreateNegatedTemporalDuration(duration: TemporalDurationObject): TemporalDurationObject;

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationfromcomponents */
declare function TimeDurationFromComponents(
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number
): TimeDuration;

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimeduration */
declare function AddTimeDuration(one: TimeDuration, two: TimeDuration): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-add24hourdaystotimeduration */
declare function Add24HourDaysToTimeDuration(d: TimeDuration, days: number): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimedurationtoepochnanoseconds */
declare function AddTimeDurationToEpochNanoseconds(d: TimeDuration, epochNs: bigint): bigint;

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimeduration */
declare function CompareTimeDuration(one: TimeDuration, two: TimeDuration): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationfromepochnanosecondsdifference */
declare function TimeDurationFromEpochNanosecondsDifference(one: bigint, two: bigint): TimeDuration;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimedurationtoincrement */
declare function RoundTimeDurationToIncrement(
  d: TimeDuration,
  increment: number,
  roundingMode: RoundingMode
): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationsign */
declare function TimeDurationSign(d: TimeDuration): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationdays */
declare function DateDurationDays(dateDuration: DateDurationRecord, plainRelativeTo: TemporalPlainDateObject): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimeduration */
declare function RoundTimeDuration(
  timeDuration: TimeDuration,
  increment: number,
  unit: TimeUnit,
  roundingMode: RoundingMode
): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totaltimeduration */
declare function TotalTimeDuration(timeDuration: TimeDuration, unit: TimeUnit | 'day'): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-duration-nudge-result-records */
export interface DurationNudgeResultRecord {
  readonly Duration: InternalDurationRecord;
  readonly NudgedEpochNs: bigint;
  readonly DidExpandCalendarUnit: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetocalendarunit */
declare function NudgeToCalendarUnit(
  sign: -1 | 1,
  duration: InternalDurationRecord,
  destEpochNs: bigint,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  increment: number,
  unit: DateUnit,
  roundingMode: RoundingMode
): PlainCompletion<{ NudgeResult: DurationNudgeResultRecord; Total: number }>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetozonedtime */
declare function NudgeToZonedTime(
  sign: -1 | 1,
  duration: InternalDurationRecord,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  increment: number,
  unit: TimeUnit,
  roundingMode: RoundingMode
): PlainCompletion<DurationNudgeResultRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetodayortime */
declare function NudgeToDayOrTime(
  duration: InternalDurationRecord,
  destEpochNs: bigint,
  largestUnit: TemporalUnit,
  increment: number,
  smallestUnit: TimeUnit | 'day',
  roundingMode: RoundingMode
): PlainCompletion<DurationNudgeResultRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-bubblerelativeduration */
declare function BubbleRelativeDuration(
  sign: -1 | 1,
  duration: InternalDurationRecord,
  nudgedEpochNs: bigint,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  largestUnit: DateUnit,
  smallestUnit: DateUnit
): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundrelativeduration */
declare function RoundRelativeDuration(
  duration: InternalDurationRecord,
  destEpochNs: bigint,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
  increment: number,
  smallestUnit: TemporalUnit,
  roundingMode: RoundingMode
): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totalrelativeduration */
declare function TotalRelativeDuration(
  duration: InternalDurationRecord,
  destEpochNs: bigint,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  unit: TemporalUnit
): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationtostring */
declare function TemporalDurationToString(
  duration: TemporalDurationObject,
  precision: number | 'auto'
): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurations */
declare function AddDurations(
  operation: 'add' | 'subtract',
  duration: TemporalDurationObject,
  other: Value
): ValueEvaluator<TemporalDurationObject>;
