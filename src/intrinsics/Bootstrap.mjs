import {
  CreateBuiltinFunction,
  SetFunctionLength,
  SetFunctionName,
  ObjectCreate,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Value,
  SymbolValue,
} from '../value.mjs';

export function BootstrapPrototype(realmRec, props, Prototype) {
  const proto = ObjectCreate(Prototype);

  for (const [n, v, len] of props) {
    let value;
    const name = n instanceof Value ? n : new Value(n);
    if (typeof v === 'function') {
      value = CreateBuiltinFunction(v, [], realmRec);
      SetFunctionName(value, name);
      SetFunctionLength(value, new Value(len));
    } else {
      value = v;
    }
    proto.DefineOwnProperty(name, Descriptor({
      Value: value,
      Writable: new Value(true),
      Enumerable: new Value(false),
      Configurable: new Value(!(value instanceof SymbolValue)),
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
    Writable: new Value(true),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  }));

  Prototype.DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: cons,
    Writable: new Value(true),
    Enumerable: new Value(false),
    Configurable: new Value(true),
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
      Writable: new Value(true),
      Enumerable: new Value(false),
      Configurable: new Value(!(value instanceof SymbolValue)),
    }));
  }

  return cons;
}
