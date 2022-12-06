import {
  ObjectValue,
  SymbolValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  SymbolDescriptiveString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-thissymbolvalue
function thisSymbolValue(value) {
  // 1. If Type(value) is Symbol, return value.
  if (value instanceof SymbolValue) {
    return value;
  }
  // 2. If Type(value) is Object and value has a [[SymbolData]] internal slot, then
  if (value instanceof ObjectValue && 'SymbolData' in value) {
    // a. Let s be value.[[SymbolData]].
    const s = value.SymbolData;
    // b. Assert: Type(s) is Symbol.
    Assert(s instanceof SymbolValue);
    // c. Return s.
    return s;
  }
  // 3. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Symbol', value);
}

// #sec-symbol.prototype.description
function SymbolProto_descriptionGetter(argList, { thisValue }) {
  // 1. Let s be the this value.
  const s = thisValue;
  // 2. Let sym be ? thisSymbolValue(s).
  const sym = Q(thisSymbolValue(s));
  // 3. Return sym.[[Description]].
  return sym.Description;
}

// #sec-symbol.prototype.tostring
function SymbolProto_toString(argList, { thisValue }) {
  // 1. Let sym be ? thisSymbolValue(this value).
  const sym = Q(thisSymbolValue(thisValue));
  // 2. Return SymbolDescriptiveString(sym).
  return SymbolDescriptiveString(sym);
}

// #sec-symbol.prototype.valueof
function SymbolProto_valueOf(argList, { thisValue }) {
  // 1. Return ? thisSymbolValue(this value).
  return Q(thisSymbolValue(thisValue));
}

// #sec-symbol.prototype-@@toprimitive
function SymbolProto_toPrimitive(argList, { thisValue }) {
  // 1. Return ? thisSymbolValue(this value).
  return Q(thisSymbolValue(thisValue));
}

export function bootstrapSymbolPrototype(realmRec) {
  const override = {
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  };
  const proto = bootstrapPrototype(realmRec, [
    ['toString', SymbolProto_toString, 0],
    ['description', [SymbolProto_descriptionGetter]],
    ['valueOf', SymbolProto_valueOf, 0],
    [wellKnownSymbols.toPrimitive, SymbolProto_toPrimitive, 1, override],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Symbol');

  realmRec.Intrinsics['%Symbol.prototype%'] = proto;
}
