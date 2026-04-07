import type { ISODateTimeRecord } from '../../intrinsics/Temporal/PlainDateTime.mts';
import { clamp, floorDiv } from '../math.mts';
import { SystemTimeZoneIdentifier } from './addition.mts';
import {
  ObjectValue, GetGlobalObject, Value, type PlainCompletion, Q, ToTemporalTimeZoneIdentifier, GetISODateTimeFor,
  surroundingAgent,
  minEpochNanoseconds,
  maxEpochNanoseconds,
  type EpochNanoseconds,
  type IntegralNumber,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-hostsystemutcepochnanoseconds */
export function HostSystemUTCEpochNanoseconds(global: ObjectValue): EpochNanoseconds {
  let host = surroundingAgent.hostDefinedOptions.hostHooks?.HostSystemUTCEpochNanoseconds?.(global);
  if (host === undefined) {
    host = BigInt(Date.now()) * BigInt(1e6) as EpochNanoseconds;
  }
  return clamp(minEpochNanoseconds, host, maxEpochNanoseconds);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochmilliseconds */
export function SystemUTCEpochMilliseconds(): IntegralNumber {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  return Number(floorDiv(nowNs, BigInt(1e6)));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochnanoseconds */
export function SystemUTCEpochNanoseconds(): EpochNanoseconds {
  const global = GetGlobalObject();
  const nowNs = HostSystemUTCEpochNanoseconds(global);
  return nowNs;
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
