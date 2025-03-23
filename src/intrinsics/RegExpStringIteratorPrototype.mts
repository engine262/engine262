import { surroundingAgent } from '../host-defined/engine.mts';
import {
  BooleanValue, JSStringValue, NullValue, ObjectValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import {
  Assert,
  CreateIteratorFromClosure,
  GeneratorResume,
  ToString,
  ToLength,
  Get,
  Set,
  Yield,
  F, R as MathematicalValue,
  Realm,
  type GeneratorObject,
} from '../abstract-ops/all.mts';
import {
  Q, X, type ValueCompletion, type ValueEvaluator,
} from '../completion.mts';
import { RegExpExec, AdvanceStringIndex } from './RegExpPrototype.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-createregexpstringiterator */
export function CreateRegExpStringIterator(R: ObjectValue, S: JSStringValue, global: BooleanValue, fullUnicode: BooleanValue): ValueCompletion<GeneratorObject> {
  // 1. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 2. Assert: Type(global) is Boolean.
  Assert(global instanceof BooleanValue);
  // 3. Assert: Type(fullUnicode) is Boolean.
  Assert(fullUnicode instanceof BooleanValue);
  // 4. Let closure be a new Abstract Closure with no parameters that captures R, S, global, and fullUnicode and performs the following steps when called:
  const closure = function* closure(): ValueEvaluator {
    // a. Repeat,
    while (true) {
      // i. Let match be ? RegExpExec(R, S).
      const match = Q(yield* RegExpExec(R, S));
      // ii. If match is null, return undefined.
      if (match instanceof NullValue) {
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
      const matchStr = Q(yield* ToString(Q(yield* Get(match, Value('0')))));
      // v. If matchStr is the empty String, then
      if (matchStr.stringValue() === '') {
        // i. Let thisIndex be ℝ(? ToLength(? Get(R, "lastIndex"))).
        const thisIndex = MathematicalValue(Q(yield* ToLength(Q(yield* Get(R, Value('lastIndex'))))));
        // ii. Let nextIndex be ! AdvanceStringIndex(S, thisIndex, fullUnicode).
        const nextIndex = X(AdvanceStringIndex(S, thisIndex, fullUnicode));
        // iii. Perform ? Set(R, "lastIndex", 𝔽(nextIndex), true).
        Q(yield* Set(R, Value('lastIndex'), F(nextIndex), Value.true));
      }
      // vi. Perform ? Yield(match).
      Q(yield* Yield(match));
    }
  };
  // 4. Return ! CreateIteratorFromClosure(closure, "%RegExpStringIteratorPrototype%", %RegExpStringIteratorPrototype%).
  return X(CreateIteratorFromClosure(closure, Value('%RegExpStringIteratorPrototype%'), surroundingAgent.intrinsic('%RegExpStringIteratorPrototype%')));
}

/** https://tc39.es/ecma262/#sec-%regexpstringiteratorprototype%.next */
function* RegExpStringIteratorPrototype_next(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Return ? GeneratorResume(this value, empty, "%RegExpStringIteratorPrototype%").
  return Q(yield* GeneratorResume(thisValue, undefined, Value('%RegExpStringIteratorPrototype%')));
}

export function bootstrapRegExpStringIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', RegExpStringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'RegExp String Iterator');

  realmRec.Intrinsics['%RegExpStringIteratorPrototype%'] = proto;
}
