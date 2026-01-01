import { DynamicParsedCodeRecord, surroundingAgent } from '../host-defined/engine.mts';
import {
  ReferenceRecord,
  Value,
  PrivateName,
  JSStringValue,
  NullValue,
  ObjectValue,
} from '../value.mts';
import {
  Q,
  type PlainCompletion,
} from '../completion.mts';
import { __ts_cast__ } from '../helpers.mts';
import type { PlainEvaluator } from '../evaluator.mts';
import { ResolvePrivateIdentifier } from '../execution-context/PrivateEnvironment.mts';
import {
  Assert,
  ToObject,
  Set,
  PrivateGet,
  PrivateSet,
  IsPropertyKey,
  ToPropertyKey,
  getActiveScriptId,
} from './all.mts';
import { EnvironmentRecord, GetGlobalObject } from '#self';

/** https://tc39.es/ecma262/#sec-ispropertyreference */
export function IsPropertyReference(V: ReferenceRecord) {
  // 1. If V.[[Base]] is unresolvable, return false.
  if (V.Base === 'unresolvable') {
    return Value.false;
  }
  // 2. If V.[[Base]] is an Environment Record, return false; otherwise return true.
  return V.Base instanceof EnvironmentRecord ? Value.false : Value.true;
}
export type PropertyReference = ReferenceRecord & {
  readonly Base: Exclude<ReferenceRecord['Base'], 'unresolvable' | EnvironmentRecord>,
};

/** https://tc39.es/ecma262/#sec-isunresolvablereference */
export function IsUnresolvableReference(V: ReferenceRecord) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[Base]] is unresolvable, return true; otherwise return false.
  return V.Base === 'unresolvable' ? Value.true : Value.false;
}

/** https://tc39.es/ecma262/#sec-issuperreference */
export function IsSuperReference(V: ReferenceRecord) {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[ThisValue]] is not empty, return true; otherwise return false.
  return V.ThisValue !== undefined ? Value.true : Value.false;
}

/** https://tc39.es/ecma262/#sec-isprivatereference */
export function IsPrivateReference(V: ReferenceRecord): V is ReferenceRecord & { readonly ReferencedName: PrivateName } {
  // 1. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 2. If V.[[ReferencedName]] is a Private Name, return true; otherwise return false.
  return V.ReferencedName instanceof PrivateName;
}

/** https://tc39.es/ecma262/#sec-getvalue */
export function* GetValue(V: ReferenceRecord | Value): PlainEvaluator<Value> {
  // 1. If V is not a Reference Record, return V.
  if (!(V instanceof ReferenceRecord)) {
    return V;
  }
  // 2. If IsUnresolvableReference(V) is true, throw a ReferenceError exception.
  if (IsUnresolvableReference(V) === Value.true) {
    return surroundingAgent.Throw('ReferenceError', 'NotDefined', V.ReferencedName);
  }
  // 3. If IsPropertyReference(V) is true, then
  if (IsPropertyReference(V) === Value.true) {
    __ts_cast__<PropertyReference>(V);
    // a. Let baseObj be ? ToObject(V.[[Base]]).
    const baseObj = Q(ToObject(V.Base));
    // b. If IsPrivateReference(V) is true, then
    if (IsPrivateReference(V)) {
      // i. Return ? PrivateGet(baseObj, V.[[ReferencedName]]).
      return Q(yield* PrivateGet(baseObj, V.ReferencedName));
    }
    if (!IsPropertyKey(V.ReferencedName)) {
      V.ReferencedName = Q(yield* ToPropertyKey(V.ReferencedName as Value));
    }
    // c. Return ? baseObj.[[Get]](V.[[ReferencedName]], GetThisValue(V)).
    return Q(yield* baseObj.Get(V.ReferencedName, GetThisValue(V)));
  } else { // 5. Else,
    // a. Let base be V.[[Base]].
    const base = V.Base;
    // b. Assert: base is an Environment Record.
    Assert(base instanceof EnvironmentRecord);
    // c. Return ? base.GetBindingValue(V.[[ReferencedName]], V.[[Strict]]).
    return Q(yield* base.GetBindingValue(V.ReferencedName as JSStringValue, V.Strict));
  }
}

/** https://tc39.es/ecma262/#sec-putvalue */
export function* PutValue(V: ReferenceRecord | Value, W: Value): PlainEvaluator {
  // 1. If V is not a Reference Record, throw a ReferenceError exception.
  if (!(V instanceof ReferenceRecord)) {
    return surroundingAgent.Throw('ReferenceError', 'InvalidAssignmentTarget');
  }
  // 2. If IsUnresolvableReference(V) is true, then
  if (IsUnresolvableReference(V) === Value.true) {
    // a. If V.[[Strict]] is true, throw a ReferenceError exception.
    if (V.Strict === Value.true) {
      return surroundingAgent.Throw('ReferenceError', 'NotDefined', V.ReferencedName);
    }
    // b. Let globalObj be GetGlobalObject().
    const globalObj = GetGlobalObject();
    // c. Return ? Set(globalObj, V.[[ReferencedName]], W, false).
    Q(yield* Set(globalObj, V.ReferencedName as JSStringValue, W, Value.false));
    return undefined;
  }
  // 5. If IsPropertyReference(V) is true, then
  if (IsPropertyReference(V) === Value.true) {
    // a. Let baseObj be ? ToObject(V.[[Base]]).
    const baseObj = Q(ToObject(V.Base as JSStringValue));
    // b. If IsPrivateReference(V) is true, then
    if (IsPrivateReference(V)) {
      // i. Return ? PrivateSet(baseObj, V.[[ReferencedName]], W).
      return Q(yield* PrivateSet(baseObj, V.ReferencedName, W));
    }
    if (!IsPropertyKey(V.ReferencedName)) {
      V.ReferencedName = Q(yield* ToPropertyKey(V.ReferencedName as Value));
    }
    // c. Let succeeded be ? baseObj.[[Set]](V.[[ReferencedName]], W, GetThisValue(V)).
    const succeeded = Q(yield* baseObj.Set(V.ReferencedName, W, GetThisValue(V)));
    // d. If succeeded is false and V.[[Strict]] is true, throw a TypeError exception.
    if (succeeded === Value.false && V.Strict === Value.true) {
      return surroundingAgent.Throw('TypeError', 'CannotSetProperty', V.ReferencedName, V.Base);
    }
    // e. Return.
    return undefined;
  } else { // 6. Else,
    // a. Let base be V.[[Base]].
    const base = V.Base;
    // b. Assert: base is an Environment Record.
    Assert(base instanceof EnvironmentRecord);
    // c. Return ? base.SetMutableBinding(V.[[ReferencedName]], W, V.[[Strict]]) (see 9.1).
    return Q(yield* base.SetMutableBinding(V.ReferencedName as JSStringValue, W, V.Strict));
  }
}

/** https://tc39.es/ecma262/#sec-getthisvalue */
export function GetThisValue(V: ReferenceRecord) {
  // 1. Assert: IsPropertyReference(V) is true.
  Assert(IsPropertyReference(V) === Value.true);
  // 2. If IsSuperReference(V) is true, return V.[[ThisValue]]; otherwise return V.[[Base]].
  if (IsSuperReference(V) === Value.true) {
    return V.ThisValue!;
  } else {
    return V.Base as Value;
  }
}

/** https://tc39.es/ecma262/#sec-initializereferencedbinding */
export function* InitializeReferencedBinding(V: PlainCompletion<ReferenceRecord>, W: Value): PlainEvaluator {
  Q(V);
  Q(W);
  // 3. Assert: V is a Reference Record.
  Assert(V instanceof ReferenceRecord);
  // 4. Assert: IsUnresolvableReference(V) is false.
  Assert(IsUnresolvableReference(V) === Value.false);
  // 5. Let base be V.[[Base]].
  const base = V.Base;
  // 6. Assert: base is an Environment Record.
  Assert(base instanceof EnvironmentRecord);
  // 7. Return base.InitializeBinding(V.[[ReferencedName]], W).
  return yield* base.InitializeBinding(V.ReferencedName as JSStringValue, W);
}

/** https://tc39.es/ecma262/#sec-makeprivatereference */
export function MakePrivateReference(baseValue: Value, privateIdentifier: JSStringValue) {
  // 1. Let privEnv be the running execution context's PrivateEnvironment.
  const privEnv = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 2. Assert: privEnv is not null.
  // but we allow private reference to be accessed directly in the inspector eval
  if (privEnv instanceof NullValue) {
    const scriptId = getActiveScriptId();
    const script = surroundingAgent.parsedSources.get(scriptId!);
    if (script instanceof DynamicParsedCodeRecord && script?.HostDefined?.isInspectorEval) {
      let privateName;
      if (baseValue instanceof ObjectValue) {
        privateName = baseValue.PrivateElements.find((elem) => elem.Key.Description.stringValue() === privateIdentifier.stringValue())?.Key;
      }
      privateName ??= new PrivateName(privateIdentifier);
      return new ReferenceRecord({
        Base: baseValue,
        ReferencedName: privateName,
        Strict: Value.true,
        ThisValue: undefined,
      });
    } else {
      Assert(!(privEnv instanceof NullValue));
    }
  }
  // 3. Let privateName be ! ResolvePrivateIdentifier(privEnv, privateIdentifier).
  const privateName = ResolvePrivateIdentifier(privEnv, privateIdentifier);
  // 4. Return the Reference Record { [[Base]]: baseValue, [[ReferencedName]]: privateName, [[Strict]]: true, [[ThisValue]]: empty }.
  return new ReferenceRecord({
    Base: baseValue,
    ReferencedName: privateName,
    Strict: Value.true,
    ThisValue: undefined,
  });
}
