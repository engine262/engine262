import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import {
  Assert,
  CreateIteratorFromClosure,
  GeneratorResume,
  ToString,
  ToLength,
  Get,
  Set,
  Yield,
  F,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { RegExpExec, AdvanceStringIndex } from './RegExpPrototype.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

const kRegExpStringIteratorPrototype = new Value('%RegExpStringIteratorPrototype%');

// 21.2.5.8.1 #sec-createregexpstringiterator
export function CreateRegExpStringIterator(R, S, global, fullUnicode) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: Type(global) is Boolean.
  Assert(Type(global) === 'Boolean');
  // 3. Assert: Type(fullUnicode) is Boolean.
  Assert(Type(fullUnicode) === 'Boolean');
  // 4. Let closure be a new Abstract Closure with no parameters that captures R, S, global, and fullUnicode and performs the following steps when called:
  const closure = function* closure() {
    // a. Repeat,
    while (true) {
      // i. Let match be ? RegExpExec(R, S).
      const match = Q(RegExpExec(R, S));
      // ii. If match is null, return undefined.
      if (match === Value.null) {
        return Value.undefined;
      }
      // iii. If global is false, then
      if (global === Value.false) {
        // 1. Perform ? Yield(match).
        Q(yield* Yield(match));
        // 2. Return undefined.
        return Value.undefined;
      }
      // iv. Let matchStr be ? ToString(? Get(match, "0")).
      const matchStr = Q(ToString(Q(Get(match, new Value('0')))));
      // v. If matchStr is the empty String, then
      if (matchStr.stringValue() === '') {
        // i. Let thisIndex be ℝ(? ToLength(? Get(R, "lastIndex"))).
        const thisIndex = Q(ToLength(Q(Get(R, new Value('lastIndex'))))).numberValue();
        // ii. Let nextIndex be ! AdvanceStringIndex(S, thisIndex, fullUnicode).
        const nextIndex = X(AdvanceStringIndex(S, thisIndex, fullUnicode));
        // iii. Perform ? Set(R, "lastIndex", 𝔽(nextIndex), true).
        Q(Set(R, new Value('lastIndex'), F(nextIndex), Value.true));
      }
      // vi. Perform ? Yield(match).
      Q(yield* Yield(match));
    }
  };
  // 4. Return ! CreateIteratorFromClosure(closure, "%RegExpStringIteratorPrototype%", %RegExpStringIteratorPrototype%).
  return X(CreateIteratorFromClosure(closure, kRegExpStringIteratorPrototype, surroundingAgent.intrinsic('%RegExpStringIteratorPrototype%')));
}

// 21.2.7.1.1 #sec-%regexpstringiteratorprototype%.next
function RegExpStringIteratorPrototype_next(args, { thisValue }) {
  // 1. Return ? GeneratorResume(this value, empty, "%RegExpStringIteratorPrototype%").
  return Q(GeneratorResume(thisValue, undefined, kRegExpStringIteratorPrototype));
}

export function bootstrapRegExpStringIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', RegExpStringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'RegExp String Iterator');

  realmRec.Intrinsics['%RegExpStringIteratorPrototype%'] = proto;
}
