import { ObjectInspector } from './objects.mts';
import {
  type DateObject, R, DateProto_toISOString, Value, ValueOfNormalCompletion, NormalCompletion, JSStringValue, type TemporalInstantObject, TemporalInstantToString, type TemporalDurationObject, TemporalDurationToString, type TemporalPlainDateObject, TemporalDateToString, type TemporalPlainDateTimeObject, ISODateTimeToString, type TemporalPlainMonthDayObject, TemporalMonthDayToString, type TemporalPlainTimeObject, TimeRecordToString, type TemporalPlainYearMonthObject, TemporalYearMonthToString, type TemporalZonedDateTimeObject, TemporalZonedDateTimeToString,
} from '#self';


export const Date = new ObjectInspector<DateObject>('Date', 'date', ((value: DateObject) => {
  if (!globalThis.Number.isFinite(R(value.DateValue))) {
    return 'Invalid Date';
  }
  const val = DateProto_toISOString([], { thisValue: value, NewTarget: Value.undefined });
  return ValueOfNormalCompletion(val as NormalCompletion<JSStringValue>).stringValue();
}));

export const TemporalInstant = new ObjectInspector<TemporalInstantObject>(
  'Temporal.Instant',
  'date',
  (value) => `Temporal.Instant <${TemporalInstantToString(value, undefined, 'auto')}>`,
);

export const TemporalDuration = new ObjectInspector<TemporalDurationObject>('Temporal.Duration', 'date', (value) => `Temporal.Duration <${TemporalDurationToString(value, 'auto')}>`);

export const TemporalPlainDate = new ObjectInspector<TemporalPlainDateObject>('Temporal.PlainDate', 'date', (value) => `Temporal.PlainDate <${TemporalDateToString(value, 'auto')}>`);

export const TemporalPlainDateTime = new ObjectInspector<TemporalPlainDateTimeObject>(
  'Temporal.PlainDateTime',
  'date',
  (value) => `Temporal.PlainDateTime <${ISODateTimeToString(value.ISODateTime, value.Calendar, 'auto', 'auto')}>`,
);

export const TemporalPlainMonthDay = new ObjectInspector<TemporalPlainMonthDayObject>(
  'Temporal.PlainMonthDay',
  'date',
  (value) => `Temporal.PlainMonthDay <${TemporalMonthDayToString(value, 'auto')}>`,
);

export const TemporalPlainTime = new ObjectInspector<TemporalPlainTimeObject>('Temporal.PlainTime', 'date', (value) => `Temporal.PlainTime <${TimeRecordToString(value.Time, 'auto')}>`);

export const TemporalPlainYearMonth = new ObjectInspector<TemporalPlainYearMonthObject>(
  'Temporal.PlainYearMonth',
  'date',
  (value) => `Temporal.PlainYearMonth <${TemporalYearMonthToString(value, 'auto')}>`,
);

export const TemporalZonedDateTime = new ObjectInspector<TemporalZonedDateTimeObject>(
  'Temporal.ZonedDateTime',
  'date',
  (value) => `Temporal.ZonedDateTime <${TemporalZonedDateTimeToString(value, 'auto', 'auto', 'auto', 'auto')}>`,
);
