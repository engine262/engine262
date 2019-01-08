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
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { Q } from '../completion.mjs';

// 21.2.3 #sec-regexp-constructor
function RegExpConstructor([pattern = Value.undefined, flags = Value.undefined], { NewTarget }) {
  const patternIsRegExp = Q(IsRegExp(pattern));
  let newTarget;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject;
    if (patternIsRegExp === Value.true && flags === Value.undefined) {
      const patternConstructor = Q(Get(pattern, new Value('constructor')));
      if (SameValue(newTarget, patternConstructor) === Value.true) {
        return pattern;
      }
    }
  } else {
    newTarget = NewTarget;
  }
  let P;
  let F;
  if (Type(pattern) === 'Object' && 'RegExpMatcher' in pattern) {
    P = pattern.OriginalSource;
    if (flags === Value.undefined) {
      F = pattern.OriginalFlags;
    } else {
      F = flags;
    }
  } else if (patternIsRegExp === Value.true) {
    P = Q(Get(pattern, new Value('source')));
    if (flags === Value.undefined) {
      F = Q(Get(pattern, new Value('flags')));
    } else {
      F = flags;
    }
  } else {
    P = pattern;
    F = flags;
  }
  const O = Q(RegExpAlloc(newTarget));
  return Q(RegExpInitialize(O, P, F));
}

// 22.2.4.2 #sec-get-regexp-@@species
function RegExp_speciesGetter(args, { thisValue }) {
  return thisValue;
}

export function CreateRegExp(realmRec) {
  const proto = realmRec.Intrinsics['%RegExpPrototype%'];

  const cons = BootstrapConstructor(realmRec, RegExpConstructor, 'RegExp', 2, proto, [
    [wellKnownSymbols.species, [RegExp_speciesGetter]],
  ]);

  realmRec.Intrinsics['%RegExp%'] = cons;
}
