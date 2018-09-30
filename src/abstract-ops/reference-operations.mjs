import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  GetGlobalObject,
  ToObject,
} from './all.mjs';
import {
  Value,
  PrimitiveValue,
  Type,
} from '../value.mjs';
import {
  NormalCompletion,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';

// 6.2.4.1 #sec-getbase
export function GetBase(V) {
  Assert(Type(V) === 'Reference');
  return V.BaseValue;
}

// 6.2.4.2 #sec-getreferencedname
export function GetReferencedName(V) {
  Assert(Type(V) === 'Reference');
  return V.ReferencedName;
}

// 6.2.4.3 #sec-isstrictreference
export function IsStrictReference(V) {
  Assert(Type(V) === 'Reference');
  return V.StrictReference;
}

// 6.2.4.4 #sec-hasprimitivebase
export function HasPrimitiveBase(V) {
  Assert(Type(V) === 'Reference');
  if (V.BaseValue instanceof PrimitiveValue) {
    return new Value(true);
  }
  return new Value(false);
}

// 6.2.4.5 #sec-ispropertyreference
export function IsPropertyReference(V) {
  Assert(Type(V) === 'Reference');
  if (Type(V.BaseValue) === 'Object' || HasPrimitiveBase(V).isTrue()) {
    return new Value(true);
  }
  return new Value(false);
}

// 6.2.4.6 #sec-isunresolvablereference
export function IsUnresolvableReference(V) {
  Assert(Type(V) === 'Reference');
  if (Type(V.BaseValue) === 'Undefined') {
    return new Value(true);
  }
  return new Value(false);
}

// 6.2.4.7 #sec-issuperreference
export function IsSuperReference(V) {
  Assert(Type(V) === 'Reference');
  return new Value('ThisValue' in V);
}

// 6.2.4.8 #sec-getvalue
export function GetValue(V) {
  ReturnIfAbrupt(V);
  if (Type(V) !== 'Reference') {
    return V;
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V).isTrue()) {
    return surroundingAgent.Throw('ReferenceError', `${GetReferencedName(V).stringValue()} is not defined`);
  }
  if (IsPropertyReference(V).isTrue()) {
    if (HasPrimitiveBase(V).isTrue()) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    return base.Get(GetReferencedName(V), GetThisValue(V));
  } else {
    return base.GetBindingValue(GetReferencedName(V), IsStrictReference(V));
  }
}

// 6.2.4.9 #sec-putvalue
export function PutValue(V, W) {
  ReturnIfAbrupt(V);
  ReturnIfAbrupt(W);
  if (Type(V) !== 'Reference') {
    return surroundingAgent.Throw('ReferenceError');
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V).isTrue()) {
    if (IsStrictReference(V).isTrue()) {
      return surroundingAgent.Throw('ReferenceError', `${GetReferencedName(V).stringValue()} is not defined`);
    }
    const globalObj = GetGlobalObject();
    return Q(Set(globalObj, GetReferencedName(V), W, new Value(false)));
  } else if (IsPropertyReference(V).isTrue()) {
    if (HasPrimitiveBase(V).isTrue()) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    const succeeded = Q(base.Set(GetReferencedName(V), W, GetThisValue(V)));
    if (succeeded.isFalse() && IsStrictReference(V).isTrue()) {
      return surroundingAgent.Throw('TypeError', `Cannot create property ${GetReferencedName(V).stringValue()}`);
    }
    return new NormalCompletion(undefined);
  } else {
    return Q(base.SetMutableBinding(GetReferencedName(V), W, IsStrictReference(V)));
  }
}

// 6.2.4.10 #sec-getthisvalue
export function GetThisValue(V) {
  Assert(IsPropertyReference(V).isTrue());
  if (IsSuperReference(V).isTrue()) {
    return V.ThisValue;
  }
  return GetBase(V);
}

// 6.2.4.11 #sec-initializereferencedbinding
export function InitializeReferencedBinding(V, W) {
  ReturnIfAbrupt(V);
  ReturnIfAbrupt(W);
  Assert(Type(V) === 'Reference');
  Assert(IsUnresolvableReference(V).isFalse());
  const base = GetBase(V);
  Assert(Type(base) === 'EnvironmentRecord');
  return base.InitializeBinding(GetReferencedName(V), W);
}
