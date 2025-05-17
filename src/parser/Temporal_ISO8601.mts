// https://tc39.es/proposal-temporal/#sec-temporal-iso8601grammar

import type { PlainCompletion, ValueCompletion } from '#self';
import type { TemporalDurationObject } from '../intrinsics/Temporal/Duration.mts';
import type { TimeRecord } from '../intrinsics/Temporal/PlainTime.mts';

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-string-time-zone-parse-records */
export interface ISOStringTimeZoneParseRecord {
  readonly Z: boolean;
  readonly OffsetString: string | undefined;
  readonly TimeZoneAnnotation: string | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-time-parse-records */
export interface ISODateTimeParseRecord {
  readonly Year: number | undefined;
  readonly Month: number;
  readonly Day: number;
  readonly Time: TimeRecord | 'start-of-day';
  readonly TimeZone: ISOStringTimeZoneParseRecord;
  readonly Calendar: string | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-parseisodatetime */
export declare function ParseISODateTimeString(isoString: string, allowedFormats: unknown): PlainCompletion<ISODateTimeParseRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporalcalendarstring */
export declare function ParseTemporalCalendarString(isoString: string): PlainCompletion<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaldurationstring */
export declare function ParseTemporalDurationString(isoString: string): ValueCompletion<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaltimezonestring */
export declare function ParseTemporalTimeZoneString(timeZoneString: string): PlainCompletion<unknown>;
