import { surroundingAgent } from '../engine.mjs';
import { Type } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

export function thisTimeValue(value) {
  if (Type(value) === 'Object' && 'DateValue' in value) {
    return value.DateValue;
  }
  return surroundingAgent.Throw('TypeError', 'this is not a Date object');
}

// #sec-todatestring
export function ToDateString() {}

export function CreateDatePrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    // getDate
    // getDay
    // getFullYear
    // getHours
    // getMilliseconds
    // getMinutes
    // getMonth
    // getSeconds
    // getTime
    // getTimezoneOffset
    // getUTCDate
    // getUTCDay
    // getUTCFullYear
    // getUTCHours
    // getUTCMilliseconds
    // getUTCMinutes
    // getUTCMonth
    // getUTCSeconds
    // setDate
    // setFullYear
    // setHours
    // setMilliseconds
    // setMinutes
    // setMonth
    // setSeconds
    // setTime
    // setUTCDate
    // setUTCFullYear
    // setUTCHours
    // setUCMilliseconds
    // setUTCMinutes
    // setUTCMonth
    // setUTCSeconds
    // toDateString
    // toISOString
    // toJSON
    // toLocalDateString
    // toLocaleString
    // toLocaleTimeString
    // toString
    // toTimeString
    // toUTCString
    // valueOf
    // [@@toPrimitive]
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  realmRec.Intrinsics['%DatePrototype%'] = proto;
}
