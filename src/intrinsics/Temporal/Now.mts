import { type Realm, X, Value, ReturnIfAbrupt as Q, type Arguments, GetGlobalObject, ObjectValue, type PlainCompletion } from '#self';
import { SystemTimeZoneIdentifier } from '../../abstract-ops/temporal/addition.mts';
import { ToTemporalTimeZoneIdentifier, GetISODateTimeFor } from '../../abstract-ops/temporal/time-zone.mts';
import { bootstrapPrototype } from '../bootstrap.mts';
import { CreateTemporalInstant } from './Instant.mts';
import { CreateTemporalDateTime, type ISODateTimeRecord } from './PlainDateTime.mts';
import { CreateTemporalTime } from './PlainTime.mts';
import { CreateTemporalZonedDateTime } from './ZonedDateTime.mts';

/** https://tc39.es/proposal-temporal/#sec-temporal.now.timezoneid */
function TemporalNow_timeZoneId(): Value {
  return Value(SystemTimeZoneIdentifier());
}

/** https://tc39.es/proposal-temporal/#sec-temporal.now.instant */
function TemporalNow_instant(): Value {
  const ns = SystemUTCEpochNanoseconds();
  return X(CreateTemporalInstant(ns));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.now.plaindatetimeiso */
function TemporalNow_plainDateTimeISO([temporalTimeZoneLike = Value.undefined]: Arguments): Value {
  const isoDateTime = Q(SystemDateTime(temporalTimeZoneLike));
  return X(CreateTemporalDateTime(isoDateTime, "iso8601"));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.now.zoneddatetimeiso */
function TemporalNow_zonedDateTimeISO([temporalTimeZoneLike = Value.undefined]: Arguments): Value {
  let timeZone;
  if (temporalTimeZoneLike === Value.undefined) {
    timeZone = SystemTimeZoneIdentifier();
  } else {
    timeZone = Q(ToTemporalTimeZoneIdentifier(temporalTimeZoneLike));
  }
  const ns = SystemUTCEpochNanoseconds();
  return X(CreateTemporalZonedDateTime(ns, timeZone, "iso8601"));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.now.plaindateiso */
function TemporalNow_plainDateISO([temporalTimeZoneLike = Value.undefined]: Arguments): Value {
  const isoDateTime = Q(SystemDateTime(temporalTimeZoneLike));
  return X(CreateTemporalDateTime(isoDateTime, "iso8601"));
}

/** https://tc39.es/proposal-temporal/#sec-temporal.now.plaintimeiso */
function TemporalNow_plainTimeISO([temporalTimeZoneLike = Value.undefined]: Arguments): Value {
  const isoDateTime = Q(SystemDateTime(temporalTimeZoneLike));
  return X(CreateTemporalTime(isoDateTime.Time));
}

export function bootstrapTemporalNow(realmRec: Realm) {
  const Now = bootstrapPrototype(realmRec, [
    ['timeZoneId', TemporalNow_timeZoneId, 0],
    ['instant', TemporalNow_instant, 0],
    ['plainDateTimeISO', TemporalNow_plainDateTimeISO, 0],
    ['zonedDateTimeISO', TemporalNow_zonedDateTimeISO, 0],
    ['plainDateISO', TemporalNow_plainDateISO, 0],
    ['plainTimeISO', TemporalNow_plainTimeISO, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.Now');
  return Now;
}

/** https://tc39.es/proposal-temporal/#sec-hostsystemutcepochnanoseconds */
export declare function HostSystemUTCEpochNanoseconds(global: ObjectValue): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochmilliseconds */
export function SystemUTCEpochMilliseconds(): number {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  return Math.floor(nowNs / (10 ** 6));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochnanoseconds */
export function SystemUTCEpochNanoseconds(): bigint {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  return BigInt(nowNs);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemdatetime */
export function SystemDateTime(temporalTimeZoneLike: Value): PlainCompletion<ISODateTimeRecord> {
  let timeZone;
  if (temporalTimeZoneLike === Value.undefined) {
    timeZone = SystemTimeZoneIdentifier();
  } else {
    timeZone = Q(ToTemporalTimeZoneIdentifier(temporalTimeZoneLike));
  }
  const epochNs = SystemUTCEpochNanoseconds();
  return GetISODateTimeFor(timeZone, epochNs);
}
