import {
  Assert,
  CreateBuiltinFunction,
  OrdinaryObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { X } from '../completion.mjs';

// 17 #sec-ecmascript-standard-built-in-objects
export function assignProps(realmRec, obj, props) {
  for (const item of props) {
    if (item === undefined) {
      continue;
    }
    const [n, v, len, descriptor] = item;
    const name = n instanceof Value ? n : new Value(n);
    if (Array.isArray(v)) {
      // Every accessor property described in clauses 18 through 26 and in
      // Annex B.2 has the attributes { [[Enumerable]]: false,
      // [[Configurable]]: true } unless otherwise specified. If only a get
      // accessor function is described, the set accessor function is the
      // default value, undefined. If only a set accessor is described the get
      // accessor is the default value, undefined.
      let [
        getter = Value.undefined,
        setter = Value.undefined,
      ] = v;
      if (typeof getter === 'function') {
        getter = CreateBuiltinFunction(getter, [], realmRec);
        X(SetFunctionName(getter, name));
        X(SetFunctionLength(getter, new Value(0)));
      }
      if (typeof setter === 'function') {
        setter = CreateBuiltinFunction(setter, [], realmRec);
        X(SetFunctionName(setter, name));
        X(SetFunctionLength(setter, new Value(1)));
      }
      X(obj.DefineOwnProperty(name, Descriptor({
        Get: getter,
        Set: setter,
        Enumerable: Value.false,
        Configurable: Value.true,
        ...descriptor,
      })));
    } else {
      // Every other data property described in clauses 18 through 26 and in
      // Annex B.2 has the attributes { [[Writable]]: true, [[Enumerable]]:
      // false, [[Configurable]]: true } unless otherwise specified.
      let value;
      if (typeof v === 'function') {
        Assert(typeof len === 'number');
        value = CreateBuiltinFunction(v, [], realmRec);
        X(SetFunctionName(value, name));
        X(SetFunctionLength(value, new Value(len)));
      } else {
        value = v;
      }
      obj.properties.set(name, Descriptor({
        Value: value,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.true,
        ...descriptor,
      }));
    }
  }
}

export function BootstrapPrototype(realmRec, props, Prototype, stringTag) {
  Assert(Prototype !== undefined);
  const proto = OrdinaryObjectCreate(Prototype);

  assignProps(realmRec, proto, props);

  if (stringTag !== undefined) {
    X(proto.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
      Value: new Value(stringTag),
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  return proto;
}

export function BootstrapConstructor(realmRec, Constructor, name, length, Prototype, props = []) {
  const cons = CreateBuiltinFunction(Constructor, [], realmRec, undefined, Value.true);

  SetFunctionName(cons, new Value(name));
  SetFunctionLength(cons, new Value(length));

  X(cons.DefineOwnProperty(new Value('prototype'), Descriptor({
    Value: Prototype,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  X(Prototype.DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: cons,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  assignProps(realmRec, cons, props);

  return cons;
}
