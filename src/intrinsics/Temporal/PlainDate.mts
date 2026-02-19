import { bootstrapConstructor } from '../bootstrap.mts';
import { abs } from '../../abstract-ops/math.mts';
import {
  CalendarISOToDate,
  CalendarDateFromFields,
  CanonicalizeCalendar,
  FormatCalendarAnnotation,
  GetTemporalCalendarIdentifierWithISODefault,
  PrepareCalendarFields,
  type CalendarType,
} from '../../abstract-ops/temporal/calendar.mts';
import { GetISODateTimeFor } from '../../abstract-ops/temporal/time-zone.mts';
import { ISODaysInMonth } from '../../abstract-ops/temporal/calendar.mts';
import { GetOptionsObject, ToZeroPaddedDecimalString } from '../../abstract-ops/temporal/addition.mts';
import { GetTemporalOverflowOption } from '../../abstract-ops/temporal/temporal.mts';
import {
  ToIntegerWithTruncation,
} from '../../abstract-ops/temporal/temporal.mts';
import { ParseISODateTime } from '../../parser/TemporalParser.mts';
import { CombineISODateAndTimeRecord, ISODateTimeWithinLimits, isTemporalPlainDateTimeObject } from './PlainDateTime.mts';
import { isTemporalZonedDateTimeObject } from './ZonedDateTime.mts';
import type { TemporalDurationObject } from './Duration.mts';
import {
  Assert, type Realm, Value, UndefinedValue, surroundingAgent, Q, JSStringValue, type FunctionCallContext, type Arguments, F, type OrdinaryObject, type FunctionObject, type ValueEvaluator, ObjectValue, OrdinaryCreateFromConstructor, type Mutable,
  Throw,
  X,
  type PlainCompletion,
} from '#self';
import { BalanceISOYearMonth } from './PlainYearMonth.mts';
import { NoonTimeRecord } from './PlainTime.mts';

export interface TemporalPlainDateObject extends OrdinaryObject {
  /** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-instances */
  readonly InitializedTemporalDate: never;
  readonly ISODate: ISODateRecord;
  readonly Calendar: CalendarType;
}
export function isTemporalPlainDateObject(o: ObjectValue): o is TemporalPlainDateObject {
  return 'InitializedTemporalDate' in o;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-records */
export interface ISODateRecord {
  readonly Year: number;
  readonly Month: number;
  readonly Day: number;
}


/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate */
function* PlainDateConstructor([isoYear = Value.undefined, isoMonth = Value.undefined, isoDay = Value.undefined, calendar = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', NewTarget);
  }
  const y = Q(yield* ToIntegerWithTruncation(isoYear));
  const m = Q(yield* ToIntegerWithTruncation(isoMonth));
  const d = Q(yield* ToIntegerWithTruncation(isoDay));
  if (calendar instanceof UndefinedValue) {
    calendar = Value('iso8601');
  }
  if (!(calendar instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', calendar);
  }
  const calendarType = Q(CanonicalizeCalendar(calendar.stringValue()));
  if (IsValidISODate(y, m, d)) {
    return surroundingAgent.Throw('RangeError', 'InvalidDate');
  }
  const isoDate = CreateISODateRecord(y, m, d);
  return Q(yield* CreateTemporalDate(isoDate, calendarType, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.from */
function* PlainDate_From([item = Value.undefined, options = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalDate(item, options));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.plaindate.compare */
function* PlainDate_Compare([one = Value.undefined, two = Value.undefined]: Arguments): ValueEvaluator {
  const oneT = Q(yield* ToTemporalDate(one));
  const twoT = Q(yield* ToTemporalDate(two));
  return F(CompareISODate(oneT.ISODate, twoT.ISODate));
}

export function bootstrapTemporalPlainDate(realmRec: Realm) {
  const constructor = bootstrapConstructor(realmRec, PlainDateConstructor, 'PlainDate', 3, realmRec.Intrinsics['%Function.prototype%'], [
    ['from', PlainDate_From, 1],
    ['compare', PlainDate_Compare, 1],
  ]);
  return constructor;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-create-iso-date-record */
export function CreateISODateRecord(y: number, m: number, d: number): ISODateRecord {
  Assert(IsValidISODate(y, m, d));
  return { Year: y, Month: m, Day: d, };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldate */
export function* CreateTemporalDate(isoDate: ISODateRecord, calendar: CalendarType, NewTarget?: FunctionObject): ValueEvaluator<TemporalPlainDateObject> {
  if (!ISODateWithinLimits(isoDate)) {
    return Throw.RangeError('$1-$2-$3 is not a valid date', isoDate.Year, isoDate.Month, isoDate.Day);
  }
  if (NewTarget === undefined) {
    NewTarget = surroundingAgent.intrinsic('%Temporal.PlainDate%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%Temporal.PlainDate.prototype%', [
    'InitializedTemporalDate',
    'ISODate',
    'Calendar',
  ])) as Mutable<TemporalPlainDateObject>;
  object.ISODate = isoDate;
  object.Calendar = calendar;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate */
export function* ToTemporalDate(item: Value, options: Value = Value.undefined): ValueEvaluator<TemporalPlainDateObject> {
  if (item instanceof ObjectValue) {
    if (isTemporalPlainDateObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDate(item.ISODate, item.Calendar));
    }
    if (isTemporalZonedDateTimeObject(item)) {
      const isoDateTime = GetISODateTimeFor(item.TimeZone, item.EpochNanoseconds);
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDate(isoDateTime.ISODate, item.Calendar));
    }
    if (isTemporalPlainDateTimeObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalDate(item.ISODateTime.ISODate, item.Calendar));
    }
    const calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(item));
    const fields = Q(yield* PrepareCalendarFields(calendar, item, ['year', 'month', 'month-code', 'day'], [], []));
    const resolvedOptions = Q(GetOptionsObject(options));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    const isoDate = Q(yield* CalendarDateFromFields(calendar, fields, overflow));
    return X(CreateTemporalDate(isoDate, calendar));
  }
  if (!(item instanceof JSStringValue)) {
    return Throw.TypeError('$1 is not a string', item);
  }
  const result = Q(ParseISODateTime(item.stringValue(), ['TemporalDateTimeString[~Zoned]']));
  const calendar = result.Calendar ?? 'iso8601';
  const calendarType = Q(CanonicalizeCalendar(calendar));
  const resolvedOptions = Q(GetOptionsObject(options));
  Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
  return X(CreateTemporalDate(isoDate, calendarType));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-comparesurpasses */
export function CompareSurpasses(sign: 1 | -1, year: number, monthOrCode: number | string, day: number, target: { Year: number; Month: number; MonthCode: string; Day: number }): boolean {
  if (year !== target.Year) {
    if (sign * (year - target.Year) > 0) {
      return true;
    }
  } else if (typeof monthOrCode === 'string' && monthOrCode !== target.MonthCode) {
    if (sign > 0) {
      // If monthOrCode is lexicographically greater than target.[[MonthCode]], return true.
      if (monthOrCode > target.MonthCode) {
        return true;
      }
    }
    // If target.[[MonthCode]] is lexicographically greater than monthOrCode, return true.
    else if (target.MonthCode > monthOrCode) {
      return true;
    }
  } else if (typeof monthOrCode === 'number' && monthOrCode !== target.Month) {
    if (sign * (monthOrCode - target.Month) > 0) {
      return true;
    }
  } else if (day !== target.Day) {
    if (sign * (day - target.Day) > 0) {
      return true;
    }
  }
  return false;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatesurpasses */
export function ISODateSurpasses(sign: 1 | -1, baseDate: ISODateRecord, isoDate2: ISODateRecord, years: number, month: number, weeks: number, days: number): boolean {
  const parts = CalendarISOToDate('iso8601', baseDate);
  const target = CalendarISOToDate('iso8601', isoDate2);
  const y0 = parts.Year + years;
  if (CompareSurpasses(sign, y0, parts.MonthCode, parts.Day, target)) {
    return true;
  }
  if (month === 0) {
    return false;
  }
  const m0 = parts.Month + month;
  const monthsAdded = BalanceISOYearMonth(y0, m0);
  if (CompareSurpasses(sign, monthsAdded.Year, monthsAdded.Month, parts.Day, target)) {
    return true;
  }
  if (weeks === 0 && days === 0) {
    return false;
  }
  const regulatedDate = X(RegulateISODate(monthsAdded.Year, monthsAdded.Month, parts.Day, 'constrain'));
  const daysInWeek = 7;
  const balancedDate = AddDaysToISODate(regulatedDate, daysInWeek * weeks + days);
  return CompareSurpasses(sign, balancedDate.Year, balancedDate.Month, balancedDate.Day, target);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-regulateisodate */
export function RegulateISODate(year: number, month: number, day: number, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord> {
  if (overflow === 'constrain') {
    month = Math.max(1, Math.min(12, month));
    const daysInMonth = ISODaysInMonth(year, month);
    day = Math.max(1, Math.min(daysInMonth, day));
  } else {
    Assert(overflow === 'reject');
    if (!IsValidISODate(year, month, day)) {
      return Throw.RangeError('$1-$2-$3 is not a valid date', year, month, day);
    }
  }
  return CreateISODateRecord(year, month, day);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidisodate */
export function IsValidISODate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  const daysInMonth = ISODaysInMonth(year, month);
  if (day < 1 || day > daysInMonth) {
    return false;
  }
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddaystoisodate */
export declare function AddDaysToISODate(isoDate: ISODateRecord, days: number): ISODateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-padisoyear */
export function PadISOYear(y: number): string {
  if (y >= 0 && y <= 9999) {
    return ToZeroPaddedDecimalString(y, 4);
  }
  const yearSign = y > 0 ? '+' : '-';
  const year = ToZeroPaddedDecimalString(abs(y), 6);
  return yearSign + year;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldatetostring */
export function TemporalDateToString(temporalDate: TemporalPlainDateObject, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string {
  const year = PadISOYear(temporalDate.ISODate.Year);
  const month = ToZeroPaddedDecimalString(temporalDate.ISODate.Month, 2);
  const day = ToZeroPaddedDecimalString(temporalDate.ISODate.Day, 2);
  const calendar = FormatCalendarAnnotation(temporalDate.Calendar, showCalendar);
  return `${year}-${month}-${day}${calendar}`;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatewithinlimits */
export function ISODateWithinLimits(isoDate: ISODateRecord): boolean {
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, NoonTimeRecord());
  return ISODateTimeWithinLimits(isoDateTime);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodate */
export function CompareISODate(isoDate1: ISODateRecord, isoDate2: ISODateRecord): 1 | -1 | 0 {
  if (isoDate1.Year > isoDate2.Year) return 1;
  if (isoDate1.Year < isoDate2.Year) return -1;
  if (isoDate1.Month > isoDate2.Month) return 1;
  if (isoDate1.Month < isoDate2.Month) return -1;
  if (isoDate1.Day > isoDate2.Day) return 1;
  if (isoDate1.Day < isoDate2.Day) return -1;
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindate */
export declare function DifferenceTemporalPlainDate(operation: 'since' | 'until', temproalDate: TemporalPlainDateObject, other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodate */
export declare function AddDurationToDate(operation: 'add' | 'subtract', temporalDate: TemporalPlainDateObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateObject>;
