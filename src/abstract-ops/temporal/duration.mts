import { __ts_cast__ } from '../../utils/language.mts';
import { type TemporalDurationObject, isTemporalDurationObject } from '../../intrinsics/Temporal/Duration.mts';
import { type TemporalPlainDateObject } from '../../intrinsics/Temporal/PlainDate.mts';
import { type ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { ParseTemporalDurationString } from '../../parser/TemporalParser.mts';
import {
  abs, floorDiv, modulo, remainder, truncateDiv,
} from '../math.mts';
import { Decimal } from '../../host-defined/decimal.mts';
import {
  type TimeZoneIdentifier, GetUTCEpochNanoseconds, RoundingMode, SnapToInteger,
} from './addition.mts';
import { CalendarDateAdd, type CalendarType, CalendarDateUntil } from './calendar.mts';
import {
  TemporalUnit, TemporalUnitCategory, RoundNumberToIncrement, ISODateToEpochDays, type TimeUnit, Table21_LengthInNanoSeconds, type DateUnit, GetUnsignedRoundingMode, ApplyUnsignedRoundingMode, IsCalendarUnit, __IsTimeUnit, LargerOfTwoTemporalUnits, __IsDateUnit, FormatFractionalSeconds,
  type Float64RepresentableInteger,
  type EpochNanoseconds,
} from './temporal.mts';
import { GetEpochNanosecondsFor } from './time-zone.mts';
import {
  X, type ValueEvaluator, Assert, type PlainCompletion, surroundingAgent, Value, ObjectValue, JSStringValue, type Mutable, Q, type PlainEvaluator, Get, type FunctionObject, OrdinaryCreateFromConstructor, HoursPerDay,
  nsPerDay,
  AddDaysToISODate,
  CombineISODateAndTimeRecord,
  Throw,
  type Integer,
  type MathematicalValue,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-temporal-date-duration-records */
export interface DateDurationRecord {
  readonly Years: Float64RepresentableInteger;
  readonly Months: Float64RepresentableInteger;
  readonly Weeks: Float64RepresentableInteger;
  Days: Float64RepresentableInteger;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-partial-duration-records */
export interface PartialDurationRecord {
  readonly Years: Float64RepresentableInteger | undefined;
  readonly Months: Float64RepresentableInteger | undefined;
  readonly Weeks: Float64RepresentableInteger | undefined;
  readonly Days: Float64RepresentableInteger | undefined;
  readonly Hours: Float64RepresentableInteger | undefined;
  readonly Minutes: Float64RepresentableInteger | undefined;
  readonly Seconds: Float64RepresentableInteger | undefined;
  readonly Milliseconds: Float64RepresentableInteger | undefined;
  readonly Microseconds: Float64RepresentableInteger | undefined;
  readonly Nanoseconds: Float64RepresentableInteger | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export interface InternalDurationRecord {
  readonly Date: DateDurationRecord;
  readonly Time: TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export type TimeDuration = Integer & { specName?: 'TimeDuration' };

/** https://tc39.es/proposal-temporal/#sec-temporal-zerodateduration */
export function ZeroDateDuration(): DateDurationRecord {
  return X(CreateDateDurationRecord(0n, 0n, 0n, 0n));
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
  const dateDuration = X(CreateDateDurationRecord(duration.Years, duration.Months, duration.Weeks, 0n));
  return CombineDateAndTimeDuration(dateDuration, timeDuration);
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
  let nanoseconds = abs(internalDuration.Time);
  if (TemporalUnitCategory(largestUnit) === 'date') {
    microseconds = floorDiv(nanoseconds, 1000n);
    nanoseconds = modulo(nanoseconds, 1000n);
    milliseconds = floorDiv(microseconds, 1000n);
    microseconds = modulo(microseconds, 1000n);
    seconds = floorDiv(milliseconds, 1000n);
    milliseconds = modulo(milliseconds, 1000n);
    minutes = floorDiv(seconds, 60n);
    seconds = modulo(seconds, 60n);
    hours = floorDiv(minutes, 60n);
    minutes = modulo(minutes, 60n);
    days = floorDiv(hours, 24n);
    hours = modulo(hours, 24n);
  } else if (largestUnit === TemporalUnit.Hour) {
    microseconds = floorDiv(nanoseconds, 1000n);
    nanoseconds = modulo(nanoseconds, 1000n);
    milliseconds = floorDiv(microseconds, 1000n);
    microseconds = modulo(microseconds, 1000n);
    seconds = floorDiv(milliseconds, 1000n);
    milliseconds = modulo(milliseconds, 1000n);
    minutes = floorDiv(seconds, 60n);
    seconds = modulo(seconds, 60n);
    hours = floorDiv(minutes, 60n);
    minutes = modulo(minutes, 60n);
  } else if (largestUnit === TemporalUnit.Minute) {
    microseconds = floorDiv(nanoseconds, 1000n);
    nanoseconds = modulo(nanoseconds, 1000n);
    milliseconds = floorDiv(microseconds, 1000n);
    microseconds = modulo(microseconds, 1000n);
    seconds = floorDiv(milliseconds, 1000n);
    milliseconds = modulo(milliseconds, 1000n);
    minutes = floorDiv(seconds, 60n);
    seconds = modulo(seconds, 60n);
  } else if (largestUnit === TemporalUnit.Second) {
    microseconds = floorDiv(nanoseconds, 1000n);
    nanoseconds = modulo(nanoseconds, 1000n);
    milliseconds = floorDiv(microseconds, 1000n);
    microseconds = modulo(microseconds, 1000n);
    seconds = floorDiv(milliseconds, 1000n);
    milliseconds = modulo(milliseconds, 1000n);
  } else if (largestUnit === TemporalUnit.Millisecond) {
    microseconds = floorDiv(nanoseconds, 1000n);
    nanoseconds = modulo(nanoseconds, 1000n);
    milliseconds = floorDiv(microseconds, 1000n);
    microseconds = modulo(microseconds, 1000n);
  } else if (largestUnit === TemporalUnit.Microsecond) {
    microseconds = floorDiv(nanoseconds, 1000n);
    nanoseconds = modulo(nanoseconds, 1000n);
  } else {
    Assert(largestUnit === TemporalUnit.Nanosecond);
  }
  return CreateTemporalDuration(BigInt(internalDuration.Date.Years), BigInt(internalDuration.Date.Months), BigInt(internalDuration.Date.Weeks), BigInt(internalDuration.Date.Days) + days * sign, hours * sign, minutes * sign, seconds * sign, milliseconds * sign, microseconds * sign, nanoseconds * sign);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createdatedurationrecord */
export function CreateDateDurationRecord(years: Integer, months: Integer, weeks: Integer, days: Integer): PlainCompletion<DateDurationRecord> {
  if (!IsValidDuration(years, months, weeks, days, 0n, 0n, 0n, 0n, 0n, 0n)) {
    return Throw.RangeError('Duration($1, $2, $3, $4) is not a valid duration', years, months, weeks, days);
  }
  return {
    Years: Number(years),
    Months: Number(months),
    Weeks: Number(weeks),
    Days: Number(days),
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-adjustdatedurationrecord */
export function AdjustDateDurationRecord(
  dateDuration: DateDurationRecord,
  days: Integer,
  weeks?: Integer,
  months?: Integer,
): PlainCompletion<DateDurationRecord> {
  weeks ??= BigInt(dateDuration.Weeks);
  months ??= BigInt(dateDuration.Months);
  return CreateDateDurationRecord(BigInt(dateDuration.Years), months, weeks, days);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-combinedateandtimeduration */
export function CombineDateAndTimeDuration(dateDuration: DateDurationRecord, timeDuration: TimeDuration): InternalDurationRecord {
  const dateSign = DateDurationSign(dateDuration);
  const timeSign = TimeDurationSign(timeDuration);
  if (dateSign !== 0n && timeSign !== 0n) {
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
      return Throw.TypeError('Cannot convert $1 to Temporal.Duration', item);
    }
    return yield* ParseTemporalDurationString(item.stringValue());
  }
  const result = {
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
  } satisfies Mutable<PartialDurationRecord>;
  const partial = Q(yield* ToPartialDurationRecord(item));
  if (partial.Years !== undefined) result.Years = partial.Years;
  if (partial.Months !== undefined) result.Months = partial.Months;
  if (partial.Weeks !== undefined) result.Weeks = partial.Weeks;
  if (partial.Days !== undefined) result.Days = partial.Days;
  if (partial.Hours !== undefined) result.Hours = partial.Hours;
  if (partial.Minutes !== undefined) result.Minutes = partial.Minutes;
  if (partial.Seconds !== undefined) result.Seconds = partial.Seconds;
  if (partial.Milliseconds !== undefined) result.Milliseconds = partial.Milliseconds;
  if (partial.Microseconds !== undefined) result.Microseconds = partial.Microseconds;
  if (partial.Nanoseconds !== undefined) result.Nanoseconds = partial.Nanoseconds;
  return yield* CreateTemporalDuration(BigInt(result.Years), BigInt(result.Months), BigInt(result.Weeks), BigInt(result.Days), BigInt(result.Hours), BigInt(result.Minutes), BigInt(result.Seconds), BigInt(result.Milliseconds), BigInt(result.Microseconds), BigInt(result.Nanoseconds));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-durationsign */
export function DurationSign(duration: TemporalDurationObject): -1 | 0 | 1 {
  if (duration.Years < 0) return -1;
  if (duration.Years > 0) return 1;
  if (duration.Months < 0) return -1;
  if (duration.Months > 0) return 1;
  if (duration.Weeks < 0) return -1;
  if (duration.Weeks > 0) return 1;
  if (duration.Days < 0) return -1;
  if (duration.Days > 0) return 1;
  if (duration.Hours < 0) return -1;
  if (duration.Hours > 0) return 1;
  if (duration.Minutes < 0) return -1;
  if (duration.Minutes > 0) return 1;
  if (duration.Seconds < 0) return -1;
  if (duration.Seconds > 0) return 1;
  if (duration.Milliseconds < 0) return -1;
  if (duration.Milliseconds > 0) return 1;
  if (duration.Microseconds < 0) return -1;
  if (duration.Microseconds > 0) return 1;
  if (duration.Nanoseconds < 0) return -1;
  if (duration.Nanoseconds > 0) return 1;
  return 0;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationsign */
export function DateDurationSign(dateDuration: DateDurationRecord): -1n | 0n | 1n {
  if (dateDuration.Years < 0) return -1n;
  if (dateDuration.Years > 0) return 1n;
  if (dateDuration.Months < 0) return -1n;
  if (dateDuration.Months > 0) return 1n;
  if (dateDuration.Weeks < 0) return -1n;
  if (dateDuration.Weeks > 0) return 1n;
  if (dateDuration.Days < 0) return -1n;
  if (dateDuration.Days > 0) return 1n;
  return 0n;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internaldurationsign */
export function InternalDurationSign(internalDuration: InternalDurationRecord): -1n | 0n | 1n {
  const dateSign = DateDurationSign(internalDuration.Date);
  if (dateSign !== 0n) {
    return dateSign;
  }
  return TimeDurationSign(internalDuration.Time);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidduration */
export function IsValidDuration(
  years: Integer,
  months: Integer,
  weeks: Integer,
  days: Integer,
  hours: Integer,
  minutes: Integer,
  seconds: Integer,
  milliseconds: Integer,
  microseconds: Integer,
  nanoseconds: Integer,
): boolean {
  let sign = 0;
  for (const v of [years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds]) {
    // Assert: 𝔽(v) is finite.
    if (v < 0) {
      if (sign > 0) return false;
      sign = -1;
    } else if (v > 0) {
      if (sign < 0) return false;
      sign = 1;
    }
  }
  if (abs(years) >= 2 ** 32) return false;
  if (abs(months) >= 2 ** 32) return false;
  if (abs(weeks) >= 2 ** 32) return false;
  const b1e9 = BigInt(1e9);
  // 6. Let normalizedNanoseconds be days × 86,400 × 10**9 + hours × 3600 × 10**9 + minutes × 60 × 10**9 + seconds × 10**9 + ℝ(𝔽(milliseconds)) × 10**6 + ℝ(𝔽(microseconds)) × 10**3 + ℝ(𝔽(nanoseconds)).
  // If abs(normalizedNanoseconds) ≥ 2**53, return false.
  const normalizedNanoseconds = days * 86400n * b1e9 + hours * 3600n * b1e9 + minutes * 60n * b1e9 + seconds * b1e9 + BigInt(Number(milliseconds)) * BigInt(1e6) + BigInt(Number(microseconds)) * BigInt(1e3) + BigInt(Number(nanoseconds));
  if (abs(normalizedNanoseconds) >= BigInt(1e9) * (2n ** 53n)) return false;
  return true;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-defaulttemporallargestunit */
export function DefaultTemporalLargestUnit(duration: TemporalDurationObject): TemporalUnit {
  if (duration.Years !== 0n) return TemporalUnit.Year;
  if (duration.Months !== 0n) return TemporalUnit.Month;
  if (duration.Weeks !== 0n) return TemporalUnit.Week;
  if (duration.Days !== 0n) return TemporalUnit.Day;
  if (duration.Hours !== 0n) return TemporalUnit.Hour;
  if (duration.Minutes !== 0n) return TemporalUnit.Minute;
  if (duration.Seconds !== 0n) return TemporalUnit.Second;
  if (duration.Milliseconds !== 0n) return TemporalUnit.Millisecond;
  if (duration.Microseconds !== 0n) return TemporalUnit.Microsecond;
  return TemporalUnit.Nanosecond;
}

/** https://tc39.es/ecma262/pr/3759/#sec-topartialdurationrecord */
export function* ToPartialDurationRecord(temporalDurationLike: Value): PlainEvaluator<PartialDurationRecord> {
  if (!(temporalDurationLike instanceof ObjectValue)) {
    return Throw.TypeError('Cannot convert $1 to TemporalPartialDurationRecord', temporalDurationLike);
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
    result.Days = Number(Q(yield* SnapToInteger(days, 'strict')));
  }
  const hours = Q(yield* Get(temporalDurationLike, Value('hours')));
  if (hours !== Value.undefined) {
    result.Hours = Number(Q(yield* SnapToInteger(hours, 'strict')));
  }
  const microseconds = Q(yield* Get(temporalDurationLike, Value('microseconds')));
  if (microseconds !== Value.undefined) {
    result.Microseconds = Number(Q(yield* SnapToInteger(microseconds, 'strict')));
  }
  const milliseconds = Q(yield* Get(temporalDurationLike, Value('milliseconds')));
  if (milliseconds !== Value.undefined) {
    result.Milliseconds = Number(Q(yield* SnapToInteger(milliseconds, 'strict')));
  }
  const minutes = Q(yield* Get(temporalDurationLike, Value('minutes')));
  if (minutes !== Value.undefined) {
    result.Minutes = Number(Q(yield* SnapToInteger(minutes, 'strict')));
  }
  const months = Q(yield* Get(temporalDurationLike, Value('months')));
  if (months !== Value.undefined) {
    result.Months = Number(Q(yield* SnapToInteger(months, 'strict')));
  }
  const nanoseconds = Q(yield* Get(temporalDurationLike, Value('nanoseconds')));
  if (nanoseconds !== Value.undefined) {
    result.Nanoseconds = Number(Q(yield* SnapToInteger(nanoseconds, 'strict')));
  }
  const seconds = Q(yield* Get(temporalDurationLike, Value('seconds')));
  if (seconds !== Value.undefined) {
    result.Seconds = Number(Q(yield* SnapToInteger(seconds, 'strict')));
  }
  const weeks = Q(yield* Get(temporalDurationLike, Value('weeks')));
  if (weeks !== Value.undefined) {
    result.Weeks = Number(Q(yield* SnapToInteger(weeks, 'strict')));
  }
  const years = Q(yield* Get(temporalDurationLike, Value('years')));
  if (years !== Value.undefined) {
    result.Years = Number(Q(yield* SnapToInteger(years, 'strict')));
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
    return Throw.TypeError('Invalid duration');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalduration */
export function* CreateTemporalDuration(
  years: Integer,
  months: Integer,
  weeks: Integer,
  days: Integer,
  hours: Integer,
  minutes: Integer,
  seconds: Integer,
  milliseconds: Integer,
  microseconds: Integer,
  nanoseconds: Integer,
  newTarget?: FunctionObject,
): ValueEvaluator<TemporalDurationObject> {
  if (!IsValidDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds)) {
    return Throw.RangeError('Invalid duration');
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
  object.Years = BigInt(Number(years));
  object.Months = BigInt(Number(months));
  object.Weeks = BigInt(Number(weeks));
  object.Days = BigInt(Number(days));
  object.Hours = BigInt(Number(hours));
  object.Minutes = BigInt(Number(minutes));
  object.Seconds = BigInt(Number(seconds));
  object.Milliseconds = BigInt(Number(milliseconds));
  object.Microseconds = BigInt(Number(microseconds));
  object.Nanoseconds = BigInt(Number(nanoseconds));
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
  hours: Integer,
  minutes: Integer,
  seconds: Integer,
  milliseconds: Integer,
  microseconds: Integer,
  nanoseconds: Integer,
): TimeDuration {
  minutes += hours * 60n;
  seconds += minutes * 60n;
  milliseconds += seconds * 1000n;
  microseconds += milliseconds * 1000n;
  nanoseconds += microseconds * 1000n;
  Assert(abs(nanoseconds) <= maxTimeDuration);
  return nanoseconds;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimeduration */
export function AddTimeDuration(one: TimeDuration, two: TimeDuration): PlainCompletion<TimeDuration> {
  const result = one + two;
  if (abs(result) > maxTimeDuration) {
    return Throw.RangeError('Invalid duration');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-add24hourdaystotimeduration */
export function Add24HourDaysToTimeDuration(d: TimeDuration, days: Integer): PlainCompletion<TimeDuration> {
  const result = BigInt(d) + BigInt(days) * BigInt(nsPerDay);
  if (abs(result) > maxTimeDuration) {
    return Throw.RangeError('Invalid duration');
  }
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimedurationtoepochnanoseconds */
export function AddTimeDurationToEpochNanoseconds(d: TimeDuration, epochNs: EpochNanoseconds): EpochNanoseconds {
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
export function TimeDurationFromEpochNanosecondsDifference(one: EpochNanoseconds, two: EpochNanoseconds): TimeDuration {
  const result = one - two;
  Assert(abs(result) <= maxTimeDuration);
  return result;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimedurationtoincrement */
export function RoundTimeDurationToIncrement(
  d: TimeDuration,
  increment: Integer,
  roundingMode: RoundingMode,
): PlainCompletion<TimeDuration> {
  const rounded = RoundNumberToIncrement(Decimal(d), increment, roundingMode);
  if (abs(rounded) > maxTimeDuration) {
    return Throw.RangeError('Invalid duration');
  }
  return rounded;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationsign */
export function TimeDurationSign(d: TimeDuration): -1n | 0n | 1n {
  if (d < 0) {
    return -1n;
  }
  if (d > 0) {
    return 1n;
  }
  return 0n;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationdays */
export function DateDurationDays(dateDuration: DateDurationRecord, plainRelativeTo: TemporalPlainDateObject): PlainCompletion<Integer> {
  const yearsMonthsWeeksDuration = X(AdjustDateDurationRecord(dateDuration, 0n));
  if (DateDurationSign(yearsMonthsWeeksDuration) === 0n) {
    return BigInt(dateDuration.Days);
  }
  const later = Q(CalendarDateAdd(plainRelativeTo.Calendar, plainRelativeTo.ISODate, yearsMonthsWeeksDuration, 'constrain'));
  const epochDays1 = ISODateToEpochDays(plainRelativeTo.ISODate.Year, plainRelativeTo.ISODate.Month - 1n, plainRelativeTo.ISODate.Day);
  const epochDays2 = ISODateToEpochDays(later.Year, later.Month - 1n, later.Day);
  const yearsMonthsWeeksInDays = epochDays2 - epochDays1;
  return BigInt(dateDuration.Days) + yearsMonthsWeeksInDays;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimeduration */
export function RoundTimeDuration(
  timeDuration: TimeDuration,
  increment: Integer,
  unit: TimeUnit,
  roundingMode: RoundingMode,
): PlainCompletion<TimeDuration> {
  const divisor = Table21_LengthInNanoSeconds[unit];
  return RoundTimeDurationToIncrement(timeDuration, divisor * increment, roundingMode);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totaltimeduration */
export function TotalTimeDuration(timeDuration: TimeDuration, unit: TimeUnit | TemporalUnit.Day): MathematicalValue {
  const divisor = Table21_LengthInNanoSeconds[unit];
  // 2. NOTE: The following step cannot be implemented directly using floating-point arithmetic when 𝔽(timeDuration) is not a safe integer. The division can be implemented in C++ with the __float128 type if the compiler supports it, or with software emulation such as in the SoftFP library.
  return Decimal(timeDuration).divide(divisor);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-duration-nudge-result-records */
export interface DurationNudgeResultRecord {
  readonly Duration: InternalDurationRecord;
  readonly NudgedEpochNs: EpochNanoseconds;
  readonly DidExpandCalendarUnit: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-computenudgewindow */
export function ComputeNudgeWindow(
  sign: -1n | 1n,
  duration: InternalDurationRecord,
  originEpochNs: EpochNanoseconds,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  increment: Integer,
  unit: DateUnit,
  additionalShift: boolean,
): PlainCompletion<{
  R1: MathematicalValue;
  R2: MathematicalValue;
  StartEpochNs: EpochNanoseconds;
  EndEpochNs: EpochNanoseconds;
  StartDuration: InternalDurationRecord;
  EndDuration: InternalDurationRecord;
}> {
  let r1: MathematicalValue;
  let r2: MathematicalValue;
  let startDateDuration;
  let endDateDuration;
  if (unit === TemporalUnit.Year) {
    const years = RoundNumberToIncrement(Decimal(duration.Date.Years), increment, RoundingMode.Trunc);
    if (!additionalShift) {
      r1 = Decimal(years);
    } else {
      r1 = Decimal(years + increment * sign);
    }
    r2 = r1.add(increment * sign);
    startDateDuration = Q(CreateDateDurationRecord(r1.toBigInt(), 0n, 0n, 0n));
    endDateDuration = Q(CreateDateDurationRecord(r2.toBigInt(), 0n, 0n, 0n));
  } else if (unit === TemporalUnit.Month) {
    const months = RoundNumberToIncrement(Decimal(duration.Date.Months), increment, RoundingMode.Trunc);
    if (!additionalShift) {
      r1 = Decimal(months);
    } else {
      r1 = Decimal(months + increment * sign);
    }
    r2 = r1.add(increment * sign);
    startDateDuration = Q(AdjustDateDurationRecord(duration.Date, 0n, 0n, r1.toBigInt()));
    endDateDuration = Q(AdjustDateDurationRecord(duration.Date, 0n, 0n, r2.toBigInt()));
  } else if (unit === TemporalUnit.Week) {
    const yearsMonths = X(AdjustDateDurationRecord(duration.Date, 0n, 0n));
    const weeksStart = Q(CalendarDateAdd(calendar, isoDateTime.ISODate, yearsMonths, 'constrain'));
    const weeksEnd = AddDaysToISODate(weeksStart, BigInt(duration.Date.Days));
    const untilResult = CalendarDateUntil(calendar, weeksStart, weeksEnd, TemporalUnit.Week);
    const weeks = RoundNumberToIncrement(Decimal(duration.Date.Weeks + untilResult.Weeks), increment, RoundingMode.Trunc);
    r1 = Decimal(weeks);
    r2 = r1.add(increment * sign);
    startDateDuration = Q(AdjustDateDurationRecord(duration.Date, 0n, r1.toBigInt()));
    endDateDuration = Q(AdjustDateDurationRecord(duration.Date, 0n, r2.toBigInt()));
  } else {
    Assert(unit === TemporalUnit.Day);
    const days = RoundNumberToIncrement(Decimal(duration.Date.Days), increment, RoundingMode.Trunc);
    r1 = Decimal(days);
    r2 = r1.add(increment * sign);
    startDateDuration = Q(AdjustDateDurationRecord(duration.Date, r1.toBigInt()));
    endDateDuration = Q(AdjustDateDurationRecord(duration.Date, r2.toBigInt()));
  }
  if (sign === 1n) Assert(r1.greaterThanOrEqual(0) && r1.lessThan(r2));
  if (sign === -1n) Assert(r1.lessThanOrEqual(0) && r1.greaterThan(r2));
  let startEpochNs;
  if (r1.equals(0)) {
    startEpochNs = originEpochNs;
  } else {
    const start = Q(CalendarDateAdd(calendar, isoDateTime.ISODate, startDateDuration, 'constrain'));
    const startDateTime = CombineISODateAndTimeRecord(start, isoDateTime.Time);
    if (timeZone === undefined) {
      startEpochNs = GetUTCEpochNanoseconds(startDateTime);
    } else {
      startEpochNs = Q(GetEpochNanosecondsFor(timeZone, startDateTime, 'compatible'));
    }
  }
  const end = Q(CalendarDateAdd(calendar, isoDateTime.ISODate, endDateDuration, 'constrain'));
  const endDateTime = CombineISODateAndTimeRecord(end, isoDateTime.Time);
  let endEpochNs;
  if (timeZone === undefined) {
    endEpochNs = GetUTCEpochNanoseconds(endDateTime);
  } else {
    endEpochNs = Q(GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible'));
  }
  const startDuration = CombineDateAndTimeDuration(startDateDuration, 0n);
  const endDuration = CombineDateAndTimeDuration(endDateDuration, 0n);
  return {
    R1: r1,
    R2: r2,
    StartEpochNs: startEpochNs,
    EndEpochNs: endEpochNs,
    StartDuration: startDuration,
    EndDuration: endDuration,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetocalendarunit */
export function NudgeToCalendarUnit(
  sign: -1n | 1n,
  duration: InternalDurationRecord,
  originEpochNs: EpochNanoseconds,
  destEpochNs: EpochNanoseconds,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  increment: Integer,
  unit: DateUnit,
  roundingMode: RoundingMode,
): PlainCompletion<{ NudgeResult: DurationNudgeResultRecord; Total: MathematicalValue }> {
  let didExpandCalendarUnit = false;
  let nudgeWindow = Q(ComputeNudgeWindow(sign, duration, originEpochNs, isoDateTime, timeZone, calendar, increment, unit, false));
  let startEpochNs = nudgeWindow.StartEpochNs;
  let endEpochNs = nudgeWindow.EndEpochNs;
  if (sign === 1n) {
    if (!(startEpochNs <= destEpochNs && destEpochNs <= endEpochNs)) {
      nudgeWindow = Q(ComputeNudgeWindow(sign, duration, originEpochNs, isoDateTime, timeZone, calendar, increment, unit, true));
      Assert(nudgeWindow.StartEpochNs <= destEpochNs && destEpochNs <= nudgeWindow.EndEpochNs);
      didExpandCalendarUnit = true;
    }
  } else if (!(endEpochNs <= destEpochNs && destEpochNs <= startEpochNs)) {
    nudgeWindow = Q(ComputeNudgeWindow(sign, duration, originEpochNs, isoDateTime, timeZone, calendar, increment, unit, true));
    Assert(nudgeWindow.EndEpochNs <= destEpochNs && destEpochNs <= nudgeWindow.StartEpochNs);
    didExpandCalendarUnit = true;
  }
  const r1 = nudgeWindow.R1;
  const r2 = nudgeWindow.R2;
  startEpochNs = nudgeWindow.StartEpochNs;
  endEpochNs = nudgeWindow.EndEpochNs;
  const startDuration = nudgeWindow.StartDuration;
  const endDuration = nudgeWindow.EndDuration;
  Assert(startEpochNs !== endEpochNs);
  const progress = Decimal(destEpochNs - startEpochNs).divide(endEpochNs - startEpochNs);
  const total = r1.add(progress.multiply(increment * sign));
  // 16. NOTE: The above two steps cannot be implemented directly using floating-point arithmetic. This division can be implemented as if expressing total as the quotient of two time durations (which may not be safe integers), performing all other calculations before the division, and finally performing one division operation with a floating-point result for total. The division can be implemented in C++ with the __float128 type if the compiler supports it, or with software emulation such as in the SoftFP library.
  Assert(progress.greaterThanOrEqual(0) && progress.lessThanOrEqual(1));
  const isNegative = sign < 0 ? 'negative' : 'positive';
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, isNegative);
  let roundedUnit: MathematicalValue;
  if (progress.equals(1)) {
    roundedUnit = r2.abs();
  } else {
    Assert(r1.abs().lessThanOrEqual(total.abs()) && total.abs().lessThanOrEqual(r2.abs()));
    roundedUnit = ApplyUnsignedRoundingMode(total.abs(), r1.abs(), r2.abs(), unsignedRoundingMode);
  }
  let resultDuration: InternalDurationRecord;
  let nudgedEpochNs;
  if (roundedUnit.equals(r2.abs())) {
    didExpandCalendarUnit = true;
    resultDuration = endDuration;
    nudgedEpochNs = endEpochNs;
  } else {
    resultDuration = startDuration;
    nudgedEpochNs = startEpochNs;
  }
  const nudgeResult: DurationNudgeResultRecord = {
    Duration: resultDuration,
    NudgedEpochNs: nudgedEpochNs,
    DidExpandCalendarUnit: didExpandCalendarUnit,
  };
  return { NudgeResult: nudgeResult, Total: total };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetozonedtime */
export function NudgeToZonedTime(
  sign: -1n | 1n,
  duration: InternalDurationRecord,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier,
  calendar: CalendarType,
  increment: Integer,
  unit: TimeUnit,
  roundingMode: RoundingMode,
): PlainCompletion<DurationNudgeResultRecord> {
  const start = Q(CalendarDateAdd(calendar, isoDateTime.ISODate, duration.Date, 'constrain'));
  const startDateTime = CombineISODateAndTimeRecord(start, isoDateTime.Time);
  const endDate = AddDaysToISODate(start, sign);
  const endDateTime = CombineISODateAndTimeRecord(endDate, isoDateTime.Time);
  const startEpochNs = Q(GetEpochNanosecondsFor(timeZone, startDateTime, 'compatible'));
  const endEpochNs = Q(GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible'));
  const daySpan = TimeDurationFromEpochNanosecondsDifference(endEpochNs, startEpochNs);
  Assert(TimeDurationSign(daySpan) === sign);
  const unitLength = Table21_LengthInNanoSeconds[unit];
  let roundedTimeDuration = Q(RoundTimeDurationToIncrement(duration.Time, increment * unitLength, roundingMode));
  const beyondDaySpan = X(AddTimeDuration(roundedTimeDuration, -daySpan));
  let didRoundBeyondDay;
  let dayDelta: Integer;
  let nudgedEpochNs;
  if (TimeDurationSign(beyondDaySpan) !== -sign) {
    didRoundBeyondDay = true;
    dayDelta = sign;
    roundedTimeDuration = Q(RoundTimeDurationToIncrement(beyondDaySpan, increment * unitLength, roundingMode));
    nudgedEpochNs = AddTimeDurationToEpochNanoseconds(roundedTimeDuration, endEpochNs);
  } else {
    didRoundBeyondDay = false;
    dayDelta = 0n;
    nudgedEpochNs = AddTimeDurationToEpochNanoseconds(roundedTimeDuration, startEpochNs);
  }
  const dateDuration = X(AdjustDateDurationRecord(duration.Date, BigInt(duration.Date.Days) + dayDelta));
  const resultDuration = CombineDateAndTimeDuration(dateDuration, roundedTimeDuration);
  return {
    Duration: resultDuration,
    NudgedEpochNs: nudgedEpochNs,
    DidExpandCalendarUnit: didRoundBeyondDay,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetodayortime */
export function NudgeToDayOrTime(
  duration: InternalDurationRecord,
  destEpochNs: EpochNanoseconds,
  largestUnit: TemporalUnit,
  increment: Integer,
  smallestUnit: TimeUnit | TemporalUnit.Day,
  roundingMode: RoundingMode,
): PlainCompletion<DurationNudgeResultRecord> {
  const timeDuration = X(Add24HourDaysToTimeDuration(duration.Time, BigInt(duration.Date.Days)));
  const unitLength = Table21_LengthInNanoSeconds[smallestUnit];
  const roundedTime = Q(RoundTimeDurationToIncrement(timeDuration, unitLength * increment, roundingMode));
  const diffTime = X(AddTimeDuration(roundedTime, -timeDuration));
  const wholeDays = TotalTimeDuration(timeDuration, TemporalUnit.Day).truncate().toBigInt();
  const roundedWholeDays = TotalTimeDuration(roundedTime, TemporalUnit.Day).truncate().toBigInt();
  const dayDelta = roundedWholeDays - wholeDays;
  let dayDeltaSign: -1n | 0n | 1n;
  if (dayDelta < 0) dayDeltaSign = -1n;
  else if (dayDelta > 0) dayDeltaSign = 1n;
  else dayDeltaSign = 0n;
  const didExpandDays = dayDeltaSign === TimeDurationSign(timeDuration);
  const nudgedEpochNs = AddTimeDurationToEpochNanoseconds(diffTime, destEpochNs);
  let days = 0n;
  let remainder = roundedTime;
  if (TemporalUnitCategory(largestUnit) === 'date') {
    days = roundedWholeDays;
    remainder = X(AddTimeDuration(roundedTime, TimeDurationFromComponents(-roundedWholeDays * BigInt(HoursPerDay), 0n, 0n, 0n, 0n, 0n)));
  }
  const dateDuration = X(AdjustDateDurationRecord(duration.Date, days));
  const resultDuration = CombineDateAndTimeDuration(dateDuration, remainder);
  return {
    Duration: resultDuration,
    NudgedEpochNs: nudgedEpochNs,
    DidExpandCalendarUnit: didExpandDays,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-bubblerelativeduration */
export function BubbleRelativeDuration(
  sign: -1n | 1n,
  duration: InternalDurationRecord,
  nudgedEpochNs: EpochNanoseconds,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
  smallestUnit: DateUnit,
): PlainCompletion<InternalDurationRecord> {
  if (smallestUnit === largestUnit) {
    return duration;
  }
  const order = [
    TemporalUnit.Year,
    TemporalUnit.Month,
    TemporalUnit.Week,
    TemporalUnit.Day,
  ];
  const largestUnitIndex = order.indexOf(largestUnit);
  const smallestUnitIndex = order.indexOf(smallestUnit);
  let unitIndex = smallestUnitIndex - 1;
  let done = false;
  while (unitIndex >= largestUnitIndex && !done) {
    const unit = order[unitIndex];
    if (unit !== TemporalUnit.Week || largestUnit === TemporalUnit.Week) {
      let endDuration: DateDurationRecord;
      if (unit === TemporalUnit.Year) {
        const years = BigInt(duration.Date.Years) + sign;
        endDuration = Q(CreateDateDurationRecord(years, 0n, 0n, 0n));
      } else if (unit === TemporalUnit.Month) {
        const months = BigInt(duration.Date.Months) + sign;
        endDuration = Q(AdjustDateDurationRecord(duration.Date, 0n, 0n, months));
      } else {
        Assert(unit === TemporalUnit.Week);
        const weeks = BigInt(duration.Date.Weeks) + sign;
        endDuration = Q(AdjustDateDurationRecord(duration.Date, 0n, weeks));
      }
      const end = Q(CalendarDateAdd(calendar, isoDateTime.ISODate, endDuration, 'constrain'));
      const endDateTime = CombineISODateAndTimeRecord(end, isoDateTime.Time);
      let endEpochNs;
      if (timeZone === undefined) {
        endEpochNs = GetUTCEpochNanoseconds(endDateTime);
      } else {
        endEpochNs = Q(GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible'));
      }
      const beyondEnd = nudgedEpochNs - endEpochNs;
      let beyondEndSign: -1n | 0n | 1n;
      if (beyondEnd < 0) beyondEndSign = -1n;
      else if (beyondEnd > 0) beyondEndSign = 1n;
      else beyondEndSign = 0n;
      if (beyondEndSign !== -sign) {
        duration = CombineDateAndTimeDuration(endDuration, 0n);
      } else {
        done = true;
      }
    }
    unitIndex -= 1;
  }
  return duration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-roundrelativeduration */
export function RoundRelativeDuration(
  duration: InternalDurationRecord,
  originEpochNs: EpochNanoseconds,
  destEpochNs: EpochNanoseconds,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  largestUnit: TemporalUnit,
  increment: Integer,
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
  let sign: -1n | 1n;
  if (InternalDurationSign(duration) < 0) {
    sign = -1n;
  } else {
    sign = 1n;
  }
  let nudgeResult;
  if (irregularLengthUnit) {
    const record = Q(NudgeToCalendarUnit(sign, duration, originEpochNs, destEpochNs, isoDateTime, timeZone, calendar, increment, smallestUnit as DateUnit, roundingMode));
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
    Assert(__IsDateUnit(startUnit));
    duration = Q(BubbleRelativeDuration(sign, duration, nudgeResult.NudgedEpochNs, isoDateTime, timeZone, calendar, largestUnit, startUnit));
  }
  return duration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-totalrelativeduration */
export function TotalRelativeDuration(
  duration: InternalDurationRecord,
  originEpochNs: EpochNanoseconds,
  destEpochNs: EpochNanoseconds,
  isoDateTime: ISODateTimeRecord,
  timeZone: TimeZoneIdentifier | undefined,
  calendar: CalendarType,
  unit: TemporalUnit,
): PlainCompletion<MathematicalValue> {
  if (IsCalendarUnit(unit) || (timeZone !== undefined && unit === TemporalUnit.Day)) {
    let sign: -1n | 1n;
    if (InternalDurationSign(duration) < 0) sign = -1n;
    else sign = 1n;
    // https://github.com/tc39/proposal-temporal/issues/3131
    const record = Q(NudgeToCalendarUnit(sign, duration, originEpochNs, destEpochNs, isoDateTime, timeZone, calendar, 1n, unit, RoundingMode.Trunc));
    return record.Total;
  }
  __ts_cast__<Exclude<TemporalUnit, TemporalUnit.Day | TemporalUnit.Month | TemporalUnit.Week>>(unit);
  const timeDuration = X(Add24HourDaysToTimeDuration(duration.Time, BigInt(duration.Date.Days)));
  return TotalTimeDuration(timeDuration, unit);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationtostring */
export function TemporalDurationToString(
  duration: TemporalDurationObject,
  precision: Integer | 'auto',
): string {
  const sign = DurationSign(duration);
  let datePart = '';
  if (duration.Years !== 0n) {
    datePart += `${abs(duration.Years)}Y`;
  }
  if (duration.Months !== 0n) {
    datePart += `${abs(duration.Months)}M`;
  }
  if (duration.Weeks !== 0n) {
    datePart += `${abs(duration.Weeks)}W`;
  }
  if (duration.Days !== 0n) {
    datePart += `${abs(duration.Days)}D`;
  }
  let timePart = '';
  if (duration.Hours !== 0n) {
    timePart += `${abs(duration.Hours)}H`;
  }
  if (duration.Minutes !== 0n) {
    timePart += `${abs(duration.Minutes)}M`;
  }
  let zeroMinutesAndHigher = false;
  const _ = DefaultTemporalLargestUnit(duration);
  if (_ === TemporalUnit.Second || _ === TemporalUnit.Millisecond || _ === TemporalUnit.Microsecond || _ === TemporalUnit.Nanosecond) {
    zeroMinutesAndHigher = true;
  }
  const secondsDuration = TimeDurationFromComponents(0n, 0n, duration.Seconds, duration.Milliseconds, duration.Microseconds, duration.Nanoseconds);
  if (secondsDuration !== 0n || zeroMinutesAndHigher || precision !== 'auto') {
    const secondsPart = abs(truncateDiv(secondsDuration, BigInt(1e9))).toString();
    const subSecondsPart = FormatFractionalSeconds(abs(remainder(secondsDuration, BigInt(1e9))), precision);
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
  let other = Q(yield* ToTemporalDuration(_other));
  if (operation === 'subtract') {
    other = CreateNegatedTemporalDuration(other);
  }
  const largestUnit1 = DefaultTemporalLargestUnit(duration);
  const largestUnit2 = DefaultTemporalLargestUnit(other);
  const largestUnit = LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);
  if (IsCalendarUnit(largestUnit)) {
    return Throw.RangeError('Invalid duration');
  }
  const d1 = ToInternalDurationRecordWith24HourDays(duration);
  const d2 = ToInternalDurationRecordWith24HourDays(other);
  const timeResult = Q(AddTimeDuration(d1.Time, d2.Time));
  const result = CombineDateAndTimeDuration(ZeroDateDuration(), timeResult);
  return Q(yield* TemporalDurationFromInternal(result, largestUnit));
}/** https://tc39.es/proposal-temporal/#eqn-maxTimeDuration */

export const maxTimeDuration = 9007199254740991999999999n;
