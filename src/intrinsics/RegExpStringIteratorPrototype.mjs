import { surroundingAgent } from '../engine.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { wellKnownSymbols, Type, Value } from '../value.mjs';
import {
  Assert,
  ObjectCreate,
  CreateIterResultObject,
  ToString,
  ToLength,
  Get,
  Set,
} from '../abstract-ops/all.mjs';
import { RegExpExec, AdvanceStringIndex } from './RegExpPrototype.mjs';
import { Q, X } from '../completion.mjs';
import { msg } from '../helpers.mjs';

// 21.2.5.8.1 #sec-createregexpstringiterator
export function CreateRegExpStringIterator(R, S, global, fullUnicode) {
  Assert(Type(S) === 'String');
  Assert(Type(global) === 'Boolean');
  Assert(Type(fullUnicode) === 'Boolean');
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%RegExpStringIteratorPrototype%'), [
    'IteratingRegExp',
    'IteratedString',
    'Global',
    'Unicode',
    'Done',
  ]);
  iterator.IteratingRegExp = R;
  iterator.IteratedString = S;
  iterator.Global = global;
  iterator.Unicode = fullUnicode;
  iterator.Done = Value.false;
  return iterator;
}

// #%RegExpStringIteratorPrototype%.next
function RegExpStringIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp String Iterator', O));
  }
  if (!('IteratingRegExp' in O && 'IteratedString' in O && 'Global' in O && 'Unicode' in O && 'Done' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp String Iterator', O));
  }
  if (O.Done === Value.true) {
    return X(CreateIterResultObject(Value.undefined, Value.true));
  }
  const R = O.IteratingRegExp;
  const S = O.IteratedString;
  const global = O.Global;
  const fullUnicode = O.Unicode;
  const match = Q(RegExpExec(R, S));
  if (match === Value.null) {
    O.Done = Value.true;
    return X(CreateIterResultObject(Value.undefined, Value.true));
  } else {
    if (global === Value.true) {
      const matchStrValue = Q(Get(match, new Value('0')));
      const matchStr = Q(ToString(matchStrValue));
      if (matchStr.stringValue() === '') {
        const thisIndexValue = Q(Get(R, new Value('lastIndex')));
        const thisIndex = Q(ToLength(thisIndexValue));
        const nextIndex = X(AdvanceStringIndex(S, thisIndex, fullUnicode));
        Q(Set(R, new Value('lastIndex'), nextIndex, Value.true));
      }
      return Q(CreateIterResultObject(match, Value.false));
    } else {
      O.Done = Value.true;
      return Q(CreateIterResultObject(match, Value.false));
    }
  }
}

export function CreateRegExpStringIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', RegExpStringIteratorPrototype_next, 0],
    [wellKnownSymbols.toStringTag, new Value('RegExp String Iterator'), undefined, {
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    }],
  ], realmRec.Intrinsics['%IteratorPrototype%']);

  realmRec.Intrinsics['%RegExpStringIteratorPrototype%'] = proto;
}
