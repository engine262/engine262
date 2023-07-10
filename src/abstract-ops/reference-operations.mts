// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  ReferenceRecord,
  Value,
  PrivateName,
} from '../value.mjs';
import {
  NormalCompletion,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import { EnvironmentRecord } from '../environment.mjs';
import {
  Assert,
  GetGlobalObject,
  ToObject,
  Set,
  PrivateGet,
  PrivateSet,
} from './all.mjs';

/** https://tc39.es/ecma262/#sec-ispropertyreference */
export function IsPropertyReference(V) {
  // 1. If V.[[Base]] is unresolvable, return false.
  if (V.Base === 'unresolvable') {
    return Value.false;
  }
  // 2. If V.[[Base]] is an Environment Record, return false; otherwise return true.
  return V.Base instanceof EnvironmentRecord ? Value.false : Value.true;
}

/** https://tc39.es/ecma262/#sec-isunresolvablereference */
export function IsUnresolvableReference(V) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[Base]] is unresolvable, return true; otherwise return false.
  return V.Base === 'unresolvable' ? Value.true : Value.false;
}

/** https://tc39.es/ecma262/#sec-issuperreference */
export function IsSuperReference(V) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[ThisValue]] is not empty, return true; otherwise return false.
  return V.ThisValue !== undefined ? Value.true : Value.false;
}

/** https://tc39.es/ecma262/#sec-isprivatereference */
export function IsPrivateReference(V) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[ReferencedName]] is a Private Name, return true; otherwise return false.
  return V.ReferencedName instanceof PrivateName ? Value.true : Value.false;
}

/** https://tc39.es/ecma262/#sec-getvalue */
export function GetValue(V) {
  // 1. ReturnIfAbrupt(V).
  ReturnIfAbrupt(V);
  // 2. If V is not a Reference Record, return V.
  if (!(V instanceof ReferenceRecord)) {
    return V;
  }
  // 3. If IsUnresolvableReference(V) is true, throw a ReferenceError exception.
  if (IsUnresolvableReference(V) === Value.true) {
    return surroundingAgent.Throw('ReferenceError', 'NotDefined', V.ReferencedName);
  }
  // 4. If IsPropertyReference(V) is true, then
  if (IsPropertyReference(V) === Value.true) {
    // a. Let baseObj be ? ToObject(V.[[Base]]).
    const baseObj = Q(ToObject(V.Base));
    // b. If IsPrivateReference(V) is true, then
    if (IsPrivateReference(V) === Value.true) {
      // i. Return ? PrivateGet(V.[[ReferencedName]], baseObj).
      return Q(PrivateGet(V.ReferencedName, baseObj));
    }
    // c. Return ? baseObj.[[Get]](V.[[ReferencedName]], GetThisValue(V)).
    return Q(baseObj.Get(V.ReferencedName, GetThisValue(V)));
  } else { // 5. Else,
    // a. Let base be V.[[Base]].
    const base = V.Base;
    // b. Assert: base is an Environment Record.
    Assert(base instanceof EnvironmentRecord);
    // c. Return ? base.GetBindingValue(V.[[ReferencedName]], V.[[Strict]]).
    return Q(base.GetBindingValue(V.ReferencedName, V.Strict));
  }
}

/** https://tc39.es/ecma262/#sec-putvalue */
export function PutValue(V, W) {
  // 1. ReturnIfAbrupt(V).
  ReturnIfAbrupt(V);
  // 2. ReturnIfAbrupt(W).
  ReturnIfAbrupt(W);
  // 3. If V is not a Reference Record, throw a ReferenceError exception.
  if (!(V instanceof ReferenceRecord)) {
    return surroundingAgent.Throw('ReferenceError', 'InvalidAssignmentTarget');
  }
  // 4. If IsUnresolvableReference(V) is true, then
  if (IsUnresolvableReference(V) === Value.true) {
    // a. If V.[[Strict]] is true, throw a ReferenceError exception.
    if (V.Strict === Value.true) {
      return surroundingAgent.Throw('ReferenceError', 'NotDefined', V.ReferencedName);
    }
    // b. Let globalObj be GetGlobalObject().
    const globalObj = GetGlobalObject();
    // c. Return ? Set(globalObj, V.[[ReferencedName]], W, false).
    return Q(Set(globalObj, V.ReferencedName, W, Value.false));
  }
  // 5. If IsPropertyReference(V) is true, then
  if (IsPropertyReference(V) === Value.true) {
    // a. Let baseObj be ! ToObject(V.[[Base]]).
    const baseObj = X(ToObject(V.Base));
    // b. If IsPrivateReference(V) is true, then
    if (IsPrivateReference(V) === Value.true) {
      // i. Return ? PrivateSet(V.[[ReferencedName]], baseObj, W).
      return Q(PrivateSet(V.ReferencedName, baseObj, W));
    }
    // c. Let succeeded be ? baseObj.[[Set]](V.[[ReferencedName]], W, GetThisValue(V)).
    const succeeded = Q(baseObj.Set(V.ReferencedName, W, GetThisValue(V)));
    // d. If succeeded is false and V.[[Strict]] is true, throw a TypeError exception.
    if (succeeded === Value.false && V.Strict === Value.true) {
      return surroundingAgent.Throw('TypeError', 'CannotSetProperty', V.ReferencedName, V.Base);
    }
    // e. Return.
    return NormalCompletion(Value.undefined);
  } else { // 6. Else,
    // a. Let base be V.[[Base]].
    const base = V.Base;
    // b. Assert: base is an Environment Record.
    Assert(base instanceof EnvironmentRecord);
    // c. Return ? base.SetMutableBinding(V.[[ReferencedName]], W, V.[[Strict]]) (see 9.1).
    return Q(base.SetMutableBinding(V.ReferencedName, W, V.Strict));
  }
}

/** https://tc39.es/ecma262/#sec-getthisvalue */
export function GetThisValue(V) {
  // 1. Assert: IsPropertyReference(V) is true.
  Assert(IsPropertyReference(V) === Value.true);
  // 2. If IsSuperReference(V) is true, return V.[[ThisValue]]; otherwise return V.[[Base]].
  if (IsSuperReference(V) === Value.true) {
    return V.ThisValue;
  } else {
    return V.Base;
  }
}

/** https://tc39.es/ecma262/#sec-initializereferencedbinding */
export function InitializeReferencedBinding(V, W, hint: 'normal' | 'sync-dispose' | 'async-dispose') {
  // TODO(rbuckton): remove
  Assert(!!hint); // NON-SPEC
  // 1. ReturnIfAbrupt(V).
  ReturnIfAbrupt(V);
  // 2. ReturnIfAbrupt(W).
  ReturnIfAbrupt(W);
  // 3. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 4. Assert: IsUnresolvableReference(V) is false.
  Assert(IsUnresolvableReference(V) === Value.false);
  // 5. Let base be V.[[Base]].
  const base = V.Base;
  // 6. Assert: base is an Environment Record.
  Assert(base instanceof EnvironmentRecord);
  // 7. Return base.InitializeBinding(V.[[ReferencedName]], W).
  return base.InitializeBinding(V.ReferencedName, W, hint);
}

/** https://tc39.es/ecma262/#sec-makeprivatereference */
export function MakePrivateReference(baseValue, privateIdentifier) {
  // 1. Let privEnv be the running execution context's PrivateEnvironment.
  const privEnv = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 2. Assert: privEnv is not null.
  Assert(privEnv !== Value.null);
  // 3. Let privateName be ! ResolvePrivateIdentifier(privEnv, privateIdentifier).
  const privateName = X(ResolvePrivateIdentifier(privEnv, privateIdentifier));
  // 4. Return the Reference Record { [[Base]]: baseValue, [[ReferencedName]]: privateName, [[Strict]]: true, [[ThisValue]]: empty }.
  return new ReferenceRecord({
    Base: baseValue,
    ReferencedName: privateName,
    Strict: Value.true,
    ThisValue: undefined,
  });
}

/** https://tc39.es/ecma262/#sec-resolve-private-identifier */
export function ResolvePrivateIdentifier(privEnv, identifier) {
  // 1. Let names be privEnv.[[Names]].
  const names = privEnv.Names;
  // 2. If names contains a Private Name whose [[Description]] is identifier, then
  const name = names.find((n) => n.Description.stringValue() === identifier.stringValue());
  if (name) {
    // a. Let name be that Private Name.
    // b. Return name.
    return name;
  } else { // 3. Else,
    // a. Let outerPrivEnv be privEnv.[[OuterPrivateEnvironment]].
    const outerPrivEnv = privEnv.OuterPrivateEnvironment;
    // b. Assert: outerPrivEnv is not null.
    Assert(outerPrivEnv !== Value.null);
    // c. Return ResolvePrivateIdentifier(outerPrivEnv, identifier).
    return ResolvePrivateIdentifier(outerPrivEnv, identifier);
  }
}
