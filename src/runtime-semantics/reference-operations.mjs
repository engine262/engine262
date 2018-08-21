import {
  surroundingAgent,
  GetGlobalObject,
} from '../engine.mjs';
import {
  Assert,
  ToObject,
} from '../abstract-ops/all.mjs';
import {
  Type,
  PrimitiveValue,
  New as NewValue,
} from '../value.mjs';
import {
  X,
  Q,
  ReturnIfAbrupt,
  NormalCompletion,
} from '../completion.mjs';

export function GetBase(V) {
  Assert(Type(V) === 'Reference');
  return V.BaseValue;
}

export function IsUnresolvableReference(V) {
  Assert(Type(V) === 'Reference');
  if (Type(V.BaseValue) === 'Undefined') {
    return true;
  }
  return false;
}

export function HasPrimitiveBase(V) {
  Assert(Type(V) === 'Reference');
  if (V.BaseValue instanceof PrimitiveValue) {
    return true;
  }
  return false;
}

export function IsPropertyReference(V) {
  Assert(Type(V) === 'Reference');
  if (Type(V.BaseValue) === 'Object' || HasPrimitiveBase(V)) {
    return true;
  }
  return false;
}

export function GetReferencedName(V) {
  Assert(Type(V) === 'Reference');
  return V.ReferencedName;
}

export function IsSuperReference(V) {
  Assert(Type(V) === 'Reference');
  return 'ThisValue' in V;
}

export function GetThisValue(V) {
  Assert(IsPropertyReference(V));
  if (IsSuperReference(V)) {
    return V.ThisValue;
  }
  return GetBase(V);
}

// #sec-isstrictreference
export function IsStrictReference(V) {
  Assert(Type(V) === 'Reference');
  return V.StrictReference;
}

// #sec-getvalue
export function GetValue(V) {
  ReturnIfAbrupt(V);
  if (Type(V) !== 'Reference') {
    return V;
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V)) {
    return surroundingAgent.Throw('ReferenceError');
  }
  if (IsPropertyReference(V)) {
    if (HasPrimitiveBase(V)) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    return base.Get(GetReferencedName(V), GetThisValue(V));
  } else {
    return base.GetBindingValue(GetReferencedName(V), IsStrictReference(V));
  }
}

// #sec-putvalue
export function PutValue(V, W) {
  ReturnIfAbrupt(V);
  ReturnIfAbrupt(W);
  if (Type(V) !== 'Reference') {
    return surroundingAgent.Throw('ReferenceError');
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V)) {
    if (IsStrictReference(V)) {
      return surroundingAgent.Throw('ReferenceError');
    }
    const globalObj = GetGlobalObject();
    return Q(Set(globalObj, GetReferencedName(V), W, NewValue(false)));
  } else if (IsPropertyReference(V)) {
    if (HasPrimitiveBase(V)) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    const succeeded = Q(base.Set(GetReferencedName(V), W, GetThisValue(V)));
    if (succeeded.isFalse() && IsStrictReference(V)) {
      return surroundingAgent.Throw('TypeError');
    }
    return new NormalCompletion(undefined);
  } else {
    return Q(base.SetMutableBinding(GetReferencedName(V), W, IsStrictReference(V)));
  }
}
