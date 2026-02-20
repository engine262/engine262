import {
  CalendarMonthDayFromFields,
  CanonicalizeCalendar,
  FormatCalendarAnnotation,
  GetTemporalCalendarIdentifierWithISODefault,
  PrepareCalendarFields,
  type CalendarType,
} from '../../abstract-ops/temporal/calendar.mts';
import { GetOptionsObject, ToZeroPaddedDecimalString } from '../../abstract-ops/temporal/addition.mts';
import { GetTemporalOverflowOption, ISODateToFields } from '../../abstract-ops/temporal/temporal.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import {
  CreateISODateRecord, ISODateWithinLimits, PadISOYear, type ISODateRecord,
} from './PlainDate.mts';
import {
  JSStringValue,
  ObjectValue,
  OrdinaryCreateFromConstructor,
  Q,
  surroundingAgent,
  Throw,
  Value,
  X,
  type FunctionObject,
  type Mutable,
  type OrdinaryObject,
  type ValueEvaluator,
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
export function* ToTemporalMonthDay(
  item: Value,
  options: Value = Value.undefined,
): ValueEvaluator<TemporalPlainMonthDayObject> {
  if (item instanceof ObjectValue) {
    if (isTemporalPlainMonthDayObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalMonthDay(item.ISODate, item.Calendar));
    }
    const calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(item));
    const fields = Q(yield* PrepareCalendarFields(calendar, item, ['year', 'month', 'month-code', 'day'], [], []));
    const resolvedOptions = Q(GetOptionsObject(options));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    const isoDate = Q(yield* CalendarMonthDayFromFields(calendar, fields, overflow));
    return X(CreateTemporalMonthDay(isoDate, calendar));
  }
  if (!(item instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', item);
  }
  const result = Q(ParseISODateTime(item.stringValue(), ['TemporalMonthDayString']));
  const calendar = result.Calendar ?? 'iso8601';
  const calendarType = Q(CanonicalizeCalendar(calendar));
  const resolvedOptions = Q(GetOptionsObject(options));
  Q(yield* GetTemporalOverflowOption(resolvedOptions));
  if (calendarType === 'iso8601') {
    const referenceISOYear = 1972;
    const isoDate = CreateISODateRecord(referenceISOYear, result.Month, result.Day);
    return X(CreateTemporalMonthDay(isoDate, calendarType));
  }
  let isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
  if (!ISODateWithinLimits(isoDate)) {
    return Throw.RangeError('PlainMonthDay out of range');
  }
  const result2 = Q(ISODateToFields(calendarType, isoDate, 'month-day'));
  isoDate = Q(yield* CalendarMonthDayFromFields(calendarType, result2, 'constrain'));
  return X(CreateTemporalMonthDay(isoDate, calendarType));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalmonthday */
export function* CreateTemporalMonthDay(
  isoDate: ISODateRecord,
  calendar: CalendarType,
  newTarget?: FunctionObject,
): ValueEvaluator<TemporalPlainMonthDayObject> {
  if (!ISODateWithinLimits(isoDate)) {
    return Throw.RangeError('PlainMonthDay out of range');
  }
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.PlainMonthDay%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.PlainMonthDay.prototype%', [
    'InitializedTemporalMonthDay',
    'ISODate',
    'Calendar',
  ])) as Mutable<TemporalPlainMonthDayObject>;
  object.ISODate = isoDate;
  object.Calendar = calendar;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalmonthdaytostring */
export function TemporalMonthDayToString(
  monthDay: TemporalPlainMonthDayObject,
  showCalendar: 'auto' | 'always' | 'never' | 'critical',
): string {
  const month = ToZeroPaddedDecimalString(monthDay.ISODate.Month, 2);
  const day = ToZeroPaddedDecimalString(monthDay.ISODate.Day, 2);
  let result = `${month}-${day}`;
  if ((showCalendar === 'always' || showCalendar === 'critical') || monthDay.Calendar !== 'iso8601') {
    const year = PadISOYear(monthDay.ISODate.Year);
    result = `${year}-${result}`;
  }
  const calendarString = FormatCalendarAnnotation(monthDay.Calendar, showCalendar);
  return result + calendarString;
}
