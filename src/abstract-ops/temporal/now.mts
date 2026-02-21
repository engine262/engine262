import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { SystemTimeZoneIdentifier } from './addition.mts';
import { temporal_todo } from './not-implemented.mts';
import {
  ObjectValue, GetGlobalObject, Value, type PlainCompletion, Q, ToTemporalTimeZoneIdentifier, GetISODateTimeFor,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-hostsystemutcepochnanoseconds */
export function HostSystemUTCEpochNanoseconds(_global: ObjectValue): number {
  temporal_todo();
}

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
