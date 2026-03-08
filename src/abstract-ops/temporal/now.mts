import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { clamp } from '../math.mts';
import { SystemTimeZoneIdentifier } from './addition.mts';
import {
  ObjectValue, GetGlobalObject, Value, type PlainCompletion, Q, ToTemporalTimeZoneIdentifier, GetISODateTimeFor,
  surroundingAgent,
  nsMinInstant,
  nsMaxInstant,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-hostsystemutcepochnanoseconds */
export function HostSystemUTCEpochNanoseconds(global: ObjectValue): bigint {
  let host = surroundingAgent.hostDefinedOptions.hostHooks?.HostSystemUTCEpochNanoseconds?.(global);
  if (host === undefined) {
    host = BigInt(Date.now()) * BigInt(1e6);
  }
  return clamp(nsMinInstant, host, nsMaxInstant);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochmilliseconds */
export function SystemUTCEpochMilliseconds(): number {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  // Return 𝔽(floor(nowNs / 10**6)).
  return Number(nowNs / BigInt(1e6));
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
