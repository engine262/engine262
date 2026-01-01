import {
  Descriptor,
  type JSStringValue,
  SymbolValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import {
  KeyForSymbol,
  Realm,
  SameValue,
  ToString,
  type FunctionObject,
  type OrdinaryObject,
} from '#self';

export interface GlobalSymbolRegistryRecord {
  readonly Key: JSStringValue;
  readonly Symbol: SymbolValue;
}
export const GlobalSymbolRegistry: GlobalSymbolRegistryRecord[] = [];

export interface SymbolObject extends OrdinaryObject {
  readonly SymbolData: SymbolValue;
}
export function isSymbolObject(o: Value): o is SymbolObject {
  return 'SymbolData' in o;
}
/** https://tc39.es/ecma262/#sec-symbol-description */
function* SymbolConstructor(this: FunctionObject, [description = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. If NewTarget is not undefined, throw a TypeError exception.
  if (NewTarget !== Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', this);
  }
  // 2. If description is undefined, let descString be undefined.
  let descString;
  if (description === Value.undefined) {
    descString = Value.undefined;
  } else { // 3. Else, let descString be ? ToString(description).
    descString = Q(yield* ToString(description));
  }
  // 4. Return a new unique Symbol value whose [[Description]] value is descString.
  return new SymbolValue(descString);
}

/** https://tc39.es/ecma262/#sec-symbol.for */
function* Symbol_for([key = Value.undefined]: Arguments): ValueEvaluator {
  // 1. Let stringKey be ? ToString(key).
  const stringKey = Q(yield* ToString(key));
  // 2. For each element e of the GlobalSymbolRegistry List, do
  for (const e of GlobalSymbolRegistry) {
    // a. If SameValue(e.[[Key]], stringKey) is true, return e.[[Symbol]].
    if (SameValue(e.Key, stringKey) === Value.true) {
      return e.Symbol;
    }
  }
  // 3. Assert: GlobalSymbolRegistry does not currently contain an entry for stringKey.
  // 4. Let newSymbol be a new unique Symbol value whose [[Description]] value is stringKey.
  const newSymbol = new SymbolValue(stringKey);
  // 5. Append the Record { [[Key]]: stringKey, [[Symbol]]: newSymbol } to the GlobalSymbolRegistry List.
  GlobalSymbolRegistry.push({ Key: stringKey, Symbol: newSymbol });
  // 6. Return newSymbol.
  return newSymbol;
}

/** https://tc39.es/ecma262/#sec-symbol.keyfor */
function Symbol_keyFor([sym = Value.undefined]: Arguments) {
  // 1. If Type(sym) is not Symbol, throw a TypeError exception.
  if (!(sym instanceof SymbolValue)) {
    return surroundingAgent.Throw('TypeError', 'NotASymbol', sym);
  }
  // 2. Return KeyForSymbol(sym).
  return KeyForSymbol(sym);
}

export function bootstrapSymbol(realmRec: Realm) {
  const symbolConstructor = bootstrapConstructor(realmRec, SymbolConstructor, 'Symbol', 0, realmRec.Intrinsics['%Symbol.prototype%'], [
    ['for', Symbol_for, 1],
    ['keyFor', Symbol_keyFor, 1],
  ]);

  for (const [name, sym] of Object.entries(wellKnownSymbols)) {
    X(symbolConstructor.DefineOwnProperty(Value(name), Descriptor({
      Value: sym,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  }

  X(symbolConstructor.DefineOwnProperty(Value('prototype'), Descriptor({
    Value: realmRec.Intrinsics['%Symbol.prototype%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%Symbol%'] = symbolConstructor;
}
