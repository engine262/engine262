import {
  surroundingAgent,
} from '../engine.mts';
import {
  Get,
  IsRegExp,
  Realm,
  RegExpAlloc,
  RegExpInitialize,
  SameValue,
  type FunctionObject,
  type OrdinaryObject,
} from '../abstract-ops/all.mts';
import {
  JSStringValue,
  ObjectValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { Q, type ExpressionCompletion } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface RegExpObject extends OrdinaryObject {
  readonly OriginalSource: JSStringValue;
  readonly OriginalFlags: JSStringValue;
  readonly RegExpMatcher: (str: JSStringValue, index: number) => unknown;
  readonly parsedPattern: ParseNode.RegExp.Pattern;
}
export function isRegExpObject(o: Value): o is RegExpObject {
  return 'RegExpMatcher' in o;
}
/** https://tc39.es/ecma262/#sec-regexp-constructor */
function RegExpConstructor([pattern = Value.undefined, flags = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ExpressionCompletion {
  // 1. Let patternIsRegExp be ? IsRegExp(pattern).
  const patternIsRegExp = Q(IsRegExp(pattern));
  let newTarget;
  // 2. If NewTarget is undefined, then
  if (NewTarget === Value.undefined) {
    // a. Let newTarget be the active function object.
    newTarget = surroundingAgent.activeFunctionObject;
    // b. If patternIsRegExp is true and flags is undefined, then
    if (patternIsRegExp === Value.true && flags === Value.undefined) {
      // i. Let patternConstructor be ? Get(pattern, "constructor").
      const patternConstructor = Q(Get(pattern as ObjectValue, Value('constructor')));
      // ii. If SameValue(newTarget, patternConstructor) is true, return pattern.
      if (SameValue(newTarget, patternConstructor) === Value.true) {
        return pattern;
      }
    }
  } else { // 3. Else, let newTarget be NewTarget.
    newTarget = NewTarget;
  }
  let P;
  let F;
  // 4. If Type(pattern) is Object and pattern has a [[RegExpMatcher]] internal slot, then
  if (isRegExpObject(pattern)) {
    // a. Let P be pattern.[[OriginalSource]].
    P = pattern.OriginalSource;
    // b. If flags is undefined, let F be pattern.[[OriginalFlags]].
    if (flags === Value.undefined) {
      F = pattern.OriginalFlags;
    } else { // c. Else, let F be flags.
      F = flags;
    }
  } else if (patternIsRegExp === Value.true) { // 5. Else if patternIsRegExp is true, then
    // a. Else if patternIsRegExp is true, then
    P = Q(Get(pattern as ObjectValue, Value('source')));
    // b. If flags is undefined, then
    if (flags === Value.undefined) {
      // i. Let F be ? Get(pattern, "flags").
      F = Q(Get(pattern as ObjectValue, Value('flags')));
    } else { // c. Else, let F be flags.
      F = flags;
    }
  } else { // 6. Else,
    // a. Let P be pattern.
    P = pattern;
    // b. Let F be flags.
    F = flags;
  }
  // 7. Let O be ? RegExpAlloc(newTarget).
  const O = Q(RegExpAlloc(newTarget as FunctionObject));
  // 8. Return ? RegExpInitialize(O, P, F).
  return Q(RegExpInitialize(O, P, F));
}

/** https://tc39.es/ecma262/#sec-get-regexp-@@species */
function RegExp_speciesGetter(_args: Arguments, { thisValue }: FunctionCallContext) {
  return thisValue;
}

export function bootstrapRegExp(realmRec: Realm) {
  const proto = realmRec.Intrinsics['%RegExp.prototype%'];

  const cons = bootstrapConstructor(realmRec, RegExpConstructor, 'RegExp', 2, proto, [
    [wellKnownSymbols.species, [RegExp_speciesGetter]],
  ]);

  realmRec.Intrinsics['%RegExp%'] = cons;
}
