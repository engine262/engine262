import {
  UndefinedValue,
  SymbolValue,
  ObjectValue,
  New as NewValue,
} from './value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
} from './abstract-ops/all.mjs';
import {
  NewGlobalEnvironment,
} from './environment.mjs';
import {
  surroundingAgent,
} from './engine.mjs';

import { CreateObjectPrototype } from './intrinsics/ObjectPrototype.mjs';
import { CreateObject } from './intrinsics/Object.mjs';
import { CreateArrayPrototype } from './intrinsics/ArrayPrototype.mjs';
import { CreateArray } from './intrinsics/Array.mjs';
import { CreateBooleanPrototype } from './intrinsics/BooleanPrototype.mjs';
import { CreateBoolean } from './intrinsics/Boolean.mjs';
// import { CreateFunctionPrototype } from './intrinsics/FunctionPrototype.mjs';
import { CreateSymbolPrototype } from './intrinsics/SymbolPrototype.mjs';
import { CreateSymbol } from './intrinsics/Symbol.mjs';
import { CreateMath } from './intrinsics/Math.mjs';

/* ::
type IntrinsicMap = {
 [string]: Value,
};
*/

// https://tc39.github.io/ecma262/#sec-code-realms
// 8.2 Realms
export class Realm {
  /* ::
  Intrinsics: IntrinsicMap
  GlobalObject: ?ObjectValue
  GlobalEnv: ?EnvironmentRecord
  TemplateMap: ?Object
  HostDefined: ?Object
  */
  constructor() {
    // $FlowFixMe
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnv = undefined;
    this.TemplateMap = undefined;
    this.HostDefined = undefined;
  }
}

// 8.2.1 CreateRealm
export function CreateRealm() {
  const realmRec = new Realm();
  CreateIntrinsics(realmRec);
  realmRec.GlobalObject = undefined;
  realmRec.GlobalEnv = undefined;
  realmRec.TemplateMap = undefined;
  return realmRec;
}

// 8.2.2 CreateIntrinsics
export function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  // %Array%
  // %ArrayBuffer%
  // %ArrayBufferPrototype%
  // %ArrayIteratorPrototype%
  // %ArrayPrototype%
  // %ArrayProto_entries%
  // %ArrayProto_forEach%
  // %ArrayProto_keys%
  // %ArrayProto_values%
  // %AsyncFromSyncIteratorPrototype%
  // %AsyncFunction%
  // %AsyncFunctionPrototype%
  // %AsyncGenerator%
  // %AsyncGeneratorFunction%
  // %AsyncGeneratorPrototype%
  // %AsyncIteratorPrototype%
  // %Atomics%
  // %Boolean%
  // %BooleanPrototype%
  // %DataView%
  // %DataViewPrototype%
  // %Date%
  // %DatePrototype%
  // %decodeURI%
  // %decodeURIComponent%
  // %encodeURI%
  // %encodeURIComponent%
  // %Error%
  // %ErrorPrototype%
  // %eval%
  // %EvalError%
  // %EvalErrorPrototype%
  // %Float32Array%
  // %Float32ArrayPrototype%
  // %Float64Array%
  // %Float64ArrayPrototype%
  // %Function%
  // %FunctionPrototype%
  // %Generator%
  // %GeneratorFunction%
  // %GeneratorPrototype%
  // %Int8Array%
  // %Int8ArrayPrototype%
  // %Int16Array%
  // %Int16ArrayPrototype%
  // %Int32Array%
  // %Int32ArrayPrototype%
  // %isFinite%
  // %isNaN%
  // %IteratorPrototype%
  // %JSON%
  // %JSONParse%
  // %JSONStringify%
  // %Map%
  // %MapIteratorPrototype%
  // %MapPrototype%
  // %Math%
  // %Number%
  // %NumberPrototype%
  // %Object%
  // %ObjectPrototype%
  // %ObjProto_toString%
  // %ObjProto_valueOf%
  // %parseFloat%
  // %parseInt%
  // %Promise%
  // %PromisePrototype%
  // %PromiseProto_then%
  // %Promise_all%
  // %Promise_reject%
  // %Promise_resolve%
  // %Proxy%
  // %RangeError%
  // %RangeErrorPrototype%
  // %ReferenceError%
  // %ReferenceErrorPrototype%
  // %Reflect%
  // %RegExp%
  // %RegExpPrototype%
  // %Set%
  // %SetIteratorPrototype%
  // %SetPrototype%
  // %SharedArrayBuffer%
  // %SharedArrayBufferPrototype%
  // %String%
  // %StringIteratorPrototype%
  // %StringPrototype%
  // %Symbol%
  // %SymbolPrototype%
  // %SyntaxError%
  // %SyntaxErrorPrototype%
  // %ThrowTypeError%
  // %TypedArray%
  // %TypedArrayPrototype%
  // %TypeError%
  // %TypeErrorPrototype%
  // %Uint8Array%
  // %Uint8ArrayPrototype%
  // %Uint8ClampedArray%
  // %Uint8ClampedArrayPrototype%
  // %Uint16Array%
  // %Uint16ArrayPrototype%
  // %Uint32Array%
  // %Uint32ArrayPrototype%
  // %URIError%
  // %URIErrorPrototype%
  // %WeakMap%
  // %WeakMapPrototype%
  // %WeakSet%
  // %WeakSetPrototype%

  // Use ObjectValue() constructor instead of ObjectCreate as we don't have a
  // current Realm record yet.
  const objProto = new ObjectValue(realmRec, NewValue(null));
  intrinsics['%ObjectPrototype%'] = objProto;

  const thrower = CreateBuiltinFunction(() => {
    surroundingAgent.Throw('TypeError');
  }, [], realmRec, NewValue(null));
  intrinsics['%ThrowTypeError%'] = thrower;

  const funcProto = CreateBuiltinFunction(() => {}, [], realmRec, objProto);
  intrinsics['%FunctionPrototype%'] = funcProto;

  thrower.SetPrototypeOf(funcProto);

  CreateObjectPrototype(realmRec);
  CreateObject(realmRec);

  CreateArrayPrototype(realmRec);
  CreateArray(realmRec);

  CreateBooleanPrototype(realmRec);
  CreateBoolean(realmRec);

  // CreateFunctionPrototype(realmRec);

  CreateSymbolPrototype(realmRec);
  CreateSymbol(realmRec);

  CreateMath(realmRec);

  return intrinsics;
}

// 8.2.3 SetRealmGlobalObject
export function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  if (globalObj instanceof UndefinedValue) {
    const intrinsics = realmRec.Intrinsics;
    globalObj = ObjectCreate(intrinsics.ObjectPrototype);
  }

  if (thisValue instanceof UndefinedValue) {
    thisValue = globalObj;
  }

  realmRec.GlobalObject = globalObj;

  const newGlobalEnv = NewGlobalEnvironment(globalObj, thisValue);
  realmRec.GlobalEnv = newGlobalEnv;

  return realmRec;
}

// 8.2.4 SetDefaultGlobalBindings
export function SetDefaultGlobalBindings(realmRec) {
  const global = realmRec.GlobalObject;

  return global;
}
