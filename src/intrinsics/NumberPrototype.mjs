import {
  Type,
  Value,
} from '../value.mjs';
import {
  Assert,
  ToInteger,
  ToString,
} from '../abstract-ops/all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function thisNumberValue(value) {
  if (Type(value) === 'Number') {
    return value;
  }
  if (Type(value) === 'Object' && 'NumberData' in value) {
    const n = value.NumberData;
    Assert(Type(n) === 'Number');
    return n;
  }
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Number', value);
}

// 20.1.3.2 #sec-number.prototype.toexponential
function NumberProto_toExponential([fractionDigits = Value.undefined], { thisValue }) {
  let x = Q(thisNumberValue(thisValue)).numberValue();
  const f = Q(ToInteger(fractionDigits)).numberValue();
  Assert(fractionDigits !== Value.undefined || f === 0);
  if (Number.isNaN(x)) {
    return new Value('NaN');
  }
  let s = '';
  if (x < 0) {
    s = '-';
    x = -x;
  }
  if (x === Infinity) {
    return new Value(`${s}Infinity`);
  }
  if (f < 0 || f > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toExponential');
  }
  let m;
  let e;
  if (x === 0) {
    m = '0'.repeat(f + 1);
    e = 0;
  } else {
    let n;
    if (fractionDigits !== Value.undefined) {
      // TODO: compute e and n.
    } else {
      // TODO: compute e, n and f.
    }
    m = String(n);
    return surroundingAgent.Throw('Error', 'Raw', 'Number.prototype.toExponential is not fully implemented');
  }
  if (f !== 0) {
    const a = m[0];
    const b = m.slice(1);
    m = `${a}.${b}`;
  }
  let c;
  let d;
  if (e === 0) {
    c = '+';
    d = '0';
  } else {
    if (e > 0) {
      c = '+';
    } else {
      c = '-';
      e = -e;
    }
    d = String(e);
  }
  m = `${m}e${c}${d}`;
  return new Value(`${s}${m}`);
}

// 20.1.3.3 #sec-number.prototype.tofixed
function NumberProto_toFixed([fractionDigits = Value.undefined], { thisValue }) {
  let x = Q(thisNumberValue(thisValue)).numberValue();
  const f = Q(ToInteger(fractionDigits)).numberValue();
  Assert(fractionDigits !== Value.undefined || f === 0);
  if (f < 0 || f > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toFixed');
  }
  if (Number.isNaN(x)) {
    return new Value('NaN');
  }
  let s = '';
  if (x < 0) {
    s = '-';
    x = -x;
  }
  let m;
  if (x >= 10 ** 21) {
    m = X(ToString(new Value(x))).stringValue();
  } else {
    // TODO: compute n.
    // if (n === 0) {
    //   m = '0';
    // } else {
    //   m = String(n);
    // }
    // if (f !== 0) {
    //   let k = m.length;
    //   if (k <= f) {
    //     const z = '0'.repeat(f + 1 - k);
    //     m = `${z}${m}`;
    //     k = f + 1;
    //   }
    //   const a = m.slice(0, k - f);
    //   const b = m.slice(k - f);
    //   m = `${a}.${b}`;
    // }
    return surroundingAgent.Throw('Error', 'Raw', 'Number.prototype.toFixed is not fully implemented');
  }
  return new Value(`${s}${m}`);
}

// 20.1.3.4 #sec-number.prototype.tolocalestring
function NumberProto_toLocaleString() {
  return surroundingAgent.Throw('Error', 'Raw', 'Number.prototype.toLocaleString is not implemented');
}

// 20.1.3.5 #sec-number.prototype.toprecision
function NumberProto_toPrecision([precision = Value.undefined], { thisValue }) {
  let x = Q(thisNumberValue(thisValue)).numberValue();
  if (precision === Value.undefined) {
    return X(ToString(new Value(x)));
  }
  const p = Q(ToInteger(precision)).numberValue();
  if (Number.isNaN(x)) {
    return new Value('NaN');
  }
  let s = '';
  if (x < 0) {
    s = '-';
    x = -x;
  }
  if (x === Infinity) {
    return new Value(`${s}Infinity`);
  }
  if (p < 1 || p > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toPrecision');
  }
  let m;
  let e;
  if (x === 0) {
    m = '0'.repeat(p);
    e = 0;
  } else {
    // TODO: compute e and n.
    // m = String(n);
    // if (e < -6 || e >= p) {
    //   Assert(e !== 0);
    //   if (p !== 1) {
    //     const a = m[0];
    //     const b = m.slice(1);
    //     m = `${a}.${b}`;
    //   }
    //   let c;
    //   if (e > 0) {
    //     c = '+';
    //   } else {
    //     c = '-';
    //     e = -e;
    //   }
    //   const d = String(e);
    //   return new Value(`${s}${m}e${c}${d}`);
    // }
    return surroundingAgent.Throw('Error', 'Raw', 'Number.prototype.toPrecision is not fully implemented');
  }
  if (e === p - 1) {
    return new Value(`${s}${m}`);
  }
  if (e >= 0) {
    m = `${m.slice(0, e + 1)}.${m.slice(e + 1)}`;
  } else {
    m = `0.${'0'.repeat(-(e + 1))}${m}`;
  }
  return new Value(`${s}${m}`);
}

// 20.1.3.6 #sec-number.prototype.tostring
function NumberProto_toString([radix = Value.undefined], { thisValue }) {
  const x = Q(thisNumberValue(thisValue));
  let radixNumber;
  if (radix === Value.undefined) {
    radixNumber = 10;
  } else {
    radixNumber = Q(ToInteger(radix)).numberValue();
  }
  if (radixNumber < 2 || radixNumber > 36) {
    return surroundingAgent.Throw('TypeError', 'NumberFormatRange', 'toString');
  }
  if (radixNumber === 10) {
    return X(ToString(x));
  }
  // FIXME(devsnek): Return the String representation of this Number
  // value using the radix specified by radixNumber. Letters a-z are
  // used for digits with values 10 through 35. The precise algorithm
  // is implementation-dependent, however the algorithm should be a
  // generalization of that specified in 7.1.12.1.
  return new Value(x.numberValue().toString(radixNumber));
}

// 20.1.3.7 #sec-number.prototype.valueof
function NumberProto_valueOf(args, { thisValue }) {
  return Q(thisNumberValue(thisValue));
}

export function BootstrapNumberPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['toExponential', NumberProto_toExponential, 1],
    ['toFixed', NumberProto_toFixed, 1],
    ['toLocaleString', NumberProto_toLocaleString, 0],
    ['toPrecision', NumberProto_toPrecision, 1],
    ['toString', NumberProto_toString, 0],
    ['valueOf', NumberProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  proto.NumberData = new Value(0);

  realmRec.Intrinsics['%Number.prototype%'] = proto;
}
