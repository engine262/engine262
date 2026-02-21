import type { TemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import type { ISODateRecord } from '../../intrinsics/Temporal/PlainDate.mts';
import { type TemporalZonedDateTimeObject, isTemporalZonedDateTimeObject } from '../../intrinsics/Temporal/ZonedDateTime.mts';
import { ParseISODateTime, ParseDateTimeUTCOffset } from '../../parser/TemporalParser.mts';
import {
  GetOptionsObject,
  type TimeZoneIdentifier, GetUTCEpochNanoseconds, RoundingMode,
} from './addition.mts';
import {
  type PlainCompletion, Assert, Q, GetStartOfDay, GetEpochNanosecondsFor, CheckISODaysRange, IsValidEpochNanoseconds, Throw, GetPossibleEpochNanoseconds, RoundNumberToIncrement, DisambiguatePossibleEpochNanoseconds, Value, type ValueEvaluator, type CalendarType, ObjectValue, GetTemporalDisambiguationOption, GetTemporalOffsetOption, GetTemporalOverflowOption, X, GetTemporalCalendarIdentifierWithISODefault, PrepareCalendarFields, JSStringValue, ToTemporalTimeZoneIdentifier, CanonicalizeCalendar, CreateISODateRecord, type FunctionObject, surroundingAgent, OrdinaryCreateFromConstructor, type Mutable, RoundTemporalInstant, TemporalUnit, GetOffsetNanosecondsFor, GetISODateTimeFor, FormatDateTimeUTCOffsetRounded, FormatCalendarAnnotation, type InternalDurationRecord, DateDurationSign, AddInstant, CalendarDateAdd, CombineDateAndTimeDuration, ZeroDateDuration, type TimeDuration, CompareISODate, TimeDurationFromEpochNanosecondsDifference, TimeDurationSign, AddDaysToISODate, LargerOfTwoTemporalUnits, CalendarDateUntil, type DateUnit, TemporalUnitCategory, DifferenceInstant, type TimeUnit, RoundRelativeDuration, TotalTimeDuration, TotalRelativeDuration, CalendarEquals, GetDifferenceSettings, TemporalDurationFromInternal, CreateNegatedTemporalDuration, TimeZoneEquals, CreateTemporalDuration, ToTemporalDuration, ToInternalDurationRecord,
  BalanceISODateTime,
  CombineISODateAndTimeRecord,
  DifferenceTime,
  InterpretTemporalDateTimeFields,
  ISODateTimeToString,
  ISODateTimeWithinLimits,
  type TimeRecord,
} from '#self';

export type ISODateTimeOffsetBehaviour = 'option' | 'exact' | 'wall';
export type ISODateTimeMatchBehaviour = 'match-exactly' | 'match-minutes';

/** https://tc39.es/proposal-temporal/#sec-temporal-interpretisodatetimeoffset */
export function InterpretISODateTimeOffset(
  isoDate: ISODateRecord,
  time: TimeRecord | 'start-of-day',
  offsetBehaviour: ISODateTimeOffsetBehaviour,
  offsetNanoseconds: number,
  timeZone: TimeZoneIdentifier,
  disambiguation: 'earlier' | 'later' | 'compatible' | 'reject',
  offsetOption: 'ignore' | 'use' | 'prefer' | 'reject',
  matchBehaviour: ISODateTimeMatchBehaviour,
): PlainCompletion<bigint> {
  if (time === 'start-of-day') {
    Assert(offsetBehaviour === 'wall');
    Assert(offsetNanoseconds === 0);
    return Q(GetStartOfDay(timeZone, isoDate));
  }
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, time);
  if (offsetBehaviour === 'wall' || (offsetBehaviour === 'option' && offsetOption === 'ignore')) {
    return Q(GetEpochNanosecondsFor(timeZone, isoDateTime, disambiguation));
  }
  if (offsetBehaviour === 'exact' || (offsetBehaviour === 'option' && offsetOption === 'use')) {
    const balanced = BalanceISODateTime(isoDate.Year, isoDate.Month, isoDate.Day, time.Hour, time.Minute, time.Second, time.Millisecond, time.Microsecond, time.Nanosecond - offsetNanoseconds);
    Q(CheckISODaysRange(balanced.ISODate));
    const epochNanoseconds = GetUTCEpochNanoseconds(balanced);
    if (!IsValidEpochNanoseconds(epochNanoseconds)) {
      return Throw.RangeError('Invalid date');
    }
    return epochNanoseconds;
  }
  Assert(offsetBehaviour === 'option');
  Assert(offsetOption === 'prefer' || offsetOption === 'reject');
  Q(CheckISODaysRange(isoDate));
  const utcEpochNanoseconds = GetUTCEpochNanoseconds(isoDateTime);
  const possibleEpochNs = Q(GetPossibleEpochNanoseconds(timeZone, isoDateTime));
  for (const candidate of possibleEpochNs) {
    const candidateOffset = utcEpochNanoseconds - candidate;
    if (candidateOffset === BigInt(offsetNanoseconds)) {
      return candidate;
    }
    if (matchBehaviour === 'match-minutes') {
      const roundedCandidateNanoseconds = RoundNumberToIncrement(Number(candidateOffset), 60 * 1e9, RoundingMode.HalfExpand);
      if (roundedCandidateNanoseconds === offsetNanoseconds) {
        return candidate;
      }
    }
  }
  if (offsetOption === 'reject') {
    return Throw.RangeError('No matching offset found for the given date and time');
  }
  return Q(DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, isoDateTime, disambiguation));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime */
export function* ToTemporalZonedDateTime(
  item: Value,
  options: Value = Value.undefined,
): ValueEvaluator<TemporalZonedDateTimeObject> {
  let hasUTCDesignator = false;
  let matchBehaviour: ISODateTimeMatchBehaviour = 'match-exactly';
  let calendar: CalendarType;
  let isoDate: ISODateRecord;
  let time: TimeRecord | 'start-of-day';
  let timeZone: TimeZoneIdentifier;
  let offsetString: string | undefined;
  let disambiguation: 'earlier' | 'later' | 'compatible' | 'reject';
  let offsetOption: 'ignore' | 'use' | 'prefer' | 'reject';
  if (item instanceof ObjectValue) {
    if (isTemporalZonedDateTimeObject(item)) {
      const resolvedOptions = Q(GetOptionsObject(options));
      Q(yield* GetTemporalDisambiguationOption(resolvedOptions));
      Q(yield* GetTemporalOffsetOption(resolvedOptions, 'reject'));
      Q(yield* GetTemporalOverflowOption(resolvedOptions));
      return X(CreateTemporalZonedDateTime(item.EpochNanoseconds, item.TimeZone, item.Calendar));
    }
    calendar = Q(yield* GetTemporalCalendarIdentifierWithISODefault(item));
    const fields = Q(yield* PrepareCalendarFields(calendar, item, ['year', 'month', 'month-code', 'day'], ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'time-zone'], ['time-zone']));
    timeZone = fields.TimeZone! as TimeZoneIdentifier;
    offsetString = fields.OffsetString;
    const resolvedOptions = Q(GetOptionsObject(options));
    disambiguation = Q(yield* GetTemporalDisambiguationOption(resolvedOptions));
    offsetOption = Q(yield* GetTemporalOffsetOption(resolvedOptions, 'reject'));
    const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
    const result = Q(yield* InterpretTemporalDateTimeFields(calendar, fields, overflow));
    isoDate = result.ISODate;
    time = result.Time;
  } else {
    if (!(item instanceof JSStringValue)) {
      return Throw.TypeError('$1 is not a string', item);
    }
    const result = Q(ParseISODateTime(item.stringValue(), ['TemporalDateTimeString[+Zoned]']));
    const annotation = result.TimeZone.TimeZoneAnnotation;
    Assert(annotation !== undefined);
    timeZone = Q(ToTemporalTimeZoneIdentifier(annotation));
    offsetString = result.TimeZone.OffsetString;
    if (result.TimeZone.Z) {
      hasUTCDesignator = true;
    }
    let calendar = result.Calendar;
    if (calendar === undefined) {
      calendar = 'iso8601';
    }
    calendar = Q(CanonicalizeCalendar(calendar));
    matchBehaviour = 'match-minutes';
    if (offsetString) {
      // TODO(temporal):
      // i. Let offsetParseResult be ParseText(StringToCodePoints(offsetString), UTCOffset[+SubMinutePrecision]).
      // ii. Assert: offsetParseResult is a Parse Node.
      // iii. If offsetParseResult contains more than one MinuteSecond Parse Node, set matchBehaviour to match-exactly.
    }
    const resolvedOptions = Q(GetOptionsObject(options));
    disambiguation = Q(yield* GetTemporalDisambiguationOption(resolvedOptions));
    offsetOption = Q(yield* GetTemporalOffsetOption(resolvedOptions, 'reject'));
    Q(yield* GetTemporalOverflowOption(resolvedOptions));
    isoDate = CreateISODateRecord(result.Year!, result.Month, result.Day);
    time = result.Time;
  }
  let offsetBehaviour: ISODateTimeOffsetBehaviour;
  if (hasUTCDesignator) {
    offsetBehaviour = 'exact';
  } else if (offsetString === undefined) {
    offsetBehaviour = 'wall';
  } else {
    offsetBehaviour = 'option';
  }
  let offsetNanoseconds = 0;
  if (offsetBehaviour === 'option') {
    offsetNanoseconds = X(ParseDateTimeUTCOffset(offsetString!));
  }
  const epochNanoseconds = Q(InterpretISODateTimeOffset(isoDate, time, offsetBehaviour, offsetNanoseconds, timeZone, disambiguation, offsetOption, matchBehaviour));
  return X(CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar!));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalzoneddatetime */
export function* CreateTemporalZonedDateTime(
  epochNanoseconds: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  newTarget?: FunctionObject,
): ValueEvaluator<TemporalZonedDateTimeObject> {
  Assert(IsValidEpochNanoseconds(epochNanoseconds));
  if (newTarget === undefined) {
    newTarget = surroundingAgent.intrinsic('%Temporal.ZonedDateTime%');
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.ZonedDateTime.prototype%', [
    'InitializedTemporalZonedDateTime',
    'EpochNanoseconds',
    'TimeZone',
    'Calendar',
  ])) as Mutable<TemporalZonedDateTimeObject>;
  object.EpochNanoseconds = epochNanoseconds;
  object.TimeZone = timeZone;
  object.Calendar = calendar;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalzoneddatetimetostring */
export function TemporalZonedDateTimeToString(
  zonedDateTime: TemporalZonedDateTimeObject,
  precision: number | 'minute' | 'auto',
  showCalendar: 'auto' | 'always' | 'never' | 'critical',
  showTimeZone: 'auto' | 'never' | 'critical',
  showOffset: 'auto' | 'never',
  increment = 1,
  unit: TemporalUnit.Minute | TemporalUnit.Second | TemporalUnit.Millisecond | TemporalUnit.Microsecond | TemporalUnit.Nanosecond = TemporalUnit.Nanosecond,
  roundingMode = RoundingMode.Trunc,
): string {
  let epochNs = zonedDateTime.EpochNanoseconds;
  epochNs = RoundTemporalInstant(epochNs, increment, unit, roundingMode);
  const timeZone = zonedDateTime.TimeZone;
  const offsetNanoseconds = GetOffsetNanosecondsFor(timeZone, epochNs);
  const isoDateTime = GetISODateTimeFor(timeZone, epochNs);
  const dateTimeString = ISODateTimeToString(isoDateTime, 'iso8601', precision, 'never');
  const offsetString = showOffset === 'never' ? '' : FormatDateTimeUTCOffsetRounded(offsetNanoseconds);
  let timeZoneString;
  if (showTimeZone === 'never') {
    timeZoneString = '';
  } else {
    const flag = showTimeZone === 'critical' ? '!' : '';
    timeZoneString = `[${flag}${timeZone}]`;
  }
  const calendarString = FormatCalendarAnnotation(zonedDateTime.Calendar, showCalendar);
  return dateTimeString + offsetString + timeZoneString + calendarString;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addzoneddatetime */
export function AddZonedDateTime(
  epochNanoseconds: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  duration: InternalDurationRecord,
  overflow: 'constrain' | 'reject',
): PlainCompletion<bigint> {
  if (DateDurationSign(duration.Date) === 0) {
    return AddInstant(epochNanoseconds, duration.Time);
  }
  const isoDateTime = GetISODateTimeFor(timeZone, epochNanoseconds);
  const addedDate = Q(CalendarDateAdd(calendar, isoDateTime.ISODate, duration.Date, overflow));
  const intermediateDateTime = CombineISODateAndTimeRecord(addedDate, isoDateTime.Time);
  if (!ISODateTimeWithinLimits(intermediateDateTime)) {
    return Throw.RangeError('Resulting date-time is out of range');
  }
  const intermediateNs = X(GetEpochNanosecondsFor(timeZone, intermediateDateTime, 'compatible'));
  return AddInstant(intermediateNs, duration.Time);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetime */
export function DifferenceZonedDateTime(
  ns1: bigint,
  ns2: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
): PlainCompletion<InternalDurationRecord> {
  if (ns1 === ns2) {
    return CombineDateAndTimeDuration(ZeroDateDuration(), 0 as TimeDuration);
  }
  const startDateTime = GetISODateTimeFor(timeZone, ns1);
  const endDateTime = GetISODateTimeFor(timeZone, ns2);
  if (CompareISODate(startDateTime.ISODate, endDateTime.ISODate) === 0) {
    const timeDuration = TimeDurationFromEpochNanosecondsDifference(ns2, ns1);
    return CombineDateAndTimeDuration(ZeroDateDuration(), timeDuration);
  }
  const sign = ns2 - ns1 > 0 ? 1 : -1;
  const maxDayCorrection = sign === -1 ? 2 : 1;
  let dayCorrection = 0;
  let timeDuration = DifferenceTime(startDateTime.Time, endDateTime.Time);
  if (TimeDurationSign(timeDuration) === sign) dayCorrection += 1;
  let success = false;
  let intermediateDateTime;
  while (dayCorrection <= maxDayCorrection && !success) {
    const intermediateDate = AddDaysToISODate(endDateTime.ISODate, dayCorrection * sign);
    intermediateDateTime = CombineISODateAndTimeRecord(intermediateDate, startDateTime.Time);
    const intermediateNs = Q(GetEpochNanosecondsFor(timeZone, intermediateDateTime, 'compatible'));
    timeDuration = TimeDurationFromEpochNanosecondsDifference(ns2, intermediateNs);
    const timeSign = TimeDurationSign(timeDuration);
    if (sign !== timeSign) {
      success = true;
    }
    dayCorrection += 1;
  }
  Assert(success);
  const dateLargestUnit = LargerOfTwoTemporalUnits(largestUnit, TemporalUnit.Day);
  const dateDifference = CalendarDateUntil(calendar, startDateTime.ISODate, intermediateDateTime!.ISODate, dateLargestUnit as DateUnit);
  return CombineDateAndTimeDuration(dateDifference, timeDuration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithrounding */
export function DifferenceZonedDateTimeWithRounding(
  ns1: bigint,
  ns2: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
  roundingIncrement: number,
  smallestUnit: TemporalUnit,
  roundingMode: RoundingMode,
): PlainCompletion<InternalDurationRecord> {
  if (TemporalUnitCategory(largestUnit) === 'time') {
    return DifferenceInstant(ns1, ns2, roundingIncrement, smallestUnit as TimeUnit, roundingMode);
  }
  const difference = Q(DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, largestUnit));
  if (smallestUnit === TemporalUnit.Nanosecond && roundingIncrement === 1) {
    return difference;
  }
  const dateTime = GetISODateTimeFor(timeZone, ns1);
  return RoundRelativeDuration(difference, ns1, ns2, dateTime, timeZone, calendar, largestUnit, roundingIncrement, smallestUnit, roundingMode);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithtotal */
export function DifferenceZonedDateTimeWithTotal(
  ns1: bigint,
  ns2: bigint,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  unit: TemporalUnit,
): PlainCompletion<number> {
  if (TemporalUnitCategory(unit) === 'time') {
    const difference = TimeDurationFromEpochNanosecondsDifference(ns2, ns1);
    return TotalTimeDuration(difference, unit as TimeUnit);
  }
  const difference = Q(DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, unit));
  const dateTime = GetISODateTimeFor(timeZone, ns1);
  return TotalRelativeDuration(difference, ns1, ns2, dateTime, timeZone, calendar, unit);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalzoneddatetime */
export function* DifferenceTemporalZonedDateTime(
  operation: 'until' | 'since',
  zonedDateTime: TemporalZonedDateTimeObject,
  _other: Value,
  options: Value,
): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalZonedDateTime(_other));
  if (!CalendarEquals(zonedDateTime.Calendar, other.Calendar)) {
    return Throw.RangeError('Calendars are not equal');
  }
  const resolvedOptions = Q(GetOptionsObject(options));
  const settings = Q(yield* GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], TemporalUnit.Nanosecond, TemporalUnit.Hour));
  if (TemporalUnitCategory(settings.LargestUnit) === 'time') {
    const internalDuration = DifferenceInstant(zonedDateTime.EpochNanoseconds, other.EpochNanoseconds, settings.RoundingIncrement, settings.SmallestUnit as TimeUnit, settings.RoundingMode);
    let result = X(TemporalDurationFromInternal(internalDuration, settings.LargestUnit));
    if (operation === 'since') {
      result = CreateNegatedTemporalDuration(result);
    }
    return result;
  }
  if (!TimeZoneEquals(zonedDateTime.TimeZone, other.TimeZone)) {
    return Throw.RangeError('Time zones are not equal');
  }
  if (zonedDateTime.EpochNanoseconds === other.EpochNanoseconds) {
    return X(CreateTemporalDuration(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
  }
  const internalDuration = Q(DifferenceZonedDateTimeWithRounding(
    zonedDateTime.EpochNanoseconds,
    other.EpochNanoseconds,
    zonedDateTime.TimeZone,
    zonedDateTime.Calendar,
    settings.LargestUnit,
    settings.RoundingIncrement,
    settings.SmallestUnit,
    settings.RoundingMode,
  ));
  let result = X(TemporalDurationFromInternal(internalDuration, TemporalUnit.Hour));
  if (operation === 'since') {
    result = CreateNegatedTemporalDuration(result);
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtozoneddatetime */
export function* AddDurationToZonedDateTime(
  operation: 'add' | 'subtract',
  zonedDateTime: TemporalZonedDateTimeObject,
  temporalDurationLike: Value,
  options: Value,
): ValueEvaluator<TemporalZonedDateTimeObject> {
  let duration = Q(yield* ToTemporalDuration(temporalDurationLike));
  if (operation === 'subtract') {
    duration = CreateNegatedTemporalDuration(duration);
  }
  const resolvedOptions = Q(GetOptionsObject(options));
  const overflow = Q(yield* GetTemporalOverflowOption(resolvedOptions));
  const calendar = zonedDateTime.Calendar;
  const timeZone = zonedDateTime.TimeZone;
  const internalDuration = ToInternalDurationRecord(duration);
  const epochNanoseconds = Q(AddZonedDateTime(zonedDateTime.EpochNanoseconds, timeZone, calendar, internalDuration, overflow));
  return X(CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar));
}
