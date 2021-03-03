import { surroundingAgent } from '../engine.mjs';
import { ReferenceRecord, Type, Value } from '../value.mjs';
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
} from './all.mjs';

// #sec-ispropertyreference
export function IsPropertyReference(V) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[Base]] is unresolvable, return false.
  if (V.Base === 'unresolvable') {
    return Value.false;
  }
  // 3. If Type(V.[[Base]]) is Boolean, String, Symbol, BigInt, Number, or Object, return true; otherwise return false.
  const type = Type(V.Base);
  switch (type) {
    case 'Boolean':
    case 'String':
    case 'Symbol':
    case 'BigInt':
    case 'Number':
    case 'Object':
      return Value.true;
    default:
      return Value.false;
  }
}

// #sec-isunresolvablereference
export function IsUnresolvableReference(V) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[Base]] is unresolvable, return true; otherwise return false.
  return V.Base === 'unresolvable' ? Value.true : Value.false;
}

// #sec-issuperreference
export function IsSuperReference(V) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[ThisValue]] is not empty, return true; otherwise return false.
  return V.ThisValue !== undefined ? Value.true : Value.false;
}

// #sec-getvalue
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
    // a. Let baseObj be ! ToObject(V.[[Base]]).
    const baseObj = X(ToObject(V.Base));
    // b. Return ? baseObj.[[Get]](V.[[ReferencedName]], GetThisValue(V)).
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

// #sec-putvalue
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
    // b. Let succeeded be ? baseObj.[[Set]](V.[[ReferencedName]], W, GetThisValue(V)).
    const succeeded = Q(baseObj.Set(V.ReferencedName, W, GetThisValue(V)));
    // c. If succeeded is false and V.[[Strict]] is true, throw a TypeError exception.
    if (succeeded === Value.false && V.Strict === Value.true) {
      return surroundingAgent.Throw('TypeError', 'CannotSetProperty', V.ReferencedName, V.Base);
    }
    // d. Return.
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

// #sec-getthisvalue
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

// #sec-initializereferencedbinding
export function InitializeReferencedBinding(V, W) {
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
  return base.InitializeBinding(V.ReferencedName, W);
}
