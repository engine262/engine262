// Using spec: 87c74ec2ae7d55cf10c58674478784d09f323ff1

import { GetGlobalObject, ObjectValue, Q, Value, X, type PlainCompletion, type Realm } from '#self';
import { bootstrapPrototype } from './bootstrap.mts';

function bootstrapTemporalNow(realmRec: Realm) {
  const Now = bootstrapPrototype(realmRec, [
    ['timeZoneId',
      /** https://tc39.es/proposal-temporal/#sec-temporal.now.timezoneid */
      () => SystemTimeZoneIdentifier(), 0],
    ['instant', /** https://tc39.es/proposal-temporal/#sec-temporal.now.instant */ () => {
      const ns = SystemUTCEpochNanoseconds();
      return X(CreateTemporalInstant(ns));
    }, 0],
    ['plainDateTimeISO', /** https://tc39.es/proposal-temporal/#sec-temporal.now.plaindatetimeiso */
      ([temporalTimeZoneLike = Value.undefined]) => {
      const isoDateTime = Q(SystemDateTime(temporalTimeZoneLike));
      return X(CreateTemporalDateTime(isoDateTime, "iso8601"));
    }, 0],
    ['zonedDateTimeISO', /** https://tc39.es/proposal-temporal/#sec-temporal.now.zoneddatetimeiso */
      ([temporalTimeZoneLike = Value.undefined]) => {
      let timeZone;
      if (temporalTimeZoneLike === Value.undefined) {
        timeZone = SystemTimeZoneIdentifier();
      } else {
        timeZone = Q(ToTemporalTimeZoneIdentifier(temporalTimeZoneLike));
      }
      const ns = SystemUTCEpochNanoseconds();
      return X(CreateTemporalZonedDateTime(ns, timeZone, "iso8601"));
    }, 0],
    ['plainDateISO', /** https://tc39.es/proposal-temporal/#sec-temporal.now.plaindateiso */
      ([temporalTimeZoneLike = Value.undefined]) => {
      const isoDateTime = Q(SystemDateTime(temporalTimeZoneLike));
      return X(CreateTemporalDateTime(isoDateTime, "iso8601"));
      }, 0],
    ['plainTimeISO', /** https://tc39.es/proposal-temporal/#sec-temporal.now.plaintimeiso */
      ([temporalTimeZoneLike = Value.undefined]) => {
      const isoDateTime = Q(SystemDateTime(temporalTimeZoneLike));
      return X(CreateTemporalTime(isoDateTime.Time));
      }, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal.Now');
  return Now;
}

export function bootstrapTemporal(realmRec: Realm) {
  const TemporalObject = bootstrapPrototype(realmRec, [
    ['Now', bootstrapTemporalNow(realmRec)],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal');

  realmRec.Intrinsics['%Temporal%'] = TemporalObject;
}

/** https://tc39.es/proposal-temporal/#sec-hostsystemutcepochnanoseconds */
declare function HostSystemUTCEpochNanoseconds(global: ObjectValue): number;

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochmilliseconds */
function SystemUTCEpochMilliseconds(): number {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  return Math.floor(nowNs / (10 ** 6));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochnanoseconds */
function SystemUTCEpochNanoseconds(): bigint {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  return BigInt(nowNs);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemdatetime */
function SystemDateTime(temporalTimeZoneLike: Value): PlainCompletion<ISODateTimeRecord> {
  let timeZone;
  if (temporalTimeZoneLike === Value.undefined) {
    timeZone = SystemTimeZoneIdentifier();
  } else {
    timeZone = Q(ToTemporalTimeZoneIdentifier(temporalTimeZoneLike));
  }
  const epochNs = SystemUTCEpochNanoseconds();
  return GetISODateTimeFor(timeZone, epochNs);
}

// Continue: https://tc39.es/proposal-temporal/#sec-temporal-plaindate-objects

declare type ISODateTimeRecordTime = {};
declare type ISODateTimeRecord = { readonly Time: ISODateTimeRecordTime };
declare function SystemTimeZoneIdentifier(): Value;
declare function CreateTemporalInstant(ns: bigint): Value;
declare function CreateTemporalDateTime(isoDateTime: ISODateTimeRecord, calendar: string): Value;
declare function ToTemporalTimeZoneIdentifier(temporalTimeZoneLike: Value): Value;
declare function CreateTemporalZonedDateTime(ns: bigint, timeZone: Value, calendar: string): Value;
declare function CreateTemporalTime(isoDateTime: ISODateTimeRecordTime): Value;
declare function GetISODateTimeFor(timeZone: Value, epochNs: bigint): PlainCompletion<ISODateTimeRecord>;
