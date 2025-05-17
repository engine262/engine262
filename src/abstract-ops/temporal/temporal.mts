import type { ObjectValue, PlainCompletion, PlainEvaluator, Value } from '#self';
import type { ISODateRecord, TemporalPlainDateObject } from '../../intrinsics/Temporal/PlainDate.mts';
import type { TemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import type { RoundingMode } from './addition.mts';
import type { CalendarFieldsRecord, CalendarType } from './calendar.mts';

/** https://tc39.es/proposal-temporal/#sec-isodatetoepochdays */
export declare function ISODateToEpochDays(year: number, month: number, date: number): number

/** https://tc39.es/proposal-temporal/#sec-epochdaystoepochms */
export declare function EpochDaysToEpochMs(day: number, time: number): number

/** https://tc39.es/proposal-temporal/#eqn-EpochTimeToDayNumber */
export declare function EpochTimeToDayNumber(t: number): number

/** https://tc39.es/proposal-temporal/#sec-mathematicaldaysinyear */
export declare function MathematicalDaysInYear(y: number): number

/** https://tc39.es/proposal-temporal/#sec-epochdaynumberforyear */
export declare function EpochDayNumberForYear(y: number): number

/** https://tc39.es/proposal-temporal/#sec-epochtimeforyear */
export declare function EpochTimeForYear(y: number): number

/** https://tc39.es/proposal-temporal/#sec-epochtimetoepochyear */
export declare function EpochTimeToEpochYear(t: number): number

/** https://tc39.es/proposal-temporal/#sec-mathematicalinleapyear */
export declare function MathematicalInLeapYear(t: number): boolean

/** https://tc39.es/proposal-temporal/#sec-epochtimetomonthinyear */
export declare function EpochTimeToMonthInYear(t: number): number

/** https://tc39.es/proposal-temporal/#sec-epochtimetodayinyear */
export declare function EpochTimeToDayInYear(t: number): number

/** https://tc39.es/proposal-temporal/#sec-epochtimetodate */
export declare function EpochTimeToDate(t: number): number

/** https://tc39.es/proposal-temporal/#sec-epochtimetoweekday */
export declare function EpochTimeToWeekDay(t: number): number

/** https://tc39.es/proposal-temporal/#sec-checkisodaysrange */
export declare function CheckISODaysRange(isoDate: ISODateRecord): PlainCompletion<void>;/** https://tc39.es/proposal-temporal/#table-temporal-units */

/** https://tc39.es/proposal-temporal/#sec-temporal-units */
export enum TemporalUnit {
  Year, Month, Week, Day,
  Hour, Minute, Second, Millisecond, Microsecond, Nanosecond
}

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export type TimeUnit = TemporalUnit.Hour | TemporalUnit.Minute | TemporalUnit.Second | TemporalUnit.Millisecond | TemporalUnit.Microsecond | TemporalUnit.Nanosecond;

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export type DateUnit = TemporalUnit.Year | TemporalUnit.Month | TemporalUnit.Week | TemporalUnit.Day;

/** https://tc39.es/proposal-temporal/#sec-gettemporaloverflowoption */
export declare function GetTemporalOverflowOption(options: ObjectValue): PlainEvaluator<'constrain' | 'reject'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporaldisambiguationoption */
export declare function GetTemporalDisambiguationOption(options: ObjectValue): PlainEvaluator<'compatible' | 'earlier' | 'later' | 'reject'>;

/** https://tc39.es/proposal-temporal/#sec-negateroundingmode */
export declare function NegateRoundingMode(roundingMode: RoundingMode): RoundingMode;

/** https://tc39.es/proposal-temporal/#sec-gettemporaloffsetoption */
export declare function GetTemporalOffsetOption(options: ObjectValue, fallback: 'prefer' | 'use' | 'ignore' | 'reject'): PlainEvaluator<'prefer' | 'use' | 'ignore' | 'reject'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowcalendarnameoption */
export declare function GetTemporalShowCalendarNameOption(options: ObjectValue): PlainEvaluator<'auto' | 'always' | 'never' | 'critical'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowtimezonenameoption */
export declare function GetTemporalShowTimeZoneNameOption(options: ObjectValue): PlainEvaluator<'auto' | 'never' | 'critical'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowoffsetoption */
export declare function GetTemporalShowOffsetOption(options: ObjectValue): PlainEvaluator<'auto' | 'never'>;

/** https://tc39.es/proposal-temporal/#sec-getdirectionoption */
export declare function GetDirectionOption(options: ObjectValue): PlainEvaluator<'next' | 'previous'>;

/** https://tc39.es/proposal-temporal/#sec-validatetemporalroundingincrement */
export declare function ValidateTemporalRoundingIncrement(
  increment: number,
  dividend: number,
  inclusive: boolean
): PlainCompletion<void>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalfractionalseconddigitsoption */
export declare function GetTemporalFractionalSecondDigitsOption(options: ObjectValue): PlainEvaluator<'auto' | number>;

/** https://tc39.es/proposal-temporal/#sec-tosecondsstringprecisionrecord */
export declare function ToSecondsStringPrecisionRecord(
  smallestUnit: 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond' | 'unset',
  fractionalDigitCount: 'auto' | number
): {
  Precision: 'minute' | 'auto' | number,
  Unit: 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond',
  Increment: 1 | 10 | 100
};

/** https://tc39.es/proposal-temporal/#sec-gettemporalunitvaluedoption */
export declare function GetTemporalUnitValuedOption(
  options: ObjectValue,
  key: PropertyKey,
  unitGroup: 'date' | 'time' | 'datetime',
  defaultValue: 'required' | 'unset' | 'auto' | TemporalUnit,
  extraValues?: (TemporalUnit | 'auto')[]
): PlainEvaluator<TemporalUnit | 'unset' | 'auto'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalrelativetooption */
export declare function GetTemporalRelativeToOption(options: ObjectValue): PlainEvaluator<{
  PlainRelativeTo?: TemporalPlainDateObject,
  ZonedRelativeTo?: TemporalZonedDateTimeObject,
}>;

/** https://tc39.es/proposal-temporal/#sec-largeroftwotemporalunits */
export declare function LargerOfTwoTemporalUnits(u1: TemporalUnit, u2: TemporalUnit): TemporalUnit;

/** https://tc39.es/proposal-temporal/#sec-iscalendarunit */
export declare function IsCalendarUnit(unit: TemporalUnit): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporalunitcategory */
export declare function TemporalUnitCategory(unit: TemporalUnit): 'date' | 'time';

/** https://tc39.es/proposal-temporal/#sec-maximumtemporaldurationroundingincrement */
export declare function MaximumTemporalDurationRoundingIncrement(unit: TemporalUnit): 24 | 60 | 1000 | 'unset';

/** https://tc39.es/proposal-temporal/#sec-ispartialtemporalobject */
export declare function IsPartialTemporalObject(value: Value): PlainEvaluator<boolean>;

/** https://tc39.es/proposal-temporal/#sec-formatfractionalseconds */
export declare function FormatFractionalSeconds(
  subSecondNanoseconds: number,
  precision: number | 'auto'
): string;

/** https://tc39.es/proposal-temporal/#sec-formattimestring */
export declare function FormatTimeString(
  hour: number,
  minute: number,
  second: number,
  subSecondNanoseconds: number,
  precision: number | 'minute' | 'auto',
  style?: 'separated' | 'unseparated'
): string;

/** https://tc39.es/proposal-temporal/#sec-getunsignedroundingmode */
export declare function GetUnsignedRoundingMode(
  roundingMode: RoundingMode,
  sign: 'negative' | 'positive'
): RoundingMode;

/** https://tc39.es/proposal-temporal/#sec-applyunsignedroundingmode */
export declare function ApplyUnsignedRoundingMode(
  x: number,
  r1: number,
  r2: number,
  unsignedRoundingMode?: RoundingMode
): number;

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrement */
export declare function RoundNumberToIncrement(
  x: number,
  increment: number,
  roundingMode: RoundingMode
): number;

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrementasifpositive */
export declare function RoundNumberToIncrementAsIfPositive(
  x: number,
  increment: number,
  roundingMode: RoundingMode
): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-topositiveintegerwithtruncation */
export declare function ToPositiveIntegerWithTruncation(argument: Value): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-tointegerwithtruncation */
export declare function ToIntegerWithTruncation(argument: Value): PlainCompletion<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-tomonthcode */
export declare function ToMonthCode(argument: Value): PlainCompletion<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-tooffsetstring */
export declare function ToOffsetString(argument: Value): PlainCompletion<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetofields */
export declare function ISODateToFields(
  calendar: CalendarType,
  isoDate: ISODateRecord,
  type: 'date' | 'year-month' | 'month-day'
): PlainCompletion<CalendarFieldsRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-getdifferencesettings */
export declare function GetDifferenceSettings(
  operation: 'since' | 'until',
  options: ObjectValue,
  unitGroup: 'date' | 'time' | 'datetime',
  disallowedUnits: readonly TemporalUnit[],
  fallbackSmallestUnit: TemporalUnit,
  smallestLargestDefaultUnit: TemporalUnit
): PlainCompletion<{
  SmallestUnit: TemporalUnit,
  LargestUnit: TemporalUnit,
  RoundingMode: RoundingMode,
  RoundingIncrement: number
}>;
