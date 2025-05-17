import type { FunctionObject, OrdinaryObject, PlainCompletion, PlainEvaluator, Value, ValueEvaluator } from '#self';
import type { RoundingMode } from '../../abstract-ops/temporal/addition.mts';
import type { TemporalUnit, TimeUnit } from '../../abstract-ops/temporal/temporal.mts';
import type { InternalDurationRecord, TemporalDurationObject } from './Duration.mts';
import type { ISODateRecord } from './PlainDate.mts';
import type { TimeRecord } from './PlainTime.mts';
import type { CalendarFieldsRecord, CalendarType } from '../../abstract-ops/temporal/calendar.mts';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindatetime-instances */
export interface TemporalPlainDateTimeObject extends OrdinaryObject {
  readonly InitializedTemporalDateTime: never;
  readonly ISODateTime: ISODateTimeRecord;
  readonly Calendar: CalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-time-records */
export interface ISODateTimeRecord {
  readonly ISODate: ISODateRecord;
  readonly Time: TimeRecord;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timevaluetoisodatetimerecord */
declare function TimeValueToISODateTimeRecord(t: number): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-combineisodateandtimerecord */
declare function CombineISODateAndTimeRecord(isoDate: ISODateRecord, time: TimeRecord): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetimewithinlimits */
declare function ISODateTimeWithinLimits(isoDateTime: ISODateTimeRecord): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-interprettemporaldatetimefields */
declare function InterpretTemporalDateTimeFields(calendar: CalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateTimeRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime */
declare function ToTemporalDateTime(item: Value, options?: Value): PlainEvaluator<TemporalPlainDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisodatetime */
declare function BalanceISODateTime(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number, microsecond: number, nanosecond: number): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldatetime */
export declare function CreateTemporalDateTime(isoDateTime: ISODateTimeRecord, calendar: CalendarType, newTarget?: FunctionObject): PlainEvaluator<TemporalPlainDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetimetostring */
declare function ISODateTimeToString(isoDateTime: ISODateTimeRecord, calendar: CalendarType, precision: number | 'minute' | 'auto', showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodatetime */
declare function CompareISODateTime(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord): 1 | -1 | 0;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundisodatetime */
declare function RoundISODateTime(isoDateTime: ISODateTimeRecord, increment: number, unit: TimeUnit | 'day', roundingMode: RoundingMode): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceisodatetime */
declare function DifferenceISODateTime(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, largestUnit: TemporalUnit): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithrounding */
declare function DifferencePlainDateTimeWithRounding(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, largestUnit: TemporalUnit, roundingIncrement: number, smallestUnit: TemporalUnit, roundingMode: RoundingMode): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithtotal */
declare function DifferencePlainDateTimeWithTotal(isoDateTime1: ISODateTimeRecord, isoDateTime2: ISODateTimeRecord, calendar: CalendarType, unit: TemporalUnit): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindatetime */
declare function DifferenceTemporalPlainDateTime(operation: 'since' | 'until', dateTime: TemporalPlainDateTimeObject, other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodatetime */
declare function AddDurationToDateTime(operation: 'add' | 'subtract', dateTime: TemporalPlainDateTimeObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateTimeObject>;
