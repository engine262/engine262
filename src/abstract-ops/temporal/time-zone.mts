import type { ISODateRecord } from '../../intrinsics/Temporal/PlainDate.mts';
import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { ParseTemporalTimeZoneString, ParseTimeZoneIdentifier } from '../../parser/TemporalParser.mts';
import {
  HourFromTime, MinFromTime, SecFromTime, msFromTime,
} from '../date-objects.mts';
import { isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { R } from '../spec-types.mjs';
import { abs } from '../math.mts';
import {
  IsOffsetTimeZoneIdentifier, GetNamedTimeZoneEpochNanoseconds, GetUTCEpochNanoseconds, RoundingMode,
  AvailableNamedTimeZoneIdentifiers,
  GetNamedTimeZoneOffsetNanoseconds,
} from './addition.mts';
import type { TimeZoneIdentifier } from './addition.mts';
import {
  RoundNumberToIncrement, EpochTimeToDate, EpochTimeToEpochYear, EpochTimeToMonthInYear, CheckISODaysRange,
  FormatTimeString,
} from './temporal.mts';
import {
  Assert, JSStringValue, ObjectValue, Value, type PlainCompletion, Q,
  Throw,
  X,
  AddDaysToISODate,
  AddTime,
  BalanceISODateTime,
  CombineISODateAndTimeRecord,
  CreateISODateRecord,
  CreateTimeRecord,
  IsValidEpochNanoseconds,
  MidnightTimeRecord,
  nsPerDay,
  TimeDurationFromComponents,
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

// https://tc39.es/proposal-temporal/#sec-temporal-getisopartsfromepoch
export function GetISOPartsFromEpoch(epochNanoseconds: number): ISODateTimeRecord {
  Assert(IsValidEpochNanoseconds(epochNanoseconds));
  const remainderNs = epochNanoseconds % 1e6;
  const epochMilliseconds = (epochNanoseconds - remainderNs) / 1e6;
  const year = EpochTimeToEpochYear(epochMilliseconds);
  const month = EpochTimeToMonthInYear(epochMilliseconds) + 1;
  const day = EpochTimeToDate(epochMilliseconds);
  const hour = R(HourFromTime(Value(epochMilliseconds)));
  const minute = R(MinFromTime(Value(epochMilliseconds)));
  const second = R(SecFromTime(Value(epochMilliseconds)));
  const millisecond = R(msFromTime(Value(epochMilliseconds)));
  const microsecond = Math.floor(remainderNs / 1000);
  Assert(microsecond < 1000);
  const nanosecond = remainderNs % 1000;
  const isoDate = CreateISODateRecord(year, month, day);
  const time = CreateTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond);
  return CombineISODateAndTimeRecord(isoDate, time);
}

// https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezonenexttransition
export function GetNamedTimeZoneNextTransition(timeZoneIdentifier: TimeZoneIdentifier, _epochNanoseconds: bigint): bigint | null {
  Assert(timeZoneIdentifier === 'UTC');
  return null;
}

// https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezoneprevioustransition
export function GetNamedTimeZonePreviousTransition(timeZoneIdentifier: TimeZoneIdentifier, _epochNanoseconds: bigint): bigint | null {
  Assert(timeZoneIdentifier === 'UTC');
  return null;
}

// https://tc39.es/proposal-temporal/#sec-temporal-formatoffsettimezoneidentifier
export function FormatOffsetTimeZoneIdentifier(offsetMinutes: number, style: 'separated' | 'unseparated' = 'separated'): TimeZoneIdentifier {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hour = Math.floor(absoluteMinutes / 60);
  const minute = absoluteMinutes % 60;
  const timeString = FormatTimeString(hour, minute, 0, 0, 'minute', style);
  return sign + timeString as TimeZoneIdentifier;
}

// https://tc39.es/proposal-temporal/#sec-temporal-formatutcoffsetnanoseconds
export function FormatUTCOffsetNanoseconds(offsetNanoseconds: number): string {
  const sign = offsetNanoseconds >= 0 ? '+' : '-';
  const absoluteNanoseconds = Math.abs(offsetNanoseconds);
  const hour = Math.floor(absoluteNanoseconds / (3600 * 1e9));
  const minute = Math.floor(absoluteNanoseconds / (60 * 1e9)) % 60;
  const second = Math.floor(absoluteNanoseconds / 1e9) % 60;
  const subSecondNanoseconds = absoluteNanoseconds % 1e9;
  const precision: 'minute' | 'auto' = second === 0 && subSecondNanoseconds === 0 ? 'minute' : 'auto';
  const timeString = FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
  return sign + timeString;
}

// https://tc39.es/proposal-temporal/#sec-temporal-formatdatetimeutcoffsetrounded
export function FormatDateTimeUTCOffsetRounded(offsetNanoseconds: number): string {
  offsetNanoseconds = RoundNumberToIncrement(offsetNanoseconds, 60 * 1e9, RoundingMode.HalfExpand);
  const offsetMinutes = offsetNanoseconds / (60 * 1e9);
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
export function GetOffsetNanosecondsFor(timeZone: TimeZoneIdentifier, epochNs: bigint): number {
  const parseResult = X(ParseTimeZoneIdentifier(timeZone));
  if (parseResult.OffsetMinutes !== undefined) {
    return parseResult.OffsetMinutes * (60 * 1e9);
  }
  return GetNamedTimeZoneOffsetNanoseconds(parseResult.Name!, epochNs);
}

// https://tc39.es/proposal-temporal/#sec-temporal-getisodatetimefor
export function GetISODateTimeFor(timeZone: TimeZoneIdentifier, epochNs: bigint): ISODateTimeRecord {
  const offsetNanoseconds = GetOffsetNanosecondsFor(timeZone, epochNs);
  const result = GetISOPartsFromEpoch(Number(epochNs));
  return BalanceISODateTime(
    result.ISODate.Year,
    result.ISODate.Month,
    result.ISODate.Day,
    result.Time.Hour,
    result.Time.Minute,
    result.Time.Second,
    result.Time.Millisecond,
    result.Time.Microsecond,
    result.Time.Nanosecond + offsetNanoseconds,
  );
}

// https://tc39.es/proposal-temporal/#sec-temporal-getepochnanosecondsfor
export function GetEpochNanosecondsFor(
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
  disambiguation: 'compatible' | 'earlier' | 'later' | 'reject',
): PlainCompletion<bigint> {
  const possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, isoDateTime));
  return DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, isoDateTime, disambiguation);
}

// https://tc39.es/proposal-temporal/#sec-temporal-disambiguatepossibleepochnanoseconds
export function DisambiguatePossibleEpochNanoseconds(
  possibleEpochNs: readonly bigint[],
  timeZone: TimeZoneIdentifier,
  isoDateTime: ISODateTimeRecord,
  disambiguation: 'compatible' | 'earlier' | 'later' | 'reject',
): PlainCompletion<bigint> {
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
  const before: ISODateTimeRecord = null!;
  Assert(!!before, 'TODO(temporal): 6. Let before be the latest possible ISO Date-Time Record for which CompareISODateTime(before, isoDateTime) = -1 and ! GetPossibleEpochNanoseconds(timeZone, before) is not empty.');
  const after: ISODateTimeRecord = null!;
  Assert(!!after, 'TODO(temporal): 7. Let after be the earliest possible ISO Date-Time Record for which CompareISODateTime(after, isoDateTime) = 1 and ! GetPossibleEpochNanoseconds(timeZone, after) is not empty.');
  const beforePossible = X(GetPossibleEpochNanoseconds(timeZone, before));
  Assert(beforePossible.length === 1);
  const afterPossible = X(GetPossibleEpochNanoseconds(timeZone, after));
  Assert(afterPossible.length === 1);
  const offsetBefore = GetOffsetNanosecondsFor(timeZone, beforePossible[0]);
  const offsetAfter = GetOffsetNanosecondsFor(timeZone, afterPossible[0]);
  const naneseconds = offsetAfter - offsetBefore;
  Assert(abs(naneseconds) <= nsPerDay);
  if (disambiguation === 'earlier') {
    const timeDuration = TimeDurationFromComponents(0, 0, 0, 0, 0, -naneseconds);
    const earlierTime = AddTime(isoDateTime.Time, timeDuration);
    const earlierDate = AddDaysToISODate(isoDateTime.ISODate, earlierTime.Days);
    const earlierDateTime = CombineISODateAndTimeRecord(earlierDate, earlierTime);
    possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, earlierDateTime));
    Assert(possibleEpochNs.length > 0);
    return possibleEpochNs[0];
  }
  Assert(disambiguation === 'compatible' || disambiguation === 'later');
  const timeDuration = TimeDurationFromComponents(0, 0, 0, 0, 0, naneseconds);
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
): PlainCompletion<bigint[]> {
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

// It determines the exact time that corresponds to the first valid wall-clock time in the calendar date isoDate in timeZone.
/** https://tc39.es/proposal-temporal/#sec-temporal-getstartofday */
export function GetStartOfDay(
  timeZone: TimeZoneIdentifier,
  isoDate: ISODateRecord,
): PlainCompletion<bigint> {
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, MidnightTimeRecord());
  const possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, isoDateTime));
  if (possibleEpochNs.length) {
    return possibleEpochNs[0];
  }
  Assert(IsOffsetTimeZoneIdentifier(timeZone) === false);
  // TODO(temporal)
  const isoDateTimeAfter: ISODateTimeRecord = null!;
  Assert(!!isoDateTimeAfter, 'TODO: isoDateTimeAfter is the ISO Date-Time Record for which DifferenceISODateTime(isoDateTime, isoDateTimeAfter, "iso8601", hour).[[Time]] is the smallest possible value > 0 for which possibleEpochNsAfter is not empty (i.e., isoDateTimeAfter represents the first local time after the transition).');
  // const possibleEpochNsAfter = GetNamedTimeZoneEpochNanoseconds(timeZone, isoDateTimeAfter!);
  // Assert(possibleEpochNsAfter.length === 1);
  // return possibleEpochNsAfter[0];
  return 0n;
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
  // TODO(temporal)
  // 3. Assert: If one and two are both offset time zone identifiers, they do not represent the same number of offset minutes.
  return false;
}
