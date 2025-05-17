import type { FunctionObject, OrdinaryObject, Value, ValueEvaluator } from '#self';
import type { ISODateRecord } from './PlainDate.mts';
import type { CalendarType } from '../../abstract-ops/temporal/calendar.mts';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-instances */
export interface TemporalPlainMonthDayObject extends OrdinaryObject {
  readonly InitializedTemporalMonthDay: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}
/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalmonthday */
declare function ToTemporalMonthDay(
  item: Value,
  options?: Value
): ValueEvaluator<TemporalPlainMonthDayObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalmonthday */
declare function CreateTemporalMonthDay(
  isoDate: ISODateRecord,
  calendar: CalendarType,
  newTarget?: FunctionObject
): ValueEvaluator<TemporalPlainMonthDayObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalmonthdaytostring */
declare function TemporalMonthDayToString(
  monthDay: TemporalPlainMonthDayObject,
  showCalendar: 'auto' | 'always' | 'never' | 'critical'
): string;
