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
import { surroundingAgent } from '../engine.mjs';
import { X } from '../completion.mjs';

const kFlagDisabled = Symbol('kFlagDisabled');

export function BootstrapPrototype(realmRec, props, Prototype, stringTag) {
  Assert(Prototype !== undefined);
  const proto = ObjectCreate(Prototype);

  for (const [n, v, len, descriptor] of props) {
    if (n === kFlagDisabled) {
      continue;
    }
    let value;
    const name = n instanceof Value ? n : new Value(n);
    if (typeof v === 'function') {
      Assert(typeof len === 'number');
      value = CreateBuiltinFunction(v, [], realmRec);
      X(SetFunctionName(value, name));
      X(SetFunctionLength(value, new Value(len)));
    } else {
      value = v;
    }
    X(proto.DefineOwnProperty(name, Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
      ...descriptor,
    })));
  }

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

export function BootstrapConstructor(realmRec, Constructor, name, length, Prototype, props) {
  const cons = CreateBuiltinFunction(Constructor, [], realmRec);

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

  for (const [n, v, len, descriptor] of props) {
    if (n === kFlagDisabled) {
      continue;
    }
    let value;
    const name = n instanceof Value ? n : new Value(n); // eslint-disable-line no-shadow
    if (typeof v === 'function') {
      value = CreateBuiltinFunction(v, [], realmRec);
      X(SetFunctionName(value, name));
      X(SetFunctionLength(value, new Value(len)));
    } else {
      value = v;
    }
    X(cons.DefineOwnProperty(name, Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: value instanceof SymbolValue ? Value.false : Value.true,
      ...descriptor,
    })));
  }

  return cons;
}

export function FlaggedFeature(name, ...args) {
  if (surroundingAgent.hostDefinedOptions.flags.includes(name)) {
    return args;
  }
  return [kFlagDisabled];
}
