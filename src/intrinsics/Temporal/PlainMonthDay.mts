import type { CalendarType } from '../../abstract-ops/temporal/calendar.mts';
import type { ISODateRecord } from './PlainDate.mts';
import type {
  FunctionObject, OrdinaryObject, Value, ValueEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-instances */
export interface TemporalPlainMonthDayObject extends OrdinaryObject {
  readonly InitializedTemporalMonthDay: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}

export function isTemporalPlainMonthDayObject(o: Value): o is TemporalPlainMonthDayObject {
  return 'InitializedTemporalMonthDay' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalmonthday */
export declare function ToTemporalMonthDay(
  item: Value,
  options?: Value
): ValueEvaluator<TemporalPlainMonthDayObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalmonthday */
export declare function CreateTemporalMonthDay(
  isoDate: ISODateRecord,
  calendar: CalendarType,
  newTarget?: FunctionObject
): ValueEvaluator<TemporalPlainMonthDayObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalmonthdaytostring */
export declare function TemporalMonthDayToString(
  monthDay: TemporalPlainMonthDayObject,
  showCalendar: 'auto' | 'always' | 'never' | 'critical'
): string;
