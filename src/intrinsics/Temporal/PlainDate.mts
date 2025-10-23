import { bootstrapConstructor } from '../bootstrap.mts';
import { CanonicalizeCalendar, type CalendarType } from '../../abstract-ops/temporal/calendar.mts';
import { ToIntegerWithTruncation } from '../../abstract-ops/temporal/temporal.mts';
import type { TemporalDurationObject } from './Duration.mts';
import {
  type Realm, Value, UndefinedValue, surroundingAgent, ReturnIfAbrupt as Q, JSStringValue, type FunctionCallContext, type Arguments, F, type OrdinaryObject, type FunctionObject, type ValueEvaluator, ObjectValue,
} from '#self';

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
export declare function CreateISODateRecord(y: number, m: number, d: number): ISODateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldate */
export declare function CreateTemporalDate(isoDate: ISODateRecord, calendar: CalendarType, NewTarget?: FunctionObject): ValueEvaluator<TemporalPlainDateObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate */
export declare function ToTemporalDate(item: Value, options?: Value): ValueEvaluator<TemporalPlainDateObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatesurpasses */
export declare function ISODateSurpasses(sign: 1 | -1, baseDate: ISODateRecord, isoDate2: ISODateRecord, years: number, month: number, weeks: number, days: number): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-regulateisodate */
export declare function RegulateISODate(year: number, month: number, day: number, overflow: 'constrain' | 'reject'): ISODateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidisodate */
export declare function IsValidISODate(year: number, month: number, day: number): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisodate */
export declare function BalanceISODate(year: number, month: number, day: number): ISODateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-padisoyear */
export declare function PadISOYear(y: number): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldatetostring */
export declare function TemporalDateToString(temporalDate: TemporalPlainDateObject, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatewithinlimits */
export declare function ISODateWithinLimits(isoDate: ISODateRecord): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodate */
export declare function CompareISODate(isoDate1: ISODateRecord, isoDate2: ISODateRecord): 1 | -1 | 0;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindate */
export declare function DifferenceTemporalPlainDate(operation: 'since' | 'until', temproalDate: TemporalPlainDateObject, other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodate */
export declare function AddDurationToDate(operation: 'add' | 'subtract', temporalDate: TemporalPlainDateObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateObject>;
