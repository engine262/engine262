import { surroundingAgent } from '../engine.mjs';
import { PrimitiveValue, Type, Value } from '../value.mjs';
import {
  NormalCompletion,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import {
  Assert,
  GetGlobalObject,
  ToObject,
  Set,
} from './all.mjs';


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
    return Value.true;
  }
  return Value.false;
}

// 6.2.4.5 #sec-ispropertyreference
export function IsPropertyReference(V) {
  Assert(Type(V) === 'Reference');
  if (Type(V.BaseValue) === 'Object' || HasPrimitiveBase(V) === Value.true) {
    return Value.true;
  }
  return Value.false;
}

// 6.2.4.6 #sec-isunresolvablereference
export function IsUnresolvableReference(V) {
  Assert(Type(V) === 'Reference');
  if (V.BaseValue === Value.undefined) {
    return Value.true;
  }
  return Value.false;
}

// 6.2.4.7 #sec-issuperreference
export function IsSuperReference(V) {
  Assert(Type(V) === 'Reference');
  return 'ThisValue' in V ? Value.true : Value.false;
}

// 6.2.4.8 #sec-getvalue
export function GetValue(V) {
  ReturnIfAbrupt(V);
  if (Type(V) !== 'Reference') {
    return V;
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V) === Value.true) {
    return surroundingAgent.Throw('ReferenceError', 'NotDefined', GetReferencedName(V));
  }
  if (IsPropertyReference(V) === Value.true) {
    if (HasPrimitiveBase(V) === Value.true) {
      Assert(base !== Value.undefined && base !== Value.null);
      base = X(ToObject(base));
    }
    return Q(base.Get(GetReferencedName(V), GetThisValue(V)));
  } else {
    return Q(base.GetBindingValue(GetReferencedName(V), IsStrictReference(V)));
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
  if (IsUnresolvableReference(V) === Value.true) {
    if (IsStrictReference(V) === Value.true) {
      return surroundingAgent.Throw('ReferenceError', 'NotDefined', GetReferencedName(V));
    }
    const globalObj = GetGlobalObject();
    return Q(Set(globalObj, GetReferencedName(V), W, Value.false));
  } else if (IsPropertyReference(V) === Value.true) {
    if (HasPrimitiveBase(V) === Value.true) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    const succeeded = Q(base.Set(GetReferencedName(V), W, GetThisValue(V)));
    if (succeeded === Value.false && IsStrictReference(V) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'CannotSetProperty', GetReferencedName(V), base);
    }
    return new NormalCompletion(Value.undefined);
  } else {
    return Q(base.SetMutableBinding(GetReferencedName(V), W, IsStrictReference(V)));
  }
}

// 6.2.4.10 #sec-getthisvalue
export function GetThisValue(V) {
  Assert(IsPropertyReference(V) === Value.true);
  if (IsSuperReference(V) === Value.true) {
    return V.ThisValue;
  }
  return GetBase(V);
}

// 6.2.4.11 #sec-initializereferencedbinding
export function InitializeReferencedBinding(V, W) {
  ReturnIfAbrupt(V);
  ReturnIfAbrupt(W);
  Assert(Type(V) === 'Reference');
  Assert(IsUnresolvableReference(V) === Value.false);
  const base = GetBase(V);
  Assert(Type(base) === 'EnvironmentRecord');
  return base.InitializeBinding(GetReferencedName(V), W);
}
