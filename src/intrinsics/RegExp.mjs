import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Get,
  IsRegExp,
  RegExpAlloc,
  RegExpInitialize,
  SameValue,
} from '../abstract-ops/all.mjs';
import {
  ObjectValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-regexp-constructor  */
function RegExpConstructor([pattern = Value.undefined, flags = Value.undefined], { NewTarget }) {
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
      const patternConstructor = Q(Get(pattern, new Value('constructor')));
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
  if (pattern instanceof ObjectValue && 'RegExpMatcher' in pattern) {
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
    P = Q(Get(pattern, new Value('source')));
    // b. If flags is undefined, then
    if (flags === Value.undefined) {
      // i. Let F be ? Get(pattern, "flags").
      F = Q(Get(pattern, new Value('flags')));
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
  const O = Q(RegExpAlloc(newTarget));
  // 8. Return ? RegExpInitialize(O, P, F).
  return Q(RegExpInitialize(O, P, F));
}

/** http://tc39.es/ecma262/#sec-get-regexp-@@species  */
function RegExp_speciesGetter(args, { thisValue }) {
  return thisValue;
}

export function bootstrapRegExp(realmRec) {
  const proto = realmRec.Intrinsics['%RegExp.prototype%'];

  const cons = bootstrapConstructor(realmRec, RegExpConstructor, 'RegExp', 2, proto, [
    [wellKnownSymbols.species, [RegExp_speciesGetter]],
  ]);

  realmRec.Intrinsics['%RegExp%'] = cons;
}
