// Addition/Edition to the main spec.
// Code here should move elsewhere after Temporal is merged.

import type { ObjectValue, PlainEvaluator, PropertyKeyValue, Value, ValueCompletion, ValueEvaluator } from '#self';
import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';

/** https://tc39.es/proposal-temporal/#sec-year-week-record-specification-type */
export interface YearWeekRecord {
  readonly Week: number | undefined;
  readonly Year: number | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-tointegerifintegral */
export declare function ToIntegerIfIntegral(argument: Value): PlainEvaluator<number>;

/** https://tc39.es/proposal-temporal/#sec-getoptionsobject */
export declare function GetOptionsObject(options: Value): ValueCompletion<ObjectValue>;

/** https://tc39.es/proposal-temporal/#sec-getoption */
export declare function GetOption(
  options: ObjectValue,
  property: PropertyKeyValue,
  type: "boolean" | "string",
  values: Value[] | undefined,
  defaultValue: "required" | Value
): ValueEvaluator;

/** https://tc39.es/proposal-temporal/#sec-getroundingmodeoption */
export declare function GetRoundingModeOption(
  options: ObjectValue,
  fallback: RoundingMode
): PlainEvaluator<RoundingMode>;

/** https://tc39.es/proposal-temporal/#table-temporal-rounding-modes */
export enum RoundingMode {
  Ceil,
  Floor,
  Expand,
  Trunc,
  HalfCeil,
  HalfFloor,
  HalfExpand,
  HalfTrunc,
  HalfEven
}
/** https://tc39.es/proposal-temporal/#sec-getroundingincrementoption */
export declare function GetRoundingIncrementOption(
  options: ObjectValue
): PlainEvaluator<number>;

/** https://tc39.es/proposal-temporal/#sec-getutcepochnanoseconds */
export declare function GetUTCEpochNanoseconds(
  isoDateTime: ISODateTimeRecord
): bigint;

/** https://tc39.es/proposal-temporal/#sec-time-zone-identifiers */
export type TimeZoneIdentifier = string & { readonly TimeZoneIdentifier: never; };

/** https://tc39.es/proposal-temporal/#sec-getnamedtimezoneepochnanoseconds */
export declare function GetNamedTimeZoneEpochNanoseconds(
  timeZoneIdentifier: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord
): bigint[];

/** https://tc39.es/proposal-temporal/#sec-systemtimezoneidentifier */
export declare function SystemTimeZoneIdentifier(): TimeZoneIdentifier;

/** https://tc39.es/proposal-temporal/#sec-localtime-temporaledited */
export declare function LocalTime_TemporalEdited(t: number): number;

/** https://tc39.es/proposal-temporal/#sec-utc-temporaledited */
export declare function UTC_TemporalEdited(t: number): number;

/** https://tc39.es/proposal-temporal/#sec-timestring */
export declare function TimeString(tv: number): string;

/** https://tc39.es/proposal-temporal/#sec-timezonestring-temporaledited */
export declare function TimeZoneString_TemporalEdited(tv: number): string;

/** https://tc39.es/proposal-temporal/#sec-isoffsettimezoneidentifier */
export declare function IsOffsetTimeZoneIdentifier(offsetString: string): boolean;

/** https://tc39.es/proposal-temporal/#sec-parsedatetimeutcoffset */
export declare function ParseDateTimeUTCOffset(offsetString: string): number;
