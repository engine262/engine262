import type { ObjectValue, PlainCompletion, PlainEvaluator, Value } from '#self';
import type { DateDurationRecord } from '../../intrinsics/Temporal/Duration.mts';
import type { ISODateRecord } from '../../intrinsics/Temporal/PlainDate.mts';
import type { YearWeekRecord } from './addition.mts';
import type { DateUnit } from './temporal.mts';

/** https://tc39.es/proposal-temporal/#sec-calendar-types */
export type CalendarType = 'iso8601';

/** https://tc39.es/proposal-temporal/#sec-temporal-canonicalizecalendar */
export declare function CanonicalizeCalendar(id: string): PlainCompletion<CalendarType>;

/** https://tc39.es/proposal-temporal/#sec-temporal-availablecalendars */
export declare function AvailableCalendars(): CalendarType[];

/** https://tc39.es/proposal-temporal/#sec-temporal-calendar-date-records */
export interface CalendarDateRecord {
  readonly Era: string | undefined;
  readonly EraYear: number | undefined;
  readonly Year: number;
  readonly Month: number;
  readonly MonthCode: string;
  readonly Day: number;
  readonly DayOfWeek: number;
  readonly DayOfYear: number;
  readonly WeekOfYear: YearWeekRecord;
  readonly DaysInWeek: number;
  readonly DaysInMonth: number;
  readonly DaysInYear: number;
  readonly MonthsInYear: number;
  readonly InLeapYear: boolean;
}

/** https://tc39.es/proposal-temporal/#table-temporal-calendar-fields-record-fields */
export interface CalendarFieldsRecord {
  readonly Era: string | undefined;
  readonly EraYear: number | undefined;
  Year: number | undefined;
  readonly Month: number | undefined;
  MonthCode: string | undefined;
  Day: number | undefined;
  readonly Hour: number | undefined;
  readonly Minute: number | undefined;
  readonly Second: number | undefined;
  readonly Millisecond: number | undefined;
  readonly Microsecond: number | undefined;
  readonly Nanosecond: number | undefined;
  readonly OffsetString: string | undefined;
  readonly TimeZone: string | undefined;
}

export type CalendarFieldsRecordEnumerationKey = keyof CalendarFieldsRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-preparecalendarfields */
export declare function PrepareCalendarFields(calendar: CalendarType, fields: ObjectValue, calendarFieldNames: readonly CalendarFieldsRecordEnumerationKey[], nonCalendarFieldNames: readonly CalendarFieldsRecordEnumerationKey[], requiredFieldNames: 'partial' | readonly CalendarFieldsRecordEnumerationKey[]): PlainEvaluator<CalendarFieldsRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarfieldkeyspresent */
export declare function CalendarFieldKeysPresent(fields: CalendarFieldsRecord): CalendarFieldsRecordEnumerationKey[];

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmergefields */
export declare function CalendarMergeFields(calendar: CalendarType, fields: CalendarFieldsRecord, additionalFields: CalendarFieldsRecord): CalendarFieldsRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateadd */
export declare function CalendarDateAdd(
  calendar: CalendarType,
  isoDate: ISODateRecord,
  duration: DateDurationRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateuntil */
export declare function CalendarDateUntil(
  calendar: CalendarType,
  one: ISODateRecord,
  two: ISODateRecord,
  largestUnit: DateUnit
): DateDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalcalendaridentifier */
export declare function ToTemporalCalendarIdentifier(temporalCalendarLike: Value): PlainCompletion<CalendarType>;

/** https://tc39.es/proposal-temporal/#sec-temporal-gettemporalcalendaridentifierwithisodefault */
export declare function GetTemporalCalendarIdentifierWithISODefault(item: ObjectValue): PlainEvaluator<CalendarType>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardatefromfields */
export declare function CalendarDateFromFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendaryearmonthfromfields */
export declare function CalendarYearMonthFromFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdayfromfields */
export declare function CalendarMonthDayFromFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-formatcalendarannotation */
export declare function FormatCalendarAnnotation(
  id: CalendarType,
  showCalendar: 'auto' | 'always' | 'never' | 'critical'
): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarequals */
export declare function CalendarEquals(one: CalendarType, two: CalendarType): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodaysinmonth */
export declare function ISODaysInMonth(year: number, month: number): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-isoweekofyear */
export declare function ISOWeekOfYear(isoDate: ISODateRecord): YearWeekRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofyear */
export declare function ISODayOfYear(isoDate: ISODateRecord): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofweek */
export declare function ISODayOfWeek(isoDate: ISODateRecord): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardatetoiso */
export declare function CalendarDateToISO(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdaytoisoreferencedate */
export declare function CalendarMonthDayToISOReferenceDate(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  overflow: 'constrain' | 'reject'
): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarisotodate */
export declare function CalendarISOToDate(
  calendar: CalendarType,
  isoDate: ISODateRecord
): CalendarDateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarextrafields */
export declare function CalendarExtraFields(
  calendar: CalendarType,
  fields: readonly CalendarFieldsRecordEnumerationKey[]
): CalendarFieldsRecordEnumerationKey[];

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarfieldkeystoignore */
export declare function CalendarFieldKeysToIgnore(
  calendar: CalendarType,
  keys: readonly CalendarFieldsRecordEnumerationKey[]
): CalendarFieldsRecordEnumerationKey[];

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarresolvefields */
export declare function CalendarResolveFields(
  calendar: CalendarType,
  fields: CalendarFieldsRecord,
  type: 'date' | 'year-month' | 'month-day'
): PlainCompletion<void>;
