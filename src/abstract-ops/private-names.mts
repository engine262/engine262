import { ObjectValue, PrivateName, Value } from '../value.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import { Q, X } from '../completion.mts';
import { PrivateElementRecord } from '../runtime-semantics/all.mts';
import { Assert, Call } from './all.mts';

/** https://tc39.es/ecma262/#sec-privateelementfind */
export function PrivateElementFind(P: PrivateName, O: ObjectValue) {
  const entry = O.PrivateElements.find((e) => e.Key === P);
  // 1. If O.[[PrivateElements]] contains a PrivateElement whose [[Key]] is P, then
  if (entry) {
    // a. Let entry be that PrivateElement.
    // b. Return entry.
    return entry;
  }
  // 2. Return empty.
  return undefined;
}

/** https://tc39.es/ecma262/#sec-privateget */
export function* PrivateGet(P: PrivateName, O: ObjectValue) {
  // 1. Let entry be ! PrivateElementFind(P, O).
  const entry = X(PrivateElementFind(P, O));
  // 2. If entry is empty, throw a TypeError exception.
  if (entry === undefined) {
    return surroundingAgent.Throw('TypeError', 'UnknownPrivateName', O, P);
  }
  // 3. If entry.[[Kind]] is field or method, then
  if (entry.Kind === 'field' || entry.Kind === 'method') {
    // a. Return entry.[[Value]].
    return entry.Value!;
  }
  // 4. Assert: entry.[[Kind]] is accessor.
  Assert(entry.Kind === 'accessor');
  // 5. If entry.[[Get]] is undefined, throw a TypeError exception.
  if (entry.Get === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'PrivateNameNoGetter', P);
  }
  // 6. Let getter be entry.[[Get]].
  const getter = entry.Get!;
  // 7. Return ? Call(getter, O).
  return Q(yield* Call(getter, O));
}

export function* PrivateSet(P: PrivateName, O: ObjectValue, value: Value) {
  // 1. Let entry be ! PrivateElementFind(P, O).
  const entry = X(PrivateElementFind(P, O));
  // 2. If entry is empty, throw a TypeError exception.
  if (entry === undefined) {
    return surroundingAgent.Throw('TypeError', 'UnknownPrivateName', O, P);
  }
  // 3. If entry.[[Kind]] is field, then
  if (entry.Kind === 'field') {
    // a. Set entry.[[Value]] to value.
    entry.Value = value;
  } else if (entry.Kind === 'method') { // 4. Else if entry.[[Kind]] is method, then
    // a. Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'PrivateNameIsMethod', P);
  } else { // 5. Else,
    // a. Assert: entry.[[Kind]] is accessor.
    Assert(entry.Kind === 'accessor');
    // b. If entry.[[Set]] is undefined, throw a TypeError exception.
    if (entry.Set === Value.undefined) {
      return surroundingAgent.Throw('TypeError', 'PrivateNameNoSetter', P);
    }
    // c. Let setter be entry.[[Set]].
    const setter = entry.Set!;
    // d. Perform ? Call(setter, O, « value »).
    Q(yield* Call(setter, O, [value]));
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-privatemethodoraccessoradd */
export function PrivateMethodOrAccessorAdd(method: PrivateElementRecord, O: ObjectValue) {
  // 1. Assert: method.[[Kind]] is either method or accessor.
  Assert(method.Kind === 'method' || method.Kind === 'accessor');
  // 2. Let entry be ! PrivateElementFind(method.[[Key]], O).
  const entry = X(PrivateElementFind(method.Key, O));
  // 3. If entry is not empty, throw a TypeError exception.
  if (entry !== undefined) {
    return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', method.Key);
  }
  // 4. Append method to O.[[PrivateElements]].
  O.PrivateElements.push(method);
  // 5. NOTE: The values for private methods and accessors are shared across instances.
  //          This step does not create a new copy of the method or accessor.
  return undefined;
}

/** https://tc39.es/ecma262/#sec-privatefieldadd */
export function PrivateFieldAdd(P: PrivateName, O: ObjectValue, value: Value) {
  // 1. Let entry be ! PrivateElementFind(P, O).
  const entry = X(PrivateElementFind(P, O));
  // 2. If entry is not empty, throw a TypeError exception.
  if (entry !== undefined) {
    return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', P);
  }
  // 3. Append PrivateElement { [[Key]]: P, [[Kind]]: field, [[Value]]: value } to O.[[PrivateElements]].
  O.PrivateElements.push(new PrivateElementRecord({
    Key: P,
    Kind: 'field',
    Value: value,
  }));
  return undefined;
}
