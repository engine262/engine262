// Addition/Edition to the main spec.
// Code here should move elsewhere after Temporal is merged.

import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { ParseTimeZoneIdentifier } from '../../parser/TemporalParser.mts';
import { HourFromTime, MinFromTime, SecFromTime } from '../date-objects.mts';
import { R as MathematicalValue } from '../spec-types.mjs';
import { __ts_cast__ } from '../../helpers.mts';
import { FormatTimeString, ToIntegerWithTruncation } from './temporal.mts';
import { FormatOffsetTimeZoneIdentifier, type TimeZoneIdentifierRecord } from './time-zone.mts';
import { mark_TimeZoneAwareNotImplemented, temporal_todo } from './not-implemented.mts';
import {
  Assert,
  Get,
  JSStringValue,
  MakeDate,
  MakeDay,
  MakeTime,
  ObjectValue, OrdinaryObjectCreate, Q, R, Throw, TimeValueToISODateTimeRecord, ToBoolean, ToNumber, ToString, UndefinedValue, Value, X, type PlainEvaluator, type PropertyKeyValue,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-year-week-record-specification-type */
export interface YearWeekRecord {
  readonly Week: number | undefined;
  readonly Year: number | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-tointegerifintegral */
export function* ToIntegerIfIntegral(argument: Value): PlainEvaluator<number> {
  const number = Q(yield* ToNumber(argument));
  if (!Number.isInteger(MathematicalValue(number))) {
    return Throw.RangeError('$1 is not an integral number', argument);
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
  return Throw.TypeError('$1 is not an object', options);
}

/** https://tc39.es/proposal-temporal/#sec-getoption */
export function GetOption<const T extends readonly string[], D extends T[number] | undefined>(options: ObjectValue, property: PropertyKeyValue | string, type: 'string', values: T | undefined, defaultValue: '~required~' | D): PlainEvaluator<D | T[number]>;
export function GetOption<D extends boolean | undefined>(options: ObjectValue, property: PropertyKeyValue | string, type: 'boolean', values: undefined, defaultValue: '~required~' | D): PlainEvaluator<D>;
export function* GetOption(options: ObjectValue, property: PropertyKeyValue | string, type: 'boolean' | 'string', values: readonly string[] | undefined, defaultValue: '~required~' | string | boolean | undefined): PlainEvaluator<string | boolean> {
  if (typeof property === 'string') {
    property = Value(property);
  }
  let value = Q(yield* Get(options, property));
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
      return Throw.RangeError('"$1" is required on object $2', propertyNameToString, options);
    }
    return defaultValue!;
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
      return Throw.RangeError('"$1" on object $2 is not valid ($3)', property, options, str);
    }
  }
  return value instanceof JSStringValue ? value.stringValue() : value.booleanValue();
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
    return Throw.RangeError('"roundingIncrement" ($1) is out of range', integerIncrement);
  }
  return integerIncrement;
}

/** https://tc39.es/proposal-temporal/#sec-getutcepochnanoseconds */
export function GetUTCEpochNanoseconds(
  isoDateTime: ISODateTimeRecord,
): bigint {
  const date = MakeDay(Value(isoDateTime.ISODate.Year), Value(isoDateTime.ISODate.Month - 1), Value(isoDateTime.ISODate.Day));
  const time = MakeTime(Value(isoDateTime.Time.Hour), Value(isoDateTime.Time.Minute), Value(isoDateTime.Time.Second), Value(isoDateTime.Time.Millisecond));
  const ms = R(MakeDate(date, time));
  Assert(Math.floor(ms) === ms);
  return BigInt(ms) * BigInt(10e6) + BigInt(isoDateTime.Time.Microsecond) * BigInt(10e3) + BigInt(isoDateTime.Time.Nanosecond);
}

/** https://tc39.es/proposal-temporal/#sec-time-zone-identifiers */
export type TimeZoneIdentifier = string & { readonly TimeZoneIdentifier: never; };

/** https://tc39.es/proposal-temporal/#sec-getnamedtimezoneepochnanoseconds */
export function GetNamedTimeZoneEpochNanoseconds(
  timeZoneIdentifier: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
): bigint[] {
  mark_TimeZoneAwareNotImplemented();
  Assert(timeZoneIdentifier === 'UTC');
  const epochNanoseconds = GetUTCEpochNanoseconds(isoDateTime);
  return [epochNanoseconds];
}

/** https://tc39.es/ecma262/#sec-getnamedtimezoneoffsetnanoseconds */
export function GetNamedTimeZoneOffsetNanoseconds(timeZoneIdentifier: string, _epochNanoseconds: bigint) {
  mark_TimeZoneAwareNotImplemented();
  Assert(timeZoneIdentifier === 'UTC');
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-systemtimezoneidentifier */
export function SystemTimeZoneIdentifier(): TimeZoneIdentifier {
  mark_TimeZoneAwareNotImplemented();
  // 1. If the implementation only supports the UTC time zone, return "UTC".
  return 'UTC' as TimeZoneIdentifier;
  // 2. Let systemTimeZoneString be the String representing the host environment's current time zone as a time zone identifier in normalized format, either a primary time zone identifier or an offset time zone identifier.
  // 3. Return systemTimeZoneString.
}

/** https://tc39.es/proposal-temporal/#sec-localtime */
export function LocalTime_TemporalEdited(t: number): number {
  const systemTimeZoneIdentifier = SystemTimeZoneIdentifier();
  const parseResult = X(ParseTimeZoneIdentifier(systemTimeZoneIdentifier));
  let offsetNs: number;
  if (parseResult.OffsetMinutes !== undefined) {
    offsetNs = parseResult.OffsetMinutes * (60 * 1e9);
  } else {
    offsetNs = GetNamedTimeZoneOffsetNanoseconds(systemTimeZoneIdentifier, BigInt(t * 1e6));
  }
  const offsetMs = Math.trunc(offsetNs / 1e6);
  return t + offsetMs;
}

/** https://tc39.es/proposal-temporal/#sec-utc-t */
export function UTC_TemporalEdited(t: number): number {
  if (!Number.isFinite(t)) {
    return NaN;
  }
  const systemTimeZoneIdentifier = SystemTimeZoneIdentifier();
  const parseResult = X(ParseTimeZoneIdentifier(systemTimeZoneIdentifier));
  let offsetNs: number;
  if (parseResult.OffsetMinutes !== undefined) {
    offsetNs = parseResult.OffsetMinutes * (60 * 1e9);
  } else {
    const isoDateTime = TimeValueToISODateTimeRecord(t);
    const possibleInstants = GetNamedTimeZoneEpochNanoseconds(systemTimeZoneIdentifier, isoDateTime);
    let disambiguatedInstant: bigint;
    if (possibleInstants.length > 0) {
      disambiguatedInstant = possibleInstants[0];
    } else {
      // TODO(temporal): review
      // ii. Let possibleInstantsBefore be GetNamedTimeZoneEpochNanoseconds(systemTimeZoneIdentifier, ℝ(YearFromTime(tBefore)), ℝ(MonthFromTime(tBefore)) + 1, ℝ(DateFromTime(tBefore)), ℝ(HourFromTime(tBefore)), ℝ(MinFromTime(tBefore)), ℝ(SecFromTime(tBefore)), ℝ(msFromTime(tBefore)), 0, 0TimeValueToISODateTimeRecord(tBefore)), where tBefore is the largest integral Number < t for which possibleInstantsBefore is not empty (i.e., tBefore represents the last local time before the transition).
      let tBefore = Math.floor(t) - 1;
      let possibleInstantsBefore: bigint[] = [];
      while (possibleInstantsBefore.length === 0) {
        possibleInstantsBefore = GetNamedTimeZoneEpochNanoseconds(systemTimeZoneIdentifier, TimeValueToISODateTimeRecord(tBefore));
        tBefore -= 1;
      }
      // iii. Let disambiguatedInstant be the last element of possibleInstantsBefore.
      disambiguatedInstant = possibleInstantsBefore[possibleInstantsBefore.length - 1];
    }
    offsetNs = GetNamedTimeZoneOffsetNanoseconds(systemTimeZoneIdentifier, disambiguatedInstant);
  }
  const offsetMs = Math.trunc(offsetNs / 1e6);
  return t - offsetMs;
}

/** https://tc39.es/proposal-temporal/#sec-timestring */
export function TimeString(tv: number): string {
  const timeString = FormatTimeString(R(HourFromTime(Value(tv))), R(MinFromTime(Value(tv))), R(SecFromTime(Value(tv))), 0, 0);
  return `${timeString} GMT`;
}

/** https://tc39.es/proposal-temporal/#sec-timezoneestring */
export function TimeZoneString_TemporalEdited(tv: number): string {
  const systemTimeZoneIdentifier = SystemTimeZoneIdentifier();
  let offsetMinutes = X(ParseTimeZoneIdentifier(systemTimeZoneIdentifier)).OffsetMinutes;
  if (offsetMinutes === undefined) {
    const offsetNs = GetNamedTimeZoneOffsetNanoseconds(systemTimeZoneIdentifier, BigInt(tv * 1e6));
    offsetMinutes = Math.trunc(offsetNs / (60 * 1e9));
  }
  const offsetString = FormatOffsetTimeZoneIdentifier(offsetMinutes, 'unseparated');
  const tzName = '';
  return offsetString + tzName;
}

/** https://tc39.es/proposal-temporal/#sec-isoffsettimezoneidentifier */
export function IsOffsetTimeZoneIdentifier(_offsetString: string): boolean {
  temporal_todo();
}

/** https://tc39.es/ecma262/#sec-tozeropaddeddecimalstring */
export function ToZeroPaddedDecimalString(n: number, minLength: number) {
  return n.toString().padStart(minLength, '0');
}

/** https://tc39.es/ecma262/#sec-availablenamedtimezoneidentifiers */
export function AvailableNamedTimeZoneIdentifiers(): TimeZoneIdentifierRecord[] {
  mark_TimeZoneAwareNotImplemented();
  return [{
    Identifier: 'UTC' as TimeZoneIdentifier,
    PrimaryIdentifier: 'UTC' as TimeZoneIdentifier,
  }];
}
