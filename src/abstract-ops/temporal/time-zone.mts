import type { ISODateRecord } from '../../intrinsics/Temporal/PlainDate.mts';
import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { ParseTemporalTimeZoneString, ParseTimeZoneIdentifier } from '../../parser/TemporalParser.mts';
import {
  HourFromTime, MinFromTime, SecFromTime, msFromTime,
} from '../date-objects.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { abs, floorDiv, modulo } from '../math.mts';
import { Decimal } from '../../host-defined/decimal.mts';
import {
  IsOffsetTimeZoneIdentifier, GetNamedTimeZoneEpochNanoseconds, GetUTCEpochNanoseconds, RoundingMode,
  AvailableNamedTimeZoneIdentifiers,
  GetNamedTimeZoneOffsetNanoseconds,
} from './addition.mts';
import type { TimeZoneIdentifier } from './addition.mts';
import {
  RoundNumberToIncrement, EpochTimeToDate, EpochTimeToEpochYear, EpochTimeToMonthInYear, CheckISODaysRange,
  FormatTimeString,
  TemporalUnit,
  type EpochNanoseconds,
} from './temporal.mts';
import {
  Assert, JSStringValue, ObjectValue, Value, type PlainCompletion, Q,
  Throw,
  X,
  AddDaysToISODate,
  AddTime,
  BalanceISODateTime,
  CombineISODateAndTimeRecord,
  IsValidEpochNanoseconds,
  MidnightTimeRecord,
  nsPerDay,
  TimeDurationFromComponents,
  type Integer,
  CompareISODateTime,
} from '#self';

// https://tc39.es/proposal-temporal/#sec-temporal-getavailablenamedtimezoneidentifier
export function GetAvailableNamedTimeZoneIdentifier(timeZoneIdentifier: TimeZoneIdentifier): TimeZoneIdentifierRecord | undefined {
  for (const record of AvailableNamedTimeZoneIdentifiers()) {
    if (record.Identifier.toLowerCase() === timeZoneIdentifier.toLowerCase()) {
      return record;
    }
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-time-zone-identifier-record */
export interface TimeZoneIdentifierRecord {
  readonly Identifier: TimeZoneIdentifier;
  readonly PrimaryIdentifier: TimeZoneIdentifier;
}

// https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezonenexttransition
export function GetNamedTimeZoneNextTransition(timeZoneIdentifier: TimeZoneIdentifier, _epochNanoseconds: EpochNanoseconds): bigint | null {
  Assert(timeZoneIdentifier === 'UTC');
  return null;
}

// https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezoneprevioustransition
export function GetNamedTimeZonePreviousTransition(timeZoneIdentifier: TimeZoneIdentifier, _epochNanoseconds: EpochNanoseconds): bigint | null {
  Assert(timeZoneIdentifier === 'UTC');
  return null;
}

// https://tc39.es/proposal-temporal/#sec-temporal-formatoffsettimezoneidentifier
export function FormatOffsetTimeZoneIdentifier(offsetMinutes: Integer, style: 'separated' | 'unseparated' = 'separated'): TimeZoneIdentifier {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = abs(offsetMinutes);
  const hour = floorDiv(absoluteMinutes, 60n);
  const minute = modulo(absoluteMinutes, 60n);
  const timeString = FormatTimeString(hour, minute, 0n, 0n, TemporalUnit.Minute, style);
  return sign + timeString as TimeZoneIdentifier;
}

// https://tc39.es/proposal-temporal/#sec-temporal-formatutcoffsetnanoseconds
export function FormatUTCOffsetNanoseconds(offsetNanoseconds: Integer): string {
  const sign = offsetNanoseconds >= 0 ? '+' : '-';
  const absoluteNanoseconds = abs(offsetNanoseconds);
  const hour = floorDiv(absoluteNanoseconds, BigInt(3600 * 1e9));
  const minute = modulo(floorDiv(absoluteNanoseconds, BigInt(60 * 1e9)), 60n);
  const second = modulo(floorDiv(absoluteNanoseconds, BigInt(1e9)), 60n);
  const subSecondNanoseconds = modulo(absoluteNanoseconds, BigInt(1e9));
  const precision: TemporalUnit.Minute | 'auto' = second === 0n && subSecondNanoseconds === 0n ? TemporalUnit.Minute : 'auto';
  const timeString = FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
  return sign + timeString;
}

// https://tc39.es/proposal-temporal/#sec-temporal-formatdatetimeutcoffsetrounded
export function FormatDateTimeUTCOffsetRounded(offsetNanoseconds: Integer): string {
  offsetNanoseconds = RoundNumberToIncrement(Decimal(offsetNanoseconds), BigInt(60 * 1e9), RoundingMode.HalfExpand);
  const offsetMinutes = offsetNanoseconds / BigInt(60 * 1e9);
  return FormatOffsetTimeZoneIdentifier(offsetMinutes);
}

// https://tc39.es/proposal-temporal/#sec-temporal-totemporaltimezoneidentifier
export function ToTemporalTimeZoneIdentifier(temporalTimeZoneLike: Value | string): PlainCompletion<TimeZoneIdentifier> {
  if (temporalTimeZoneLike instanceof ObjectValue && isTemporalZonedDateTimeObject(temporalTimeZoneLike)) {
    return temporalTimeZoneLike.TimeZone;
  }
  if (!(temporalTimeZoneLike instanceof JSStringValue) && typeof temporalTimeZoneLike !== 'string') {
    return Throw.TypeError('$1 is not a string', temporalTimeZoneLike);
  }
  const temporalTimeZoneLikeString = temporalTimeZoneLike instanceof JSStringValue ? temporalTimeZoneLike.stringValue() : temporalTimeZoneLike;
  const parseResult = Q(ParseTemporalTimeZoneString(temporalTimeZoneLikeString));
  const offsetMinutes = parseResult.OffsetMinutes;
  if (offsetMinutes !== undefined) {
    return FormatOffsetTimeZoneIdentifier(offsetMinutes);
  }
  const name = parseResult.Name;
  const timeZoneIdentifierRecord = GetAvailableNamedTimeZoneIdentifier(name! as TimeZoneIdentifier);
  if (timeZoneIdentifierRecord === undefined) {
    return Throw.RangeError('Invalid time zone identifier: $1', temporalTimeZoneLikeString);
  }
  return timeZoneIdentifierRecord.Identifier;
}

// https://tc39.es/proposal-temporal/#sec-temporal-getoffsetnanosecondsfor
export function GetOffsetNanosecondsFor(timeZone: TimeZoneIdentifier, epochNs: EpochNanoseconds): Integer {
  const parseResult = X(ParseTimeZoneIdentifier(timeZone));
  if (parseResult.OffsetMinutes !== undefined) {
    return parseResult.OffsetMinutes * (60n * BigInt(1e9));
  }
  return GetNamedTimeZoneOffsetNanoseconds(parseResult.Name!, epochNs);
}

// https://tc39.es/proposal-temporal/#sec-temporal-getisodatetimefor
export function GetISODateTimeFor(timeZone: TimeZoneIdentifier, epochNs: EpochNanoseconds): ISODateTimeRecord {
  Assert(IsValidEpochNanoseconds(epochNs));
  const offsetNanoseconds = GetOffsetNanosecondsFor(timeZone, epochNs);
  const remainderNs = modulo(epochNs, BigInt(1e6));
  const epochMilliseconds = (epochNs - remainderNs) / BigInt(1e6);
  const year = EpochTimeToEpochYear(epochMilliseconds);
  const month = EpochTimeToMonthInYear(epochMilliseconds) + 1n;
  const day = EpochTimeToDate(epochMilliseconds);
  const hour = HourFromTime(Number(epochMilliseconds));
  const minute = MinFromTime(Number(epochMilliseconds));
  const second = SecFromTime(Number(epochMilliseconds));
  const millisecond = msFromTime(Number(epochMilliseconds));
  const microsecond = floorDiv(remainderNs, 1000n);
  Assert(microsecond < 1000);
  const nanosecond = modulo(remainderNs, 1000n);
  return BalanceISODateTime(year, month, day, BigInt(hour), BigInt(minute), BigInt(second), BigInt(millisecond), microsecond, nanosecond + offsetNanoseconds);
}

// https://tc39.es/proposal-temporal/#sec-temporal-getepochnanosecondsfor
export function GetEpochNanosecondsFor(
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
  disambiguation: 'compatible' | 'earlier' | 'later' | 'reject',
): PlainCompletion<EpochNanoseconds> {
  const possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, isoDateTime));
  return DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, isoDateTime, disambiguation);
}

// https://tc39.es/proposal-temporal/#sec-temporal-disambiguatepossibleepochnanoseconds
export function DisambiguatePossibleEpochNanoseconds(
  possibleEpochNs: readonly bigint[],
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
  disambiguation: 'compatible' | 'earlier' | 'later' | 'reject',
): PlainCompletion<EpochNanoseconds> {
  let n = possibleEpochNs.length;
  if (n === 1) {
    return possibleEpochNs[0];
  }
  if (n !== 0) {
    if (disambiguation === 'earlier' || disambiguation === 'compatible') {
      return possibleEpochNs[0];
    }
    if (disambiguation === 'later') {
      return possibleEpochNs[n - 1];
    }
    Assert(disambiguation === 'reject');
    return Throw.RangeError('Multiple possible epoch nanoseconds');
  }
  Assert(n === 0);
  if (disambiguation === 'reject') {
    return Throw.RangeError('No possible epoch nanoseconds');
  }

  const _ns = GetUTCEpochNanoseconds(isoDateTime);
  // 6. Let before be the latest possible ISO Date-Time Record for which CompareISODateTime(before, isoDateTime) = -1 and !GetPossibleEpochNanoseconds(timeZone, before) is not empty.
  let before: ISODateTimeRecord;
  {
    const dayBeforeNs = _ns - nsPerDay;
    Assert(IsValidEpochNanoseconds(dayBeforeNs));
    before = GetISODateTimeFor(timeZone, dayBeforeNs);
  }
  Assert(CompareISODateTime(before, isoDateTime) === -1n && X(GetPossibleEpochNanoseconds(timeZone, before)).length > 0);

  // 7. Let after be the earliest possible ISO Date-Time Record for which CompareISODateTime(after, isoDateTime) = 1 and !GetPossibleEpochNanoseconds(timeZone, after) is not empty.
  let after: ISODateTimeRecord;
  {
    const dayAfterNs = _ns + nsPerDay;
    Assert(IsValidEpochNanoseconds(dayAfterNs));
    after = GetISODateTimeFor(timeZone, dayAfterNs);
  }
  Assert(CompareISODateTime(after, isoDateTime) === 1n && X(GetPossibleEpochNanoseconds(timeZone, after)).length > 0);

  const beforePossible = X(GetPossibleEpochNanoseconds(timeZone, before));
  Assert(beforePossible.length === 1);
  const afterPossible = X(GetPossibleEpochNanoseconds(timeZone, after));
  Assert(afterPossible.length === 1);
  const offsetBefore = GetOffsetNanosecondsFor(timeZone, beforePossible[0]);
  const offsetAfter = GetOffsetNanosecondsFor(timeZone, afterPossible[0]);
  const nanoseconds = offsetAfter - offsetBefore;
  Assert(abs(nanoseconds) <= nsPerDay);
  if (disambiguation === 'earlier') {
    const timeDuration = TimeDurationFromComponents(0n, 0n, 0n, 0n, 0n, -nanoseconds);
    const earlierTime = AddTime(isoDateTime.Time, timeDuration);
    const earlierDate = AddDaysToISODate(isoDateTime.ISODate, earlierTime.Days);
    const earlierDateTime = CombineISODateAndTimeRecord(earlierDate, earlierTime);
    possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, earlierDateTime));
    Assert(possibleEpochNs.length > 0);
    return possibleEpochNs[0];
  }
  Assert(disambiguation === 'compatible' || disambiguation === 'later');
  const timeDuration = TimeDurationFromComponents(0n, 0n, 0n, 0n, 0n, nanoseconds);
  const laterTime = AddTime(isoDateTime.Time, timeDuration);
  const laterDate = AddDaysToISODate(isoDateTime.ISODate, laterTime.Days);
  const laterDateTime = CombineISODateAndTimeRecord(laterDate, laterTime);
  possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, laterDateTime));
  n = possibleEpochNs.length;
  Assert(n > 0);
  return possibleEpochNs[n - 1];
}

// https://tc39.es/proposal-temporal/#sec-temporal-getpossibleepochnanoseconds
export function GetPossibleEpochNanoseconds(
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
): PlainCompletion<EpochNanoseconds[]> {
  const parseResult = X(ParseTimeZoneIdentifier(timeZone));
  let possibleEpochNanoseconds: bigint[];
  if (parseResult.OffsetMinutes !== undefined) {
    const balanced = BalanceISODateTime(
      isoDateTime.ISODate.Year,
      isoDateTime.ISODate.Month,
      isoDateTime.ISODate.Day,
      isoDateTime.Time.Hour,
      isoDateTime.Time.Minute - parseResult.OffsetMinutes,
      isoDateTime.Time.Second,
      isoDateTime.Time.Millisecond,
      isoDateTime.Time.Microsecond,
      isoDateTime.Time.Nanosecond,
    );
    Q(CheckISODaysRange(balanced.ISODate));
    const epochNanoseconds = GetUTCEpochNanoseconds(balanced);
    possibleEpochNanoseconds = [epochNanoseconds];
  } else {
    possibleEpochNanoseconds = GetNamedTimeZoneEpochNanoseconds(parseResult.Name! as TimeZoneIdentifier, isoDateTime);
  }
  for (const epochNanoseconds of possibleEpochNanoseconds) {
    if (!IsValidEpochNanoseconds(epochNanoseconds)) {
      return Throw.RangeError('$1 is not a valid epoch nanoseconds', epochNanoseconds);
    }
  }
  return possibleEpochNanoseconds;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-getstartofday */
export function GetStartOfDay(
  timeZone: TimeZoneIdentifier,
  isoDate: ISODateRecord,
): PlainCompletion<EpochNanoseconds> {
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, MidnightTimeRecord());
  const possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, isoDateTime));
  if (possibleEpochNs.length) {
    return possibleEpochNs[0];
  }
  Assert(!IsOffsetTimeZoneIdentifier(timeZone));

  // Code below only reachable with named timezone
  // 5. Let possibleEpochNsAfter be GetNamedTimeZoneEpochNanoseconds(timeZone, isoDateTimeAfter), where isoDateTimeAfter is the ISO Date-Time Record for which DifferenceISODateTime(isoDateTime, isoDateTimeAfter, "iso8601", hour).[[Time]] is the smallest possible value > 0 for which possibleEpochNsAfter is not empty (i.e., isoDateTimeAfter represents the first local time after the transition).
  // 6. Assert: The number of elements in possibleEpochNsAfter = 1.
  // 7. Return the sole element of possibleEpochNsAfter.
  const dayBefore = GetUTCEpochNanoseconds(isoDateTime) - nsPerDay;
  Assert(IsValidEpochNanoseconds(dayBefore));
  return GetNamedTimeZoneNextTransition(timeZone, dayBefore) ?? 0n;
}

// https://tc39.es/proposal-temporal/#sec-temporal-timezoneequals
export function TimeZoneEquals(one: TimeZoneIdentifier, two: TimeZoneIdentifier): boolean {
  if (one === two) {
    return true;
  }
  if (!IsOffsetTimeZoneIdentifier(one) && !IsOffsetTimeZoneIdentifier(two)) {
    const recordOne = GetAvailableNamedTimeZoneIdentifier(one);
    const recordTwo = GetAvailableNamedTimeZoneIdentifier(two);
    Assert(recordOne !== undefined);
    Assert(recordTwo !== undefined);
    if (recordOne.PrimaryIdentifier === recordTwo.PrimaryIdentifier) {
      return true;
    }
  }
  // 3. Assert: If one and two are both offset time zone identifiers, they do not represent the same number of offset minutes.
  if (IsOffsetTimeZoneIdentifier(one) && IsOffsetTimeZoneIdentifier(two)) {
    const oneOffsetMinutes = X(ParseTimeZoneIdentifier(one)).OffsetMinutes;
    const twoOffsetMinutes = X(ParseTimeZoneIdentifier(two)).OffsetMinutes;
    Assert(oneOffsetMinutes !== twoOffsetMinutes);
  }
  return false;
}
