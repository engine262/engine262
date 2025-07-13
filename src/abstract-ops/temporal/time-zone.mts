import type { PlainCompletion, Value } from '#self';
import type { ISODateRecord } from '../../intrinsics/Temporal/PlainDate.mts';
import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import type { TimeZoneIdentifier } from './addition.mts';

// https://tc39.es/proposal-temporal/#sec-temporal-getavailablenamedtimezoneidentifier
export declare function GetAvailableNamedTimeZoneIdentifier(timeZoneIdentifier: TimeZoneIdentifier): TimeZoneIdentifierRecord | undefined;

/** https://tc39.es/ecma262/#sec-time-zone-identifier-record */
export interface TimeZoneIdentifierRecord {
  readonly Identifier: TimeZoneIdentifier;
  readonly PrimaryIdentifier: TimeZoneIdentifier;
}

// https://tc39.es/proposal-temporal/#sec-temporal-getisopartsfromepoch
export declare function GetISOPartsFromEpoch(epochNanoseconds: bigint): ISODateTimeRecord;

// https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezonenexttransition
export declare function GetNamedTimeZoneNextTransition(timeZoneIdentifier: TimeZoneIdentifier, epochNanoseconds: bigint): bigint | null;

// https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezoneprevioustransition
export declare function GetNamedTimeZonePreviousTransition(timeZoneIdentifier: TimeZoneIdentifier, epochNanoseconds: bigint): bigint | null;

// https://tc39.es/proposal-temporal/#sec-temporal-formatoffsettimezoneidentifier
export declare function FormatOffsetTimeZoneIdentifier(offsetMinutes: number, style?: 'separated' | 'unseparated'): TimeZoneIdentifier;

// https://tc39.es/proposal-temporal/#sec-temporal-formatutcoffsetnanoseconds
export declare function FormatUTCOffsetNanoseconds(offsetNanoseconds: number): string;

// https://tc39.es/proposal-temporal/#sec-temporal-formatdatetimeutcoffsetrounded
export declare function FormatDateTimeUTCOffsetRounded(offsetNanoseconds: number): string;

// https://tc39.es/proposal-temporal/#sec-temporal-totemporaltimezoneidentifier
export declare function ToTemporalTimeZoneIdentifier(temporalTimeZoneLike: Value | string): PlainCompletion<TimeZoneIdentifier>;

// https://tc39.es/proposal-temporal/#sec-temporal-getoffsetnanosecondsfor
export declare function GetOffsetNanosecondsFor(timeZone: TimeZoneIdentifier, epochNs: bigint): number;

// https://tc39.es/proposal-temporal/#sec-temporal-getisodatetimefor
export declare function GetISODateTimeFor(timeZone: TimeZoneIdentifier, epochNs: bigint): ISODateTimeRecord;

// https://tc39.es/proposal-temporal/#sec-temporal-getepochnanosecondsfor
export declare function GetEpochNanosecondsFor(
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
  disambiguation: 'compatible' | 'earlier' | 'later' | 'reject'
): PlainCompletion<bigint>;

// https://tc39.es/proposal-temporal/#sec-temporal-disambiguatepossibleepochnanoseconds
export declare function DisambiguatePossibleEpochNanoseconds(
  possibleEpochNs: readonly bigint[],
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
  disambiguation: 'compatible' | 'earlier' | 'later' | 'reject'
): PlainCompletion<bigint>;

// https://tc39.es/proposal-temporal/#sec-temporal-getpossibleepochnanoseconds
export declare function GetPossibleEpochNanoseconds(
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord
): PlainCompletion<bigint[]>;

// https://tc39.es/proposal-temporal/#sec-temporal-getstartofday
export declare function GetStartOfDay(
  timeZone: TimeZoneIdentifier,
  isoDate: ISODateRecord
): PlainCompletion<bigint>;

// https://tc39.es/proposal-temporal/#sec-temporal-timezoneequals
export declare function TimeZoneEquals(one: TimeZoneIdentifier, two: TimeZoneIdentifier): boolean;

// https://tc39.es/proposal-temporal/#sec-temporal-parsetimezoneidentifier
export declare function ParseTimeZoneIdentifier(identifier: TimeZoneIdentifier): PlainCompletion<{ Name?: TimeZoneIdentifier; OffsetMinutes?: number }>;
