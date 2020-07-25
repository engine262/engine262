import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  Get,
  IsRegExp,
  RegExpAlloc,
  RegExpInitialize,
  SameValue,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// https://tc39.es/proposal-regexp-legacy-features/#sec-getlegacyregexpstaticproperty
function GetLegacyRegExpStaticProperty(C, thisValue, internalSlotName, /* NON-SPEC */ propertyName) {
  // 1. Assert C is an object that has an internal slot named internalSlotName.
  Assert(Type(C) === 'Object' && internalSlotName in C);

  // 2. If SameValue(C, thisValue) is false, throw a TypeError exception.
  if (SameValue(C, thisValue) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', `get ${propertyName}`, thisValue);
  }

  // 3. Let val be the value of the internal slot of C named internalSlotName.
  const val = C[internalSlotName];

  // 4. If val is empty, throw a TypeError exception.
  if (val === undefined) {
    return surroundingAgent.Throw('TypeError', 'RegExpLegacySlotIsEmpty');
  }

  // 5. Return val.
  return val;
}

// https://tc39.es/proposal-regexp-legacy-features/#sec-setlegacyregexpstaticproperty
function SetLegacyRegExpStaticProperty(C, thisValue, internalSlotName, val, /* NON-SPEC */ propertyName) {
  // 1. Assert C is an object that has an internal slot named internalSlotName.
  Assert(Type(C) === 'Object' && internalSlotName in C);

  // 2. If SameValue(C, thisValue) is false, throw a TypeError exception.
  if (SameValue(C, thisValue) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', `set ${propertyName}`, thisValue);
  }

  // 3. Let strVal be ? ToString(val).
  const strVal = Q(ToString(val));

  // 4. Set the value of the internal slot of C named internalSlotName to strVal.
  C[internalSlotName] = strVal;
}

// #sec-regexp-constructor
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
  if (Type(pattern) === 'Object' && 'RegExpMatcher' in pattern) {
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

// 21.2.4.2 #sec-get-regexp-@@species
function RegExp_speciesGetter(args, { thisValue }) {
  return thisValue;
}

const legacyRegExpSlots = [];
const legacyRegExpProperties = [];

function createLegacyRegExpAccessors(slot, prop) {
  const accessors = [(args, { thisValue }) => GetLegacyRegExpStaticProperty(surroundingAgent.intrinsic('%RegExp%'), thisValue, slot, prop)];

  if (slot === 'RegExpInput') {
    accessors.push(([val], { thisValue }) => SetLegacyRegExpStaticProperty(surroundingAgent.intrinsic('%RegExp%'), thisValue, slot, val, prop));
  }

  return accessors;
}

for (const [slot, props] of Object.entries({
  RegExpInput: ['input', '$_'],
  RegExpLastMatch: ['lastMatch', '$&'],
  RegExpLastParen: ['lastParen', '$+'],
  RegExpLeftContext: ['leftContext', '$`'],
  RegExpRightContext: ['rightContext', "$'"],
})) {
  legacyRegExpSlots.push(slot);
  for (const prop of props) {
    const accessors = createLegacyRegExpAccessors(slot, prop);
    legacyRegExpProperties.push(Object.freeze([prop, Object.freeze(accessors)]));
  }
}

for (let i = 1; i <= 9; i += 1) {
  const slot = `RegExpParen${i}`;
  const prop = `$${i}`;

  const accessors = createLegacyRegExpAccessors(slot, prop);

  legacyRegExpSlots.push(slot);
  legacyRegExpProperties.push(Object.freeze([prop, Object.freeze(accessors)]));
}

Object.freeze(legacyRegExpSlots);
Object.freeze(legacyRegExpProperties);

export function BootstrapRegExp(realmRec) {
  const proto = realmRec.Intrinsics['%RegExp.prototype%'];

  const featureLegacyRegExp = surroundingAgent.feature('legacy-regexp');

  const cons = BootstrapConstructor(realmRec, RegExpConstructor, 'RegExp', 2, proto, [
    ...(featureLegacyRegExp ? legacyRegExpProperties : []),
    [wellKnownSymbols.species, [RegExp_speciesGetter]],
  ], featureLegacyRegExp ? [...legacyRegExpSlots] : []);

  if (featureLegacyRegExp) {
    const emptyString = new Value('');

    cons.RegExpInput = emptyString;
    cons.RegExpLastMatch = emptyString;
    cons.RegExpLastParen = emptyString;
    cons.RegExpLeftContext = emptyString;
    cons.RegExpRightContext = emptyString;
    cons.RegExpParen1 = emptyString;
    cons.RegExpParen2 = emptyString;
    cons.RegExpParen3 = emptyString;
    cons.RegExpParen4 = emptyString;
    cons.RegExpParen5 = emptyString;
    cons.RegExpParen6 = emptyString;
    cons.RegExpParen7 = emptyString;
    cons.RegExpParen8 = emptyString;
    cons.RegExpParen9 = emptyString;
  }

  realmRec.Intrinsics['%RegExp%'] = cons;
}
