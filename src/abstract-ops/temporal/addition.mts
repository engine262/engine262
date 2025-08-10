// Addition/Edition to the main spec.
// Code here should move elsewhere after Temporal is merged.

import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { R as MathematicalValue } from '../spec-types.mjs';
import { __ts_cast__ } from '../../helpers.mts';
import {
  Assert,
  Get,
  JSStringValue,
  MakeDate,
  MakeDay,
  MakeTime,
  NumberValue,
  ObjectValue, OrdinaryObjectCreate, Q, R, surroundingAgent, ToBoolean, ToNumber, ToString, UndefinedValue, Value, Z, type PlainEvaluator, type PropertyKeyValue, type ValueEvaluator,
} from '#self';
import { ToIntegerWithTruncation } from './temporal.mts';

/** https://tc39.es/proposal-temporal/#sec-year-week-record-specification-type */
export interface YearWeekRecord {
  readonly Week: number | undefined;
  readonly Year: number | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-tointegerifintegral */
export function* ToIntegerIfIntegral(argument: Value): PlainEvaluator<number> {
  const number = Q(yield* ToNumber(argument));
  if (!Number.isInteger(MathematicalValue(number))) {
    return surroundingAgent.Throw('RangeError', 'NotAnInteger', number);
  }
  return R(number);
}

/** https://tc39.es/proposal-temporal/#sec-getoptionsobject */
export function GetOptionsObject(options: Value) {
  if (options instanceof UndefinedValue) {
    return OrdinaryObjectCreate(Value.null);
  }
  if (options instanceof ObjectValue) {
    return options;
  }
  return surroundingAgent.Throw('TypeError', 'NotAnObject', options);
}

/** https://tc39.es/proposal-temporal/#sec-getoption */
export function GetOption<const T extends readonly string[], D extends T[number] | undefined>(options: ObjectValue, property: PropertyKeyValue | string, type: 'string', values: T | undefined, defaultValue: '~required~' | D): PlainEvaluator<D | T[number]>;
export function GetOption<D extends boolean | undefined>(options: ObjectValue, property: PropertyKeyValue | string, type: 'boolean', values: undefined, defaultValue: '~required~' | D): PlainEvaluator<D>;
export function* GetOption(options: ObjectValue, property: PropertyKeyValue | string, type: 'boolean' | 'string', values: readonly string[] | undefined, defaultValue: '~required~' | string | boolean | undefined): ValueEvaluator {
  let value = Q(yield* Get(options, typeof property === 'string' ? Value(property) : property));
  if (value === Value.undefined) {
    if (defaultValue === '~required~') {
      let propertyNameToString: string;
      if (typeof property === 'string') {
        propertyNameToString = property;
      } else if (property instanceof JSStringValue) {
        propertyNameToString = property.stringValue();
      } else if (property.Description instanceof JSStringValue) {
        propertyNameToString = `Symbol(${property.Description.stringValue()})`;
      } else {
        propertyNameToString = 'Symbol';
      }
      return surroundingAgent.Throw('RangeError', 'PropertyIsRequired', propertyNameToString);
    }
    return Value(defaultValue);
  }
  if (type === 'boolean') {
    value = Q(ToBoolean(value));
  } else {
    Assert(type === 'string');
    value = Q(yield* ToString(value));
  }
  if (values !== undefined) {
    const str = (value as JSStringValue).stringValue();
    if (!values.includes(str)) {
      return surroundingAgent.Throw('RangeError', 'PropertyCanOnlyBe', '', '', '');
    }
  }
  return value;
}

/** https://tc39.es/proposal-temporal/#sec-getroundingmodeoption */
export function* GetRoundingModeOption(
  options: ObjectValue,
  fallback: RoundingMode,
): PlainEvaluator<RoundingMode> {
  const allowedStrings = ['ceil', 'floor', 'expand', 'trunc', 'halfCeil', 'halfFloor', 'halfExpand', 'halfTrunc', 'halfEven'] as const;
  const stringFallback = ({
    [RoundingMode.Ceil]: 'ceil',
    [RoundingMode.Floor]: 'floor',
    [RoundingMode.Expand]: 'expand',
    [RoundingMode.Trunc]: 'trunc',
    [RoundingMode.HalfCeil]: 'halfCeil',
    [RoundingMode.HalfFloor]: 'halfFloor',
    [RoundingMode.HalfExpand]: 'halfExpand',
    [RoundingMode.HalfTrunc]: 'halfTrunc',
    [RoundingMode.HalfEven]: 'halfEven',
  } as const)[fallback];
  const stringValue = Q(yield* GetOption(options, Value('roundingMode'), 'string', allowedStrings, stringFallback));
  return {
    ceil: RoundingMode.Ceil,
    floor: RoundingMode.Floor,
    expand: RoundingMode.Expand,
    trunc: RoundingMode.Trunc,
    halfCeil: RoundingMode.HalfCeil,
    halfFloor: RoundingMode.HalfFloor,
    halfExpand: RoundingMode.HalfExpand,
    halfTrunc: RoundingMode.HalfTrunc,
    halfEven: RoundingMode.HalfEven,
  }[stringValue];
}

/** https://tc39.es/proposal-temporal/#table-temporal-rounding-modes */
export enum RoundingMode {
  Ceil,
  Floor,
  Expand,
  Trunc,
  HalfCeil,
  HalfFloor,
  HalfExpand,
  HalfTrunc,
  HalfEven
}
/** https://tc39.es/proposal-temporal/#table-unsigned-rounding-modes */
export enum UnsignedRoundingMode {
  Infinity, Zero, HalfInfinity, HalfZero, HalfEven
}
/** https://tc39.es/proposal-temporal/#sec-getroundingincrementoption */
export function* GetRoundingIncrementOption(
  options: ObjectValue,
): PlainEvaluator<number> {
  const value = Q(yield* Get(options, Value('roundingIncrement')));
  if (value === Value.undefined) {
    return 1;
  }
  const integerIncrement = Q(yield* ToIntegerWithTruncation(value));
  if (integerIncrement < 1 || integerIncrement > 10 ** 9) {
    return surroundingAgent.Throw('RangeError', 'OutOfRange', integerIncrement);
  }
  return integerIncrement;
}

/** https://tc39.es/proposal-temporal/#sec-getutcepochnanoseconds */
export function GetUTCEpochNanoseconds(
  isoDateTime: ISODateTimeRecord,
): bigint {
  const date = MakeDay(Value(isoDateTime.ISODate.Year), Value(isoDateTime.ISODate.Month - 1), Value(isoDateTime.ISODate.Day));
  const time = MakeTime(Value(isoDateTime.Time.Hour), Value(isoDateTime.Time.Minute), Value(isoDateTime.Time.Second), Value(isoDateTime.Time.Millisecond));
  const ms = MakeDate(date, time);
  Assert(ms instanceof NumberValue && !R(ms).toString().includes('.'));
  return BigInt(R(ms)) * BigInt(10e6) + BigInt(isoDateTime.Time.Microsecond) * BigInt(10e3) + BigInt(isoDateTime.Time.Nanosecond);
}

/** https://tc39.es/proposal-temporal/#sec-time-zone-identifiers */
export type TimeZoneIdentifier = string & { readonly TimeZoneIdentifier: never; };

/** https://tc39.es/proposal-temporal/#sec-getnamedtimezoneepochnanoseconds */
export declare function GetNamedTimeZoneEpochNanoseconds(
  timeZoneIdentifier: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord
): bigint[];

/** https://tc39.es/proposal-temporal/#sec-systemtimezoneidentifier */
export declare function SystemTimeZoneIdentifier(): TimeZoneIdentifier;

/** https://tc39.es/proposal-temporal/#sec-localtime-temporaledited */
export declare function LocalTime_TemporalEdited(t: number): number;

/** https://tc39.es/proposal-temporal/#sec-utc-temporaledited */
export declare function UTC_TemporalEdited(t: number): number;

/** https://tc39.es/proposal-temporal/#sec-timestring */
export declare function TimeString(tv: number): string;

/** https://tc39.es/proposal-temporal/#sec-timezonestring-temporaledited */
export declare function TimeZoneString_TemporalEdited(tv: number): string;

/** https://tc39.es/proposal-temporal/#sec-isoffsettimezoneidentifier */
export declare function IsOffsetTimeZoneIdentifier(offsetString: string): boolean;

/** https://tc39.es/proposal-temporal/#sec-parsedatetimeutcoffset */
export declare function ParseDateTimeUTCOffset(offsetString: string): number;

/** https://tc39.es/ecma262/#sec-tozeropaddeddecimalstring */
export function ToZeroPaddedDecimalString(n: number, minLength: number) {
  return n.toString().padStart(minLength, '0');
}
