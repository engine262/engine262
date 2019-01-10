import { surroundingAgent } from '../engine.mjs';
import {
  OrdinaryToPrimitive,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { msg } from '../helpers.mjs';

export function thisTimeValue(value) {
  if (Type(value) === 'Object' && 'DateValue' in value) {
    return value.DateValue;
  }
  return surroundingAgent.Throw('TypeError', 'this is not a Date object');
}

// 20.3.4.41.4 #sec-todatestring
export function ToDateString() {}

// 20.3.4.45 #sec-date.prototype-@@toprimitive
function DateProto_toPrimitive([hint = Value.undefined], { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Date.prototype[@@toPrimitive]'));
  }
  let tryFirst;
  if (Type(hint) === 'String' && (hint.stringValue() === 'string' || hint.stringValue() === 'default')) {
    tryFirst = new Value('string');
  } else if (Type(hint) === 'String' && hint.stringValue() === 'number') {
    tryFirst = new Value('number');
  } else {
    return surroundingAgent.Throw('TypeError', msg('InvalidHint', hint));
  }
  return Q(OrdinaryToPrimitive(O, tryFirst));
}

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
    [wellKnownSymbols.toPrimitive, DateProto_toPrimitive, 1, { Writable: Value.false, Enumerable: Value.false, Configurable: Value.true }],
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  realmRec.Intrinsics['%DatePrototype%'] = proto;
}
