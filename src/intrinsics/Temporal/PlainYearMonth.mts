import type { CalendarType } from '../../abstract-ops/temporal/calendar.mts';
import type { TemporalDurationObject } from './Duration.mts';
import type { ISODateRecord } from './PlainDate.mts';
import type {
  FunctionObject, OrdinaryObject, Value, ValueEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainyearmonth-instances */
export interface TemporalPlainYearMonthObject extends OrdinaryObject {
  readonly InitializedTemporalYearMonth: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}

export function isTemporalPlainYearMonthObject(o: Value): o is TemporalPlainYearMonthObject {
  return 'InitializedTemporalYearMonth' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-year-month-records */
export interface ISOYearMonthRecord {
  readonly Year: number;
  readonly Month: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalyearmonth */
export declare function ToTemporalYearMonth(
  item: Value,
  options?: Value
): ValueEvaluator<TemporalPlainYearMonthObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-isoyearmonthwithinlimits */
export declare function ISOYearMonthWithinLimits(
  isoDate: ISODateRecord
): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisoyearmonth */
export declare function BalanceISOYearMonth(
  year: number,
  month: number
): ISOYearMonthRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalyearmonth */
export declare function CreateTemporalYearMonth(
  isoDate: ISODateRecord,
  calendar: CalendarType,
  newTarget?: FunctionObject
): ValueEvaluator<TemporalPlainYearMonthObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalyearmonthtostring */
export declare function TemporalYearMonthToString(
  yearMonth: TemporalPlainYearMonthObject,
  showCalendar: 'auto' | 'always' | 'never' | 'critical'
): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplainyearmonth */
export declare function DifferenceTemporalPlainYearMonth(
  operation: 'since' | 'until',
  yearMonth: TemporalPlainYearMonthObject,
  other: Value,
  options: Value
): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoyearmonth */
export declare function AddDurationToYearMonth(
  operation: 'add' | 'subtract',
  yearMonth: TemporalPlainYearMonthObject,
  temporalDurationLike: Value,
  options: Value
): ValueEvaluator<TemporalPlainYearMonthObject>;
