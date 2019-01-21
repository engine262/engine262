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

  // TODO: remove this once internal parsing is implemented
  try {
    new RegExp(P.stringValue(), F.stringValue()); // eslint-disable-line no-new
  } catch (e) {
    if (e instanceof SyntaxError) {
      return surroundingAgent.Throw('SyntaxError', e.message);
    }
    throw e;
  }

  obj.OriginalSource = P;
  obj.OriginalFlags = F;
  obj.RegExpMatcher = getMatcher(P, F);

  Q(Set(obj, new Value('lastIndex'), new Value(0), Value.true));
  return obj;
}

// TODO: implement an independant matcher
function getMatcher(P, F) {
  const regex = new RegExp(P.stringValue(), F.stringValue());
  const unicode = F.stringValue().includes('u');
  return function RegExpMatcher(S, lastIndex) {
    regex.lastIndex = lastIndex.numberValue();
    const result = regex.exec(S.stringValue());
    if (result === null) {
      return null;
    }
    if (result.index > lastIndex.numberValue()) {
      return null;
    }
    const captures = [];
    for (const capture of result.slice(1)) {
      if (capture === undefined) {
        captures.push(Value.undefined);
      } else if (unicode) {
        captures.push(Array.from(capture).map((char) => char.codePointAt(0)));
      } else {
        captures.push(capture.split('').map((char) => char.charCodeAt(0)));
      }
    }
    return {
      endIndex: new Value(result.index + result[0].length),
      captures,
    };
  };
}

// 21.2.3.2.3 #sec-regexpcreate
export function RegExpCreate(P, F) {
  const obj = Q(RegExpAlloc(surroundingAgent.intrinsic('%RegExp%')));
  return Q(RegExpInitialize(obj, P, F));
}
