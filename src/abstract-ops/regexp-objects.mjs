import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Descriptor,
  Value,
} from '../value.mjs';
import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  Set,
  ToString,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { msg } from '../helpers.mjs';

// 21.2.3.2.1 #sec-regexpalloc
export function RegExpAlloc(newTarget) {
  const obj = Q(OrdinaryCreateFromConstructor(newTarget, '%RegExpPrototype%', ['RegExpMatcher', 'OriginalSource', 'OriginalFlags']));
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
  if (/^[gimsuy]*$/.test(f) === false || (new global.Set(f).size !== f.length)) {
    return surroundingAgent.Throw('SyntaxError', msg('InvalidRegExpFlags', f));
  }

  const BMP = !f.includes('u');
  if (BMP) {
    // TODO: parse P
  } else {
    // TODO: parse P
  }

  obj.OriginalSource = P;
  obj.OriginalFlags = F;
  // TODO: implement a matcher
  obj.RegExpMatcher = {};

  Q(Set(obj, new Value('lastIndex'), new Value(0), Value.true));
  return obj;
}

// 21.2.3.2.3 #sec-regexpcreate
export function RegExpCreate(P, F) {
  const obj = Q(RegExpAlloc(surroundingAgent.intrinsic('%RegExp%')));
  return Q(RegExpInitialize(obj, P, F));
}
