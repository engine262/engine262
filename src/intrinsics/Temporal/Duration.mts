import { bootstrapConstructor } from '../bootstrap.mts';
import { __ts_cast__ } from '../../helpers.mts';
import { ToIntegerIfIntegral, GetOptionsObject } from '../../abstract-ops/temporal/addition.mts';
import { bootstrapTemporalDurationPrototype } from './DurationPrototype.mts';
import {
  ObjectValue, Q, Value, type OrdinaryObject, type ValueEvaluator,
  type Realm,
  type Arguments,
  type FunctionCallContext,
  F,
  UndefinedValue,
  Throw,
  Add24HourDaysToTimeDuration,
  CompareTimeDuration,
  CreateTemporalDuration,
  DateDurationDays,
  DefaultTemporalLargestUnit,
  ToInternalDurationRecord,
  ToTemporalDuration,
  GetTemporalRelativeToOption,
  IsCalendarUnit,
  TemporalUnitCategory,
  AddZonedDateTime,
} from '#self';

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

/** https://tc39.es/proposal-temporal/#sec-temporal.duration */
function* DurationConstructor([
  years = Value.undefined,
  months = Value.undefined,
  weeks = Value.undefined,
  days = Value.undefined,
  hours = Value.undefined,
  minutes = Value.undefined,
  seconds = Value.undefined,
  milliseconds = Value.undefined,
  microseconds = Value.undefined,
  nanoseconds = Value.undefined,
]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  if (NewTarget instanceof UndefinedValue) {
    return Throw.TypeError('Temporal.Duration constructor cannot be called without new');
  }
  const y = years instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(years));
  const mo = months instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(months));
  const w = weeks instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(weeks));
  const d = days instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(days));
  const h = hours instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(hours));
  const m = minutes instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(minutes));
  const s = seconds instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(seconds));
  const ms = milliseconds instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(milliseconds));
  const mis = microseconds instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(microseconds));
  const ns = nanoseconds instanceof UndefinedValue ? 0 : Q(yield* ToIntegerIfIntegral(nanoseconds));
  return Q(yield* CreateTemporalDuration(y, mo, w, d, h, m, s, ms, mis, ns, NewTarget));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.from */
function* Duration_From([item = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* ToTemporalDuration(item));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.duration.compare */
function* Duration_Compare([_one = Value.undefined, _two = Value.undefined, options = Value.undefined]: Arguments): ValueEvaluator {
  const one = Q(yield* ToTemporalDuration(_one));
  const two = Q(yield* ToTemporalDuration(_two));
  const resolvedOptions = Q(GetOptionsObject(options));
  const relativeToRecord = Q(yield* GetTemporalRelativeToOption(resolvedOptions));
  if (one.Years === two.Years
    && one.Months === two.Months
    && one.Weeks === two.Weeks
    && one.Days === two.Days
    && one.Hours === two.Hours
    && one.Minutes === two.Minutes
    && one.Seconds === two.Seconds
    && one.Milliseconds === two.Milliseconds
    && one.Microseconds === two.Microseconds
    && one.Nanoseconds === two.Nanoseconds) {
    return F(0);
  }
  const zonedRelativeTo = relativeToRecord.ZonedRelativeTo;
  const plainRelativeTo = relativeToRecord.PlainRelativeTo;
  const largestUnit1 = DefaultTemporalLargestUnit(one);
  const largestUnit2 = DefaultTemporalLargestUnit(two);
  const duration1 = ToInternalDurationRecord(one);
  const duration2 = ToInternalDurationRecord(two);
  if (zonedRelativeTo !== undefined
    && (TemporalUnitCategory(largestUnit1) === 'date' || TemporalUnitCategory(largestUnit2) === 'date')) {
    const timeZone = zonedRelativeTo.TimeZone;
    const calendar = zonedRelativeTo.Calendar;
    const after1 = Q(AddZonedDateTime(zonedRelativeTo.EpochNanoseconds, timeZone, calendar, duration1, 'constrain'));
    const after2 = Q(AddZonedDateTime(zonedRelativeTo.EpochNanoseconds, timeZone, calendar, duration2, 'constrain'));
    if (after1 > after2) return F(1);
    if (after1 < after2) return F(-1);
    return F(0);
  }
  let days1;
  let days2;
  if (IsCalendarUnit(largestUnit1) || IsCalendarUnit(largestUnit2)) {
    if (plainRelativeTo === undefined) {
      return Throw.RangeError('relativeTo option is required when comparing durations with calendar units');
    }
    days1 = Q(DateDurationDays(duration1.Date, plainRelativeTo));
    days2 = Q(DateDurationDays(duration2.Date, plainRelativeTo));
  } else {
    days1 = one.Days;
    days2 = two.Days;
  }
  const timeDuration1 = Q(Add24HourDaysToTimeDuration(duration1.Time, days1));
  const timeDuration2 = Q(Add24HourDaysToTimeDuration(duration2.Time, days2));
  return F(CompareTimeDuration(timeDuration1, timeDuration2));
}

export function bootstrapTemporalDuration(realmRec: Realm) {
  const prototype = bootstrapTemporalDurationPrototype(realmRec);

  const constructor = bootstrapConstructor(realmRec, DurationConstructor, 'Duration', 0, prototype, [
    ['from', Duration_From, 1],
    ['compare', Duration_Compare, 2],
  ]);
  realmRec.Intrinsics['%Temporal.Duration%'] = constructor;
  return constructor;
}
