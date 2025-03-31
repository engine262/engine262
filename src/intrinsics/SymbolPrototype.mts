import {
  ObjectValue,
  SymbolValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  Assert,
  Realm,
  SymbolDescriptiveString,
} from '../abstract-ops/all.mts';
import { Q, type ValueCompletion } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-thissymbolvalue */
function thisSymbolValue(value: Value) {
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

/** https://tc39.es/ecma262/#sec-symbol.prototype.description */
function SymbolProto_descriptionGetter(_argList: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let s be the this value.
  const s = thisValue;
  // 2. Let sym be ? thisSymbolValue(s).
  const sym = Q(thisSymbolValue(s));
  // 3. Return sym.[[Description]].
  return sym.Description;
}

/** https://tc39.es/ecma262/#sec-symbol.prototype.tostring */
function SymbolProto_toString(_argList: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let sym be ? thisSymbolValue(this value).
  const sym = Q(thisSymbolValue(thisValue));
  // 2. Return SymbolDescriptiveString(sym).
  return SymbolDescriptiveString(sym);
}

/** https://tc39.es/ecma262/#sec-symbol.prototype.valueof */
function SymbolProto_valueOf(_argList: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Return ? thisSymbolValue(this value).
  return Q(thisSymbolValue(thisValue));
}

/** https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive */
function SymbolProto_toPrimitive(_argList: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Return ? thisSymbolValue(this value).
  return Q(thisSymbolValue(thisValue));
}

export function bootstrapSymbolPrototype(realmRec: Realm) {
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
