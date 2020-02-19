import { surroundingAgent } from '../engine.mjs';
import { ParseRegExp } from '../parse.mjs';
import { Descriptor, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { getMatcher } from '../runtime-semantics/all.mjs';
import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  Set,
  ToString,
} from './all.mjs';

// 21.2.3.2.1 #sec-regexpalloc
export function RegExpAlloc(newTarget) {
  const obj = Q(OrdinaryCreateFromConstructor(newTarget, '%RegExp.prototype%', ['RegExpMatcher', 'OriginalSource', 'OriginalFlags']));
  X(DefinePropertyOrThrow(obj, new Value('lastIndex'), Descriptor({
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

// 21.2.3.2.2 #sec-regexpinitialize
export function RegExpInitialize(obj, pattern, flags) {
  let P;
  if (pattern === Value.undefined) {
    P = new Value('');
  } else {
    P = Q(ToString(pattern));
  }

  let F;
  if (flags === Value.undefined) {
    F = new Value('');
  } else {
    F = Q(ToString(flags));
  }

  const f = F.stringValue();
  if (/^[gimsuy]*$/.test(f) === false || (new globalThis.Set(f).size !== f.length)) {
    return surroundingAgent.Throw('SyntaxError', 'InvalidRegExpFlags', f);
  }

  let parsed;
  try {
    parsed = ParseRegExp(P.stringValue(), F.stringValue());
  } catch (e) {
    return surroundingAgent.Throw('SyntaxError', 'Raw', e.message);
  }

  obj.OriginalSource = P;
  obj.OriginalFlags = F;
  obj.RegExpMatcher = getMatcher(parsed, F.stringValue());
  obj.parsedRegExp = parsed;

  Q(Set(obj, new Value('lastIndex'), new Value(0), Value.true));
  return obj;
}

// 21.2.3.2.3 #sec-regexpcreate
export function RegExpCreate(P, F) {
  const obj = Q(RegExpAlloc(surroundingAgent.intrinsic('%RegExp%')));
  return Q(RegExpInitialize(obj, P, F));
}

// 21.2.3.2.4 #sec-escaperegexppattern
export function EscapeRegExpPattern(P, F) {
  // TODO: implement this without host
  const re = new RegExp(P.stringValue(), F.stringValue());
  return new Value(re.source);
}
