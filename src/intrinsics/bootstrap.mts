import {
  Assert,
  CreateBuiltinFunction,
  OrdinaryObjectCreate,
  type NativeAsyncFunctionSteps,
  type NativeFunctionSteps,
  type Realm,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import {
  Descriptor,
  ObjectValue,
  PrivateName,
  Value,
  wellKnownSymbols,
  type PropertyKeyValue,
} from '../value.mjs';

/** https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects */

export type MethodPropValue = NativeFunctionSteps;
export type AsyncMethodPropValue = NativeAsyncFunctionSteps;
export type AccessorPropValue = readonly [getter?: Value | NativeFunctionSteps, setter?: Value | NativeFunctionSteps];
export type MethodProp = readonly [name: PropertyKeyValue | PrivateName | string, value: NativeFunctionSteps, length: number, descriptor?: Partial<Pick<Descriptor, 'Enumerable' | 'Configurable' | 'Writable'>>, async?: false];
export type AsyncMethodProp = readonly [name: PropertyKeyValue | PrivateName | string, value: NativeAsyncFunctionSteps, length: number, descriptor: Partial<Pick<Descriptor, 'Enumerable' | 'Configurable' | 'Writable'>> | undefined, async: true];
export type AccessorProp = readonly [name: PropertyKeyValue | PrivateName | string, value: AccessorPropValue, length?: undefined, descriptor?: Partial<Pick<Descriptor, 'Enumerable' | 'Configurable'>>, async?: false];
export type DataProp = readonly [name: PropertyKeyValue | PrivateName | string, value: Value, length?: undefined, descriptor?: Partial<Pick<Descriptor, 'Enumerable' | 'Configurable' | 'Writable'>>, async?: false];
export type Prop = AccessorProp | MethodProp | AsyncMethodProp | DataProp;
export type Props = readonly (Prop | undefined)[];

export function assignProps(realmRec: Realm, obj: ObjectValue, props: Props) {
  for (const item of props) {
    if (item === undefined) {
      continue;
    }
    const [n, v, len, descriptor, async] = item;
    const name = n instanceof Value ? n : Value(n);
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
        getter = CreateBuiltinFunction(
          getter,
          0,
          name,
          [],
          realmRec,
          undefined,
          Value('get'),
        );
      }
      if (typeof setter === 'function') {
        setter = CreateBuiltinFunction(
          setter,
          1,
          name,
          [],
          realmRec,
          undefined,
          Value('set'),
        );
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
        value = CreateBuiltinFunction(v, len, name, [], realmRec, undefined, undefined, undefined, async ? Value.true : Value.false);
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

export function bootstrapPrototype(realmRec: Realm, props: Props, Prototype: ObjectValue, stringTag: string) {
  Assert(Prototype !== undefined);
  const proto = OrdinaryObjectCreate(Prototype);

  assignProps(realmRec, proto, props);

  if (stringTag !== undefined) {
    X(proto.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
      Value: Value(stringTag),
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  return proto;
}

export function bootstrapConstructor(realmRec: Realm, Constructor: NativeFunctionSteps, name: string, length: number, Prototype: ObjectValue, props: Props = []) {
  const cons = CreateBuiltinFunction(
    Constructor,
    length,
    Value(name),
    [],
    realmRec,
    undefined,
    undefined,
    Value.true,
  );

  X(cons.DefineOwnProperty(Value('prototype'), Descriptor({
    Value: Prototype,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  X(Prototype.DefineOwnProperty(Value('constructor'), Descriptor({
    Value: cons,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  assignProps(realmRec, cons, props);

  return cons;
}
