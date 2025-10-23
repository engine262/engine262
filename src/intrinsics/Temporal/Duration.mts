import { RoundingMode, ToIntegerIfIntegral, type TimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import {
  __IsDateUnit, __IsTimeUnit, FormatFractionalSeconds, IsCalendarUnit, ISODateToEpochDays, LargerOfTwoTemporalUnits, RoundNumberToIncrement, TemporalUnit, TemporalUnitCategory, type DateUnit, type TimeUnit,
} from '../../abstract-ops/temporal/temporal.mts';
import { CalendarDateAdd, type CalendarType } from '../../abstract-ops/temporal/calendar.mts';
import { abs } from '../../abstract-ops/math.mts';
import { ParseTemporalDurationString } from '../../parser/TemporalParser.mts';
import { __ts_cast__ } from '../../helpers.mts';
import { nsPerDay } from './Instant.mts';
import type { ISODateTimeRecord } from './PlainDateTime.mts';
import type { TemporalPlainDateObject } from './PlainDate.mts';
import {
  Assert, Get, JSStringValue, ObjectValue, OrdinaryCreateFromConstructor, Q, surroundingAgent, Value, X, type FunctionObject, type Mutable, type OrdinaryObject, type PlainCompletion, type PlainEvaluator, type ValueEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#eqn-maxTimeDuration */
const maxTimeDuration = 9_007_199_254_740_991_999_999_999n;

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-duration-instances */
export interface TemporalDurationObject extends OrdinaryObject {
  readonly InitializedTemporalDuration: never;
  readonly Years: number;
  readonly Months: number;
  readonly Weeks: number;
  readonly Days: number;
  readonly Hours: number;
  readonly Minutes: number;
  readonly Seconds: number;
  readonly Milliseconds: number;
  readonly Microseconds: number;
  readonly Nanoseconds: number;
}

export function isTemporalDurationObject(item: Value): item is TemporalDurationObject {
  return item instanceof ObjectValue && 'InitializedTemporalDuration' in item;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-date-duration-records */
export interface DateDurationRecord {
  readonly Years: number;
  readonly Months: number;
  readonly Weeks: number;
  readonly Days: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-partial-duration-records */
export interface PartialDurationRecord {
  readonly Years: number | undefined;
  readonly Months: number | undefined;
  readonly Weeks: number | undefined;
  readonly Days: number | undefined;
  readonly Hours: number | undefined;
  readonly Minutes: number | undefined;
  readonly Seconds: number | undefined;
  readonly Milliseconds: number | undefined;
  readonly Microseconds: number | undefined;
  readonly Nanoseconds: number | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export interface InternalDurationRecord {
  readonly Date: DateDurationRecord;
  readonly Time: TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export type TimeDuration = number & { readonly TimeDuration: never };

/** https://tc39.es/proposal-temporal/#sec-temporal-zerodateduration */
export function ZeroDateDuration(): DateDurationRecord {
  return X(CreateDateDurationRecord(0, 0, 0, 0));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-tointernaldurationrecord */
export function ToInternalDurationRecord(duration: TemporalDurationObject): InternalDurationRecord {
  const dateDuration = X(CreateDateDurationRecord(duration.Years, duration.Months, duration.Weeks, duration.Days));
  const timeDuration = TimeDurationFromComponents(duration.Hours, duration.Minutes, duration.Seconds, duration.Milliseconds, duration.Microseconds, duration.Nanoseconds);
  return CombineDateAndTimeDuration(dateDuration, timeDuration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-tointernaldurationrecordwith24hourdays */
export function ToInternalDurationRecordWith24HourDays(duration: TemporalDurationObject): InternalDurationRecord {
  let timeDuration = TimeDurationFromComponents(duration.Hours, duration.Minutes, duration.Seconds, duration.Milliseconds, duration.Microseconds, duration.Nanoseconds);
  timeDuration = X(Add24HourDaysToTimeDuration(timeDuration, duration.Days));
  const dateDuration = X(CreateDateDurationRecord(duration.Years, duration.Months, duration.Weeks, 0));
  return CombineDateAndTimeDuration(dateDuration, timeDuration);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-todatedurationrecordwithouttime */
export function ToDateDurationRecordWithoutTime(duration: TemporalDurationObject): DateDurationRecord {
  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  const days = Math.trunc(internalDuration.Time / nsPerDay);
  return X(CreateDateDurationRecord(internalDuration.Date.Years, internalDuration.Date.Months, internalDuration.Date.Weeks, days));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationfrominternal */
export function TemporalDurationFromInternal(internalDuration: InternalDurationRecord, largestUnit: TemporalUnit): ValueEvaluator<TemporalDurationObject> {
  let days = 0n;
  let hours = 0n;
  let minutes = 0n;
  let seconds = 0n;
  let milliseconds = 0n;
  let microseconds = 0n;
  const sign = TimeDurationSign(internalDuration.Time);
  let nanoseconds = BigInt(abs(internalDuration.Time));
  if (TemporalUnitCategory(largestUnit) === 'date') {
    microseconds = nanoseconds / 1000n;
    nanoseconds %= 1000n;
    milliseconds = microseconds / 1000n;
    microseconds %= 1000n;
    seconds = milliseconds / 1000n;
    milliseconds %= 1000n;
    minutes = seconds / 60n;
    seconds %= 60n;
    hours = minutes / 60n;
    minutes %= 60n;
    days = hours / 24n;
    hours %= 24n;
  } else if (largestUnit === TemporalUnit.Hour) {
    microseconds = nanoseconds / 1000n;
    nanoseconds %= 1000n;
    milliseconds = microseconds / 1000n;
    microseconds %= 1000n;
    seconds = milliseconds / 1000n;
    milliseconds %= 1000n;
    minutes = seconds / 60n;
    seconds %= 60n;
    hours = minutes / 60n;
    minutes %= 60n;
  } else if (largestUnit === TemporalUnit.Minute) {
    microseconds = nanoseconds / 1000n;
    nanoseconds %= 1000n;
    milliseconds = microseconds / 1000n;
    microseconds %= 1000n;
    seconds = milliseconds / 1000n;
    milliseconds %= 1000n;
    minutes = seconds / 60n;
    seconds %= 60n;
  } else if (largestUnit === TemporalUnit.Second) {
    microseconds = nanoseconds / 1000n;
    nanoseconds %= 1000n;
    milliseconds = microseconds / 1000n;
    microseconds %= 1000n;
    seconds = milliseconds / 1000n;
    milliseconds %= 1000n;
  } else if (largestUnit === TemporalUnit.Millisecond) {
    microseconds = nanoseconds / 1000n;
    nanoseconds %= 1000n;
    milliseconds = microseconds / 1000n;
    microseconds %= 1000n;
  } else if (largestUnit === TemporalUnit.Microsecond) {
    microseconds = nanoseconds / 1000n;
    nanoseconds %= 1000n;
  } else {
    Assert(largestUnit === TemporalUnit.Nanosecond);
  }
  return CreateTemporalDuration(internalDuration.Date.Years, internalDuration.Date.Months, internalDuration.Date.Weeks, internalDuration.Date.Days + Number(days) * sign, Number(hours) * sign, Number(minutes) * sign, Number(seconds) * sign, Number(milliseconds) * sign, Number(microseconds) * sign, Number(nanoseconds) * sign);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createdatedurationrecord */
export function CreateDateDurationRecord(years: number, months: number, weeks: number, days: number): PlainCompletion<DateDurationRecord> {
  if (!IsValidDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0)) {
    return surroundingAgent.Throw('RangeError', 'InvalidDuration');
  }
  return {
    Years: years,
    Months: months,
    Weeks: weeks,
    Days: days,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adjustdatedurationrecord */
export function AdjustDateDurationRecord(
  dateDuration: DateDurationRecord,
  days: number,
  weeks?: number,
  months?: number,
): PlainCompletion<DateDurationRecord> {
  weeks ||= dateDuration.Weeks;
  months ||= dateDuration.Months;
  return CreateDateDurationRecord(dateDuration.Years, months, weeks, days);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-combinedateandtimeduration */
export function CombineDateAndTimeDuration(dateDuration: DateDurationRecord, timeDuration: TimeDuration): InternalDurationRecord {
  const dateSign = DateDurationSign(dateDuration);
  const timeSign = TimeDurationSign(timeDuration);
  if (dateSign !== 0 && timeSign !== 0) {
    Assert(dateSign === timeSign);
  }
  return {
    Date: dateDuration,
    Time: timeDuration,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration */
export function* ToTemporalDuration(item: Value): ValueEvaluator<TemporalDurationObject> {
  if (isTemporalDurationObject(item)) {
    return X(CreateTemporalDuration(item.Years, item.Months, item.Weeks, item.Days, item.Hours, item.Minutes, item.Seconds, item.Milliseconds, item.Microseconds, item.Nanoseconds));
  }
  if (!(item instanceof ObjectValue)) {
    if (!(item instanceof JSStringValue)) {
      return surroundingAgent.Throw('TypeError', 'CannotConvertToTemporalDuration', item);
    }
    return ParseTemporalDurationString(item.stringValue());
  }
  const result: Mutable<PartialDurationRecord> = {
    Years: 0,
    Months: 0,
    Weeks: 0,
    Days: 0,
    Hours: 0,
    Microseconds: 0,
    Milliseconds: 0,
    Minutes: 0,
    Nanoseconds: 0,
    Seconds: 0,
  };
  const partial = Q(yield* ToTemporalPartialDurationRecord(item));
  if (partial.Years !== undefined) {
    result.Years = partial.Years;
  }
  if (partial.Months !== undefined) {
    result.Months = partial.Months;
  }
  if (partial.Weeks !== undefined) {
    result.Weeks = partial.Weeks;
  }
  if (partial.Days !== undefined) {
    result.Days = partial.Days;
  }
  if (partial.Hours !== undefined) {
    result.Hours = partial.Hours;
  }
  if (partial.Minutes !== undefined) {
    result.Minutes = partial.Minutes;
  }
  if (partial.Seconds !== undefined) {
    result.Seconds = partial.Seconds;
  }
  if (partial.Milliseconds !== undefined) {
    result.Milliseconds = partial.Milliseconds;
  }
  if (partial.Microseconds !== undefined) {
    result.Microseconds = partial.Microseconds;
  }
  if (partial.Nanoseconds !== undefined) {
    result.Nanoseconds = partial.Nanoseconds;
  }
  return yield* CreateTemporalDuration(result.Years!, result.Months!, result.Weeks!, result.Days!, result.Hours!, result.Minutes!, result.Seconds!, result.Milliseconds!, result.Microseconds!, result.Nanoseconds!);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-durationsign */
export function DurationSign(duration: TemporalDurationObject): -1 | 0 | 1 {
  if (duration.Years < 0) {
    return -1;
  }
  if (duration.Years > 0) {
    return 1;
  }
  if (duration.Months < 0) {
    return -1;
  }
  if (duration.Months > 0) {
    return 1;
  }
  if (duration.Weeks < 0) {
    return -1;
  }
  if (duration.Weeks > 0) {
    return 1;
  }
  if (duration.Days < 0) {
    return -1;
  }
  if (duration.Days > 0) {
    return 1;
  }
  if (duration.Hours < 0) {
    return -1;
  }
  if (duration.Hours > 0) {
    return 1;
  }
  if (duration.Minutes < 0) {
    return -1;
  }
  if (duration.Minutes > 0) {
    return 1;
  }
  if (duration.Seconds < 0) {
    return -1;
  }
  if (duration.Seconds > 0) {
    return 1;
  }
  if (duration.Milliseconds < 0) {
    return -1;
  }
  if (duration.Milliseconds > 0) {
    return 1;
  }
  if (duration.Microseconds < 0) {
    return -1;
  }
  if (duration.Microseconds > 0) {
    return 1;
  }
  if (duration.Nanoseconds < 0) {
    return -1;
  }
  if (duration.Nanoseconds > 0) {
    return 1;
  }
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationsign */
export function DateDurationSign(dateDuration: DateDurationRecord): -1 | 0 | 1 {
  if (dateDuration.Years < 0) {
    return -1;
  }
  if (dateDuration.Years > 0) {
    return 1;
  }
  if (dateDuration.Months < 0) {
    return -1;
  }
  if (dateDuration.Months > 0) {
    return 1;
  }
  if (dateDuration.Weeks < 0) {
    return -1;
  }
  if (dateDuration.Weeks > 0) {
    return 1;
  }
  if (dateDuration.Days < 0) {
    return -1;
  }
  if (dateDuration.Days > 0) {
    return 1;
  }
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internaldurationsign */
export function InternalDurationSign(internalDuration: InternalDurationRecord): -1 | 0 | 1 {
  const dateSign = DateDurationSign(internalDuration.Date);
  if (dateSign !== 0) {
    return dateSign;
  }
  return TimeDurationSign(internalDuration.Time);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidduration */
export function IsValidDuration(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number,
): boolean {
  let sign = 0;
  for (const v of [years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds]) {
    if (!Number.isFinite(v)) {
      return false;
    }
    if (v < 0) {
      if (sign > 0) {
        return false;
      }
      sign = -1;
    } else if (v > 0) {
      if (sign < 0) {
        return false;
      }
      sign = 1;
    }
  }
  if (Math.abs(years) >= 2 ** 32) {
    return false;
  }
  if (Math.abs(months) >= 2 ** 32) {
    return false;
  }
  if (Math.abs(weeks) >= 2 ** 32) {
    return false;
  }
  // Let normalizedSeconds be days × 86,400 + hours × 3600 + minutes × 60 + seconds + ℝ(𝔽(milliseconds)) × 10**-3 + ℝ(𝔽(microseconds)) × 10**-6 + ℝ(𝔽(nanoseconds)) × 10**-9.
  // If abs(normalizedSeconds) ≥ 2**53, return false.
  let normalizedSeconds = BigInt(days) * 86400n + BigInt(hours) * 3600n + BigInt(minutes) * 60n + BigInt(seconds);
  if (abs(normalizedSeconds) >= 2 ** 53) {
    return false;
  }
  normalizedSeconds *= BigInt(10e9); // Convert to nanoseconds
  normalizedSeconds += BigInt(milliseconds) * 1000000n + BigInt(microseconds) * 1000n + BigInt(nanoseconds);
  if (abs(normalizedSeconds) >= BigInt(2 ** 53) * BigInt(10e9)) {
    return false;
  }
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-defaulttemporallargestunit */
export function DefaultTemporalLargestUnit(duration: TemporalDurationObject): TemporalUnit {
  if (duration.Years !== 0) {
    return TemporalUnit.Year;
  }
  if (duration.Months !== 0) {
    return TemporalUnit.Month;
  }
  if (duration.Weeks !== 0) {
    return TemporalUnit.Week;
  }
  if (duration.Days !== 0) {
    return TemporalUnit.Day;
  }
  if (duration.Hours !== 0) {
    return TemporalUnit.Hour;
  }
  if (duration.Minutes !== 0) {
    return TemporalUnit.Minute;
  }
  if (duration.Seconds !== 0) {
    return TemporalUnit.Second;
  }
  if (duration.Milliseconds !== 0) {
    return TemporalUnit.Millisecond;
  }
  if (duration.Microseconds !== 0) {
    return TemporalUnit.Microsecond;
  }
  return TemporalUnit.Nanosecond;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalpartialdurationrecord */
export function* ToTemporalPartialDurationRecord(temporalDurationLike: Value): PlainEvaluator<PartialDurationRecord> {
  if (!(temporalDurationLike instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', temporalDurationLike);
  }
  const result: Mutable<PartialDurationRecord> = {
    Days: undefined,
    Hours: undefined,
    Microseconds: undefined,
    Milliseconds: undefined,
    Minutes: undefined,
    Months: undefined,
    Nanoseconds: undefined,
    Seconds: undefined,
    Weeks: undefined,
    Years: undefined,
  };
  const days = Q(yield* Get(temporalDurationLike, Value('days')));
  if (days !== Value.undefined) {
    result.Days = Q(yield* ToIntegerIfIntegral(days));
  }
  const hours = Q(yield* Get(temporalDurationLike, Value('hours')));
  if (days !== Value.undefined) {
    result.Hours = Q(yield* ToIntegerIfIntegral(hours));
  }
  const microseconds = Q(yield* Get(temporalDurationLike, Value('microseconds')));
  if (microseconds !== Value.undefined) {
    result.Microseconds = Q(yield* ToIntegerIfIntegral(microseconds));
  }
  const milliseconds = Q(yield* Get(temporalDurationLike, Value('milliseconds')));
  if (milliseconds !== Value.undefined) {
    result.Milliseconds = Q(yield* ToIntegerIfIntegral(milliseconds));
  }
  const minutes = Q(yield* Get(temporalDurationLike, Value('minutes')));
  if (minutes !== Value.undefined) {
    result.Minutes = Q(yield* ToIntegerIfIntegral(minutes));
  }
  const months = Q(yield* Get(temporalDurationLike, Value('months')));
  if (months !== Value.undefined) {
    result.Months = Q(yield* ToIntegerIfIntegral(months));
  }
  const nanoseconds = Q(yield* Get(temporalDurationLike, Value('nanoseconds')));
  if (nanoseconds !== Value.undefined) {
    result.Nanoseconds = Q(yield* ToIntegerIfIntegral(nanoseconds));
  }
  const seconds = Q(yield* Get(temporalDurationLike, Value('seconds')));
  if (seconds !== Value.undefined) {
    result.Seconds = Q(yield* ToIntegerIfIntegral(seconds));
  }
  const weeks = Q(yield* Get(temporalDurationLike, Value('weeks')));
  if (weeks !== Value.undefined) {
    result.Weeks = Q(yield* ToIntegerIfIntegral(weeks));
  }
  const years = Q(yield* Get(temporalDurationLike, Value('years')));
  if (years !== Value.undefined) {
    result.Years = Q(yield* ToIntegerIfIntegral(years));
  }

  if (years === Value.undefined
    && months === Value.undefined
    && weeks === Value.undefined
    && days === Value.undefined
    && hours === Value.undefined
    && minutes === Value.undefined
    && seconds === Value.undefined
    && milliseconds === Value.undefined
    && microseconds === Value.undefined
    && nanoseconds === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'InvalidDuration');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalduration */
export function* CreateTemporalDuration(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number,
  newTarget?: FunctionObject,
): ValueEvaluator<TemporalDurationObject> {
  if (!IsValidDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds)) {
    return surroundingAgent.Throw('RangeError', 'InvalidDuration');
  }
  if (newTarget === undefined) {
    newTarget = surroundingAgent.currentRealmRecord.Intrinsics['%Temporal.Duration%'];
  }
  const object = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Temporal.Duration.prototype%', [
    'InitializedTemporalDuration',
    'Years',
    'Months',
    'Weeks',
    'Days',
    'Hours',
    'Minutes',
    'Seconds',
    'Milliseconds',
    'Microseconds',
    'Nanoseconds',
  ])) as Mutable<TemporalDurationObject>;
  object.Years = years;
  object.Months = months;
  object.Weeks = weeks;
  object.Days = days;
  object.Hours = hours;
  object.Minutes = minutes;
  object.Seconds = seconds;
  object.Milliseconds = milliseconds;
  object.Microseconds = microseconds;
  object.Nanoseconds = nanoseconds;
  return object;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createnegatedtemporalduration */
export function CreateNegatedTemporalDuration(duration: TemporalDurationObject): TemporalDurationObject {
  return X(CreateTemporalDuration(
    -duration.Years,
    -duration.Months,
    -duration.Weeks,
    -duration.Days,
    -duration.Hours,
    -duration.Minutes,
    -duration.Seconds,
    -duration.Milliseconds,
    -duration.Microseconds,
    -duration.Nanoseconds,
  ));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationfromcomponents */
export function TimeDurationFromComponents(
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number,
): TimeDuration {
  minutes += hours * 60;
  seconds += minutes * 60;
  milliseconds += seconds * 1000;
  microseconds += milliseconds * 1000;
  nanoseconds += microseconds * 1000;
  Assert(abs(nanoseconds) <= maxTimeDuration);
  return nanoseconds as TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimeduration */
export function AddTimeDuration(one: TimeDuration, two: TimeDuration): PlainCompletion<TimeDuration> {
  const result = BigInt(one) + BigInt(two);
  if (abs(result) > maxTimeDuration) {
    return surroundingAgent.Throw('RangeError', 'InvalidDuration');
  }
  return Number(result) as TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-add24hourdaystotimeduration */
export function Add24HourDaysToTimeDuration(d: TimeDuration, days: number): PlainCompletion<TimeDuration> {
  const result = BigInt(d) + BigInt(days) * BigInt(nsPerDay);
  if (abs(result) > maxTimeDuration) {
    return surroundingAgent.Throw('RangeError', 'InvalidDuration');
  }
  return Number(result) as TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimedurationtoepochnanoseconds */
export function AddTimeDurationToEpochNanoseconds(d: TimeDuration, epochNs: bigint): bigint {
  return epochNs + BigInt(d);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimeduration */
export function CompareTimeDuration(one: TimeDuration, two: TimeDuration): -1 | 0 | 1 {
  if (one > two) {
    return 1;
  }
  if (one < two) {
    return -1;
  }
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationfromepochnanosecondsdifference */
export function TimeDurationFromEpochNanosecondsDifference(one: number, two: number): TimeDuration {
  const result = one - two;
  Assert(abs(result) <= maxTimeDuration);
  return result as TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimedurationtoincrement */
export function RoundTimeDurationToIncrement(
  d: TimeDuration,
  increment: number,
  roundingMode: RoundingMode,
): PlainCompletion<TimeDuration> {
  const rounded = RoundNumberToIncrement(d, increment, roundingMode);
  if (abs(rounded) > maxTimeDuration) {
    return surroundingAgent.Throw('RangeError', 'InvalidDuration');
  }
  return rounded as TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationsign */
export function TimeDurationSign(d: TimeDuration): -1 | 0 | 1 {
  if (d < 0) {
    return -1;
  }
  if (d > 0) {
    return 1;
  }
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationdays */
export function DateDurationDays(dateDuration: DateDurationRecord, plainRelativeTo: TemporalPlainDateObject): PlainCompletion<number> {
  const yearsMonthsWeeksDuration = X(AdjustDateDurationRecord(dateDuration, 0));
  if (DateDurationSign(yearsMonthsWeeksDuration) === 0) {
    return dateDuration.Days;
  }
  const later = Q(CalendarDateAdd(plainRelativeTo.Calendar, plainRelativeTo.ISODate, yearsMonthsWeeksDuration, 'constrain'));
  const epochDays1 = ISODateToEpochDays(plainRelativeTo.ISODate.Year, plainRelativeTo.ISODate.Month - 1, plainRelativeTo.ISODate.Day);
  const epochDays2 = ISODateToEpochDays(later.Year, later.Month - 1, later.Day);
  const yearsMonthsWeeksInDays = epochDays2 - epochDays1;
  return dateDuration.Days + Number(yearsMonthsWeeksInDays);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimeduration */
export declare function RoundTimeDuration(
  timeDuration: TimeDuration,
  increment: number,
  unit: TimeUnit,
  roundingMode: RoundingMode
): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totaltimeduration */
export declare function TotalTimeDuration(timeDuration: TimeDuration, unit: TimeUnit | 'day'): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-duration-nudge-result-records */
export interface DurationNudgeResultRecord {
  readonly Duration: InternalDurationRecord;
  readonly NudgedEpochNs: number;
  readonly DidExpandCalendarUnit: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetocalendarunit */
export declare function NudgeToCalendarUnit(
  sign: -1 | 1,
  duration: InternalDurationRecord,
  destEpochNs: number,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  increment: number,
  unit: DateUnit,
  roundingMode: RoundingMode
): PlainCompletion<{ NudgeResult: DurationNudgeResultRecord; Total: number }>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetozonedtime */
export declare function NudgeToZonedTime(
  sign: -1 | 1,
  duration: InternalDurationRecord,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  increment: number,
  unit: TimeUnit,
  roundingMode: RoundingMode
): PlainCompletion<DurationNudgeResultRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetodayortime */
export declare function NudgeToDayOrTime(
  duration: InternalDurationRecord,
  destEpochNs: number,
  largestUnit: TemporalUnit,
  increment: number,
  smallestUnit: TimeUnit | TemporalUnit.Day,
  roundingMode: RoundingMode
): PlainCompletion<DurationNudgeResultRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-bubblerelativeduration */
export declare function BubbleRelativeDuration(
  sign: -1 | 1,
  duration: InternalDurationRecord,
  nudgedEpochNs: number,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  largestUnit: DateUnit,
  smallestUnit: DateUnit
): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundrelativeduration */
export function RoundRelativeDuration(
  duration: InternalDurationRecord,
  destEpochNs: number,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
  increment: number,
  smallestUnit: TemporalUnit,
  roundingMode: RoundingMode,
): PlainCompletion<InternalDurationRecord> {
  let irregularLengthUnit = false;
  if (IsCalendarUnit(smallestUnit)) {
    irregularLengthUnit = true;
  }
  if (timeZone !== undefined && smallestUnit === TemporalUnit.Day) {
    irregularLengthUnit = true;
  }
  let sign: -1 | 1;
  if (InternalDurationSign(duration) < 0) {
    sign = -1;
  } else {
    sign = 1;
  }
  let nudgeResult;
  if (irregularLengthUnit) {
    const record = Q(NudgeToCalendarUnit(sign, duration, destEpochNs, isoDateTime, timeZone, calendar, increment, smallestUnit as DateUnit, roundingMode));
    nudgeResult = record.NudgeResult;
  } else if (timeZone !== undefined) {
    Assert(__IsTimeUnit(smallestUnit));
    nudgeResult = Q(NudgeToZonedTime(sign, duration, isoDateTime, timeZone, calendar, increment, smallestUnit, roundingMode));
  } else {
    Assert(__IsTimeUnit(smallestUnit) || smallestUnit === TemporalUnit.Day);
    nudgeResult = Q(NudgeToDayOrTime(duration, destEpochNs, largestUnit, increment, smallestUnit, roundingMode));
  }
  duration = nudgeResult.Duration;
  if (nudgeResult.DidExpandCalendarUnit && smallestUnit !== TemporalUnit.Week) {
    const startUnit = LargerOfTwoTemporalUnits(smallestUnit, TemporalUnit.Day);
    Assert(__IsDateUnit(startUnit) && __IsDateUnit(largestUnit));
    duration = Q(BubbleRelativeDuration(sign, duration, nudgeResult.NudgedEpochNs, isoDateTime, timeZone, calendar, largestUnit, startUnit));
  }
  return duration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totalrelativeduration */
export function TotalRelativeDuration(
  duration: InternalDurationRecord,
  destEpochNs: number,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  unit: TemporalUnit,
): PlainCompletion<number> {
  if (IsCalendarUnit(unit) || (timeZone !== undefined && unit === TemporalUnit.Day)) {
    const sign = InternalDurationSign(duration);
    // https://github.com/tc39/proposal-temporal/issues/3131
    const record = Q(NudgeToCalendarUnit(sign as 1, duration, destEpochNs, isoDateTime, timeZone, calendar, 1, unit, RoundingMode.Trunc));
    return record.Total;
  }
  __ts_cast__<Exclude<TemporalUnit, TemporalUnit.Day | TemporalUnit.Month | TemporalUnit.Week>>(unit);
  const timeDuration = X(Add24HourDaysToTimeDuration(duration.Time, duration.Date.Days));
  return TotalTimeDuration(timeDuration, unit);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationtostring */
export function TemporalDurationToString(
  duration: TemporalDurationObject,
  precision: number | 'auto',
): string {
  const sign = DurationSign(duration);
  let datePart = '';
  if (duration.Years !== 0) {
    datePart += `${Math.abs(duration.Years)}Y`;
  }
  if (duration.Months !== 0) {
    datePart += `${Math.abs(duration.Months)}M`;
  }
  if (duration.Weeks !== 0) {
    datePart += `${Math.abs(duration.Weeks)}W`;
  }
  if (duration.Days !== 0) {
    datePart += `${Math.abs(duration.Days)}D`;
  }
  let timePart = '';
  if (duration.Hours !== 0) {
    timePart += `${Math.abs(duration.Hours)}H`;
  }
  if (duration.Minutes !== 0) {
    timePart += `${Math.abs(duration.Minutes)}M`;
  }
  let zeroMinutesAndHigher = false;
  const _ = DefaultTemporalLargestUnit(duration);
  if (_ === TemporalUnit.Second || _ === TemporalUnit.Millisecond || _ === TemporalUnit.Microsecond || _ === TemporalUnit.Nanosecond) {
    zeroMinutesAndHigher = true;
  }
  const secondsDuration = TimeDurationFromComponents(0, 0, duration.Seconds, duration.Milliseconds, duration.Microseconds, duration.Nanoseconds);
  if (secondsDuration !== 0 || zeroMinutesAndHigher || precision !== 'auto') {
    const secondsPart = Math.abs(Math.trunc(secondsDuration / 10e9)).toString();
    const subSecondsPart = FormatFractionalSeconds(Math.abs(secondsDuration % 10e9), precision);
    timePart += `${secondsPart + subSecondsPart}S`;
  }
  const signPart = sign < 0 ? '-' : '';
  let result = `${signPart}P${datePart}`;
  if (timePart !== '') {
    result += `T${timePart}`;
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurations */
export function* AddDurations(
  operation: 'add' | 'subtract',
  duration: TemporalDurationObject,
  _other: Value,
): ValueEvaluator<TemporalDurationObject> {
  const other = Q(yield* ToTemporalDuration(_other));
  if (operation === 'subtract') {
    _other = CreateNegatedTemporalDuration(other);
  }
  const largestUnit1 = DefaultTemporalLargestUnit(duration);
  const largestUnit2 = DefaultTemporalLargestUnit(other);
  const largestUnit = LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);
  if (IsCalendarUnit(largestUnit)) {
    return surroundingAgent.Throw('RangeError', 'InvalidDuration');
  }
  const d1 = ToInternalDurationRecordWith24HourDays(duration);
  const d2 = ToInternalDurationRecordWith24HourDays(other);
  const timeResult = Q(AddTimeDuration(d1.Time, d2.Time));
  const result = CombineDateAndTimeDuration(ZeroDateDuration(), timeResult);
  return Q(yield* TemporalDurationFromInternal(result, largestUnit));
}
