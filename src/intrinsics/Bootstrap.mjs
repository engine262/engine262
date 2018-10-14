import {
  Assert,
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  SymbolValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';

export function BootstrapPrototype(realmRec, props, Prototype, stringTag) {
  const proto = ObjectCreate(Prototype);

  for (const [n, v, len, descriptor] of props) {
    let value;
    const name = n instanceof Value ? n : new Value(n);
    if (typeof v === 'function') {
      Assert(typeof len === 'number');
      value = CreateBuiltinFunction(v, [], realmRec);
      SetFunctionName(value, name);
      SetFunctionLength(value, new Value(len));
    } else {
      value = v;
    }
    proto.DefineOwnProperty(name, Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
      ...descriptor,
    }));
  }

  if (stringTag !== undefined) {
    proto.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
      Value: new Value(stringTag),
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  }

  return proto;
}

export function BootstrapConstructor(realmRec, Constructor, name, length, Prototype, props) {
  const cons = CreateBuiltinFunction(Constructor, [], realmRec);

  SetFunctionName(cons, new Value(name));
  SetFunctionLength(cons, new Value(length));

  cons.DefineOwnProperty(new Value('prototype'), Descriptor({
    Value: Prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  }));

  Prototype.DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: cons,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  }));

  for (const [n, v, len] of props) {
    let value;
    const name = n instanceof Value ? n : new Value(n); // eslint-disable-line no-shadow
    if (typeof v === 'function') {
      value = CreateBuiltinFunction(v, [], realmRec);
      SetFunctionName(value, name);
      SetFunctionLength(value, new Value(len));
    } else {
      value = v;
    }
    cons.DefineOwnProperty(name, Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: value instanceof SymbolValue ? Value.false : Value.true,
    }));
  }

  return cons;
}
