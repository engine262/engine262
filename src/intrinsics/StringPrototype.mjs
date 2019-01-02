import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  RequireObjectCoercible,
  ToInteger,
  ToLength,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  StringExoticObjectValue,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { UTF16Decode } from '../static-semantics/all.mjs';
import { CreateStringIterator } from './StringIteratorPrototype.mjs';
import { Q } from '../completion.mjs';
import { assignProps } from './Bootstrap.mjs';

function thisStringValue(value) {
  if (Type(value) === 'String') {
    return value;
  }
  if (Type(value) === 'Object' && 'StringData' in value) {
    Assert(Type(value.StringData) === 'String');
    return value.StringData;
  }
  return surroundingAgent.Throw('TypeError');
}

function StringProto_charAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return new Value('');
  }
  return new Value(S.stringValue()[position]);
}

function StringProto_charCodeAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return new Value(NaN);
  }
  return new Value(S.stringValue().charCodeAt(position));
}

function StringProto_codePointAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return Value.undefined;
  }
  const first = S.stringValue().charCodeAt(position);
  if (first < 0xD800 || first > 0xDBFF || position + 1 === size) {
    return new Value(first);
  }
  const second = S.stringValue().charCodeAt(position + 1);
  if (second < 0xDC00 || second > 0xDFFF) {
    return new Value(first);
  }
  return new Value(UTF16Decode(first, second));
}

function StringProto_concat([...args], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  let R = S.stringValue();
  while (args.length > 0) {
    const next = args.shift();
    const nextString = Q(ToString(next));
    R = `${R}${nextString.stringValue()}`;
  }
  return new Value(R);
}

function StringProto_indexOf([searchString, position = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const searchStr = Q(ToString(searchString)).stringValue();
  const pos = Q(ToInteger(position));
  Assert(!(position === Value.undefined) || pos.numberValue() === 0);
  const len = S.length;
  const start = Math.min(Math.max(pos.numberValue(), 0), len);
  const searchLen = searchStr.length;
  let k = start;
  while (k + searchLen <= len) {
    let match = true;
    for (let j = 0; j < searchLen; j += 1) {
      if (searchStr[j] !== S[k + j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return new Value(k);
    }
    k += 1;
  }
  return new Value(-1);
}

// 21.1.3.13 #sec-string.prototype.padend
function StringProto_padEnd([maxLength, fillString = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const intMaxLength = Q(ToLength(maxLength)).numberValue();
  const stringLength = S.stringValue().length;
  if (intMaxLength <= stringLength) {
    return S;
  }
  let filler;
  if (fillString === Value.undefined) {
    filler = ' ';
  } else {
    filler = Q(ToString(fillString)).stringValue();
  }
  if (filler === '') {
    return S;
  }
  const fillLen = intMaxLength - stringLength;
  const stringFiller = filler.repeat(Math.ceil(fillLen / filler.length));
  const truncatedStringFiller = stringFiller.slice(0, fillLen);
  return new Value(S.stringValue() + truncatedStringFiller);
}

// 21.1.3.14 #sec-string.prototype.padstart
function StringProto_padStart([maxLength, fillString = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const intMaxLength = Q(ToLength(maxLength)).numberValue();
  const stringLength = S.stringValue().length;
  if (intMaxLength <= stringLength) {
    return S;
  }
  let filler;
  if (fillString === Value.undefined) {
    filler = ' ';
  } else {
    filler = Q(ToString(fillString)).stringValue();
  }
  if (filler === '') {
    return S;
  }
  const fillLen = intMaxLength - stringLength;
  const stringFiller = filler.repeat(Math.ceil(fillLen / filler.length));
  const truncatedStringFiller = stringFiller.slice(0, fillLen);
  return new Value(truncatedStringFiller + S.stringValue());
}

// 21.1.3.18 #sec-string.prototype.slice
function StringProto_slice([start, end], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const len = S.length;
  const intStart = Q(ToInteger(start)).numberValue();
  let intEnd;
  if (end === Value.undefined) {
    intEnd = len;
  } else {
    intEnd = Q(ToInteger(end)).numberValue();
  }
  let from;
  if (intStart < 0) {
    from = Math.max(len + intStart, 0);
  } else {
    from = Math.min(intStart, len);
  }
  let to;
  if (intEnd < 0) {
    to = Math.max(len + intEnd, 0);
  } else {
    to = Math.min(intEnd, len);
  }
  const span = Math.max(to - from, 0);
  return new Value(S.slice(from, from + span));
}

function StringProto_toString(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

function StringProto_trim(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const T = S.stringValue().trim();
  return new Value(T);
}

function StringProto_valueOf(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

function StringProto_iterator(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  return Q(CreateStringIterator(S));
}

export function CreateStringPrototype(realmRec) {
  const proto = new StringExoticObjectValue();
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];
  proto.Extensible = Value.true;
  proto.StringData = new Value('');

  assignProps(realmRec, proto, [
    ['charAt', StringProto_charAt, 1],
    ['charCodeAt', StringProto_charCodeAt, 1],
    ['codePointAt', StringProto_codePointAt, 1],
    ['concat', StringProto_concat, 1],
    // endsWith
    // includes
    ['indexOf', StringProto_indexOf, 1],
    // lastIndexOf
    // localeCompare
    // match
    // normalize
    ['padEnd', StringProto_padEnd, 1],
    ['padStart', StringProto_padStart, 1],
    // repeat
    // replace
    // search
    ['slice', StringProto_slice, 2],
    // split
    // startsWith
    // substring
    // toLocaleLowerCase
    // toLocaleUpperCase
    // toLowerCase
    ['toString', StringProto_toString, 0],
    // toUpperCase
    ['trim', StringProto_trim, 0],
    ['valueOf', StringProto_valueOf, 0],
    [wellKnownSymbols.iterator, StringProto_iterator, 0],
  ]);

  realmRec.Intrinsics['%StringPrototype%'] = proto;
}
