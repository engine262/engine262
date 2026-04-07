// Addition/Edition to the main spec.
// Code here should move elsewhere after Temporal is merged.

import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { DateParser, ParseTimeZoneIdentifier } from '../../parser/TemporalParser.mts';
import {
  HourFromTime, MinFromTime, SecFromTime, type FiniteTimeValue,
  type TimeValue,
} from '../date-objects.mts';
import {
  R, type Integer, type IntegralNumber, type NaN, type Num,
} from '../spec-types.mjs';
import { __ts_cast__ } from '../../utils/language.mts';
import { truncate, truncateDiv } from '../math.mts';
import { Decimal } from '../../host-defined/decimal.mts';
import { FormatTimeString, type EpochNanoseconds } from './temporal.mts';
import { FormatOffsetTimeZoneIdentifier, type TimeZoneIdentifierRecord } from './time-zone.mts';
import { mark_TimeZoneAwareNotImplemented } from './not-implemented.mts';
import {
  Assert,
  Get,
  MakeDate,
  MakeDay,
  MakeTime,
  ObjectValue, OrdinaryObjectCreate, Q, Throw, TimeValueToISODateTimeRecord, ToNumber, ToString, UndefinedValue, Value, X, type PlainEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-year-week-record-specification-type */
export interface YearWeekRecord {
  readonly Week: bigint | undefined;
  readonly Year: bigint | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-snaptointeger */
export function* SnapToInteger(argument: Value, mode: 'strict' | 'truncate-strict', minimum?: Integer, maximum?: Integer): PlainEvaluator<Integer> {
  const number = Q(yield* ToNumber(argument));
  if (number.isNaN() || number.isInfinity()) return Throw.RangeError('$1 is not a finite number', number);
  let mv = R(number);
  if (mode === 'truncate-strict') mv = truncate(mv);
  else if (!Number.isInteger(mv)) {
    return Throw.RangeError('$1 is not an integer', number);
  }
  if (minimum !== undefined && mv < minimum) return Throw.RangeError('$1 is too small', number);
  if (maximum !== undefined && mv > maximum) return Throw.RangeError('$1 is too large', number);
  return BigInt(mv);
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

/** https://tc39.es/proposal-temporal/#sec-getroundingmodeoption */
export function* GetRoundingModeOption(
  options: ObjectValue,
  fallback: RoundingMode,
): PlainEvaluator<RoundingMode> {
  const table70 = [
    { String: 'ceil', Mode: RoundingMode.Ceil },
    { String: 'floor', Mode: RoundingMode.Floor },
    { String: 'expand', Mode: RoundingMode.Expand },
    { String: 'trunc', Mode: RoundingMode.Trunc },
    { String: 'halfCeil', Mode: RoundingMode.HalfCeil },
    { String: 'halfFloor', Mode: RoundingMode.HalfFloor },
    { String: 'halfExpand', Mode: RoundingMode.HalfExpand },
    { String: 'halfTrunc', Mode: RoundingMode.HalfTrunc },
    { String: 'halfEven', Mode: RoundingMode.HalfEven },
  ] as const;

  const value = Q(yield* Get(options, Value('roundingMode')));
  if (value instanceof UndefinedValue) return fallback;
  const stringValue = Q(yield* ToString(value)).stringValue();
  const result = table70.find((entry) => entry.String === stringValue);
  if (!result) return Throw.RangeError('"roundingMode" on object $1 is not valid ($2), only $3 are accepted', options, stringValue, table70.map((entry) => entry.String).join(', '));
  return result.Mode;
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
): PlainEvaluator<Integer> {
  const value = Q(yield* Get(options, Value('roundingIncrement')));
  if (value === Value.undefined) {
    return 1n;
  }
  return yield* SnapToInteger(value, 'truncate-strict', 1n, BigInt(1e9));
}

/** https://tc39.es/proposal-temporal/#sec-getutcepochnanoseconds */
export function GetUTCEpochNanoseconds(
  isoDateTime: ISODateTimeRecord,
): EpochNanoseconds {
  const date = MakeDay(Number(isoDateTime.ISODate.Year), Number(isoDateTime.ISODate.Month - 1n), Number(isoDateTime.ISODate.Day));
  const time = MakeTime(Number(isoDateTime.Time.Hour), Number(isoDateTime.Time.Minute), Number(isoDateTime.Time.Second), Number(isoDateTime.Time.Millisecond));
  const ms = MakeDate(date, time);
  Assert(Math.floor(ms) === ms);
  return (BigInt(ms) * BigInt(1e6) + isoDateTime.Time.Microsecond * BigInt(1e3) + isoDateTime.Time.Nanosecond) as EpochNanoseconds;
}

/** https://tc39.es/proposal-temporal/#sec-time-zone-identifiers */
export type TimeZoneIdentifier = string & { specName: 'TimeZoneIdentifier'; };

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
export function GetNamedTimeZoneOffsetNanoseconds(timeZoneIdentifier: string, _epochNanoseconds: EpochNanoseconds): Integer {
  mark_TimeZoneAwareNotImplemented();
  Assert(timeZoneIdentifier === 'UTC');
  return 0n;
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
export function LocalTime_TemporalEdited(t: FiniteTimeValue): IntegralNumber {
  const systemTimeZoneIdentifier = SystemTimeZoneIdentifier();
  const parseResult = X(ParseTimeZoneIdentifier(systemTimeZoneIdentifier));
  let offsetNs: bigint;
  if (parseResult.OffsetMinutes !== undefined) {
    offsetNs = parseResult.OffsetMinutes * BigInt(60 * 1e9);
  } else {
    offsetNs = GetNamedTimeZoneOffsetNanoseconds(systemTimeZoneIdentifier, Decimal(t).multiply(1e6).toBigInt());
  }
  const offsetMs = truncateDiv(offsetNs, BigInt(1e6));
  return t + Number(offsetMs);
}

/** https://tc39.es/proposal-temporal/#sec-utc-t */
export function UTC_TemporalEdited(t: Num): TimeValue {
  if (!Number.isFinite(t)) {
    return NaN as NaN;
  }
  const systemTimeZoneIdentifier = SystemTimeZoneIdentifier();
  const parseResult = X(ParseTimeZoneIdentifier(systemTimeZoneIdentifier));
  let offsetNs: bigint;
  if (parseResult.OffsetMinutes !== undefined) {
    offsetNs = parseResult.OffsetMinutes * (60n * BigInt(1e9));
  } else {
    const isoDateTime = TimeValueToISODateTimeRecord(t);
    const possibleInstants = GetNamedTimeZoneEpochNanoseconds(systemTimeZoneIdentifier, isoDateTime);
    let disambiguatedInstant: bigint;
    if (possibleInstants.length > 0) {
      disambiguatedInstant = possibleInstants[0];
    } else {
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
    offsetNs = GetNamedTimeZoneOffsetNanoseconds(systemTimeZoneIdentifier, disambiguatedInstant as EpochNanoseconds);
  }
  const offsetMs = truncateDiv(offsetNs, BigInt(1e6));
  return t - Number(offsetMs) as TimeValue;
}

/** https://tc39.es/proposal-temporal/#sec-timestring */
export function TimeString(tv: Num): string {
  // https://github.com/tc39/ecma262/pull/3759/changes#r3045475449
  // unsafe cast of tv from Number to IntegralNumber
  const timeString = FormatTimeString(
    BigInt(HourFromTime(tv)),
    BigInt(MinFromTime(tv)),
    BigInt(SecFromTime(tv)),
    0n,
    0n,
  );
  return `${timeString} GMT`;
}

/** https://tc39.es/proposal-temporal/#sec-timezoneestring */
export function TimeZoneString_TemporalEdited(tv: bigint): string {
  const systemTimeZoneIdentifier = SystemTimeZoneIdentifier();
  let offsetMinutes = X(ParseTimeZoneIdentifier(systemTimeZoneIdentifier)).OffsetMinutes;
  if (offsetMinutes === undefined) {
    const offsetNs = GetNamedTimeZoneOffsetNanoseconds(systemTimeZoneIdentifier, BigInt(tv * BigInt(1e6)) as EpochNanoseconds);
    offsetMinutes = offsetNs / BigInt(60 * 1e9);
  }
  const offsetString = FormatOffsetTimeZoneIdentifier(offsetMinutes, 'unseparated');
  const tzName = '';
  return offsetString + tzName;
}

/** https://tc39.es/proposal-temporal/#sec-isoffsettimezoneidentifier */
export function IsOffsetTimeZoneIdentifier(offsetString: string): boolean {
  const parseResult = DateParser.parse(offsetString, (parser) => parser.parseUTCOffset());
  if (Array.isArray(parseResult)) return false;
  return true;
}

/** https://tc39.es/ecma262/#sec-tozeropaddeddecimalstring */
export function ToZeroPaddedDecimalString(n: bigint | number, minLength: number) {
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
