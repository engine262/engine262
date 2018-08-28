import {
  surroundingAgent,
  ResolveBinding,
} from '../engine.mjs';
import {
  Assert,
  GetIterator,
  IteratorClose,
  ObjectCreate,
  CopyDataProperties,
  GetBase,
  IsUnresolvableReference,
  GetReferencedName,
  PutValue,
} from '../abstract-ops/all.mjs';
import {
  isIdentifier,
  isObjectBindingPattern,
  isArrayBindingPattern,
  isEmptyObjectBindingPattern,
  isObjectBindingPatternWithBindingPropertyList,
  isObjectBindingPatternWithSingleBindingRestProperty,
  isObjectBindingPatternWithBindingPropertyListAndBindingRestProperty,
} from '../ast.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import {
  EnvironmentRecord,
} from '../environment.mjs';
import {
  Q,
  NormalCompletion,
  ReturnIfAbrupt,
} from '../completion.mjs';

function InitializeReferencedBinding(V, W) {
  ReturnIfAbrupt(V);
  ReturnIfAbrupt(W);
  Assert(Type(V) === 'Reference');
  Assert(IsUnresolvableReference(V).isFalse());
  const base = GetBase(V);
  Assert(base instanceof EnvironmentRecord);
  return base.InitializeBinding(GetReferencedName(V), W);
}

// #sec-initializeboundname
function InitializeBoundName(name, value, environment) {
  Assert(Type(name) === 'String');
  if (Type(environment) !== 'Undefined') {
    const env = environment.EnvironmentRecord;
    env.InitializeBinding(name, value);
    return new NormalCompletion(NewValue(undefined));
  } else {
    const lhs = ResolveBinding(name);
    return Q(PutValue(lhs, value));
  }
}

// BindingIdentifier :
//   Identifier
//   yield
//   await
// BindingPattern :
//   ObjectBindingPattern
//   ArrayBindingPattern
export function BindingInitialization(node, value, environment) {
  switch (true) {
    case isIdentifier(node): {
      const name = NewValue(node.name);
      return Q(InitializeBoundName(name, value, environment));
    }
    case isObjectBindingPattern(node):
      return BindingInitialization_ObjectBindingPattern(node, value, environment);
    case isArrayBindingPattern(node):
      return BindingInitialization_ArrayBindingPattern(node, value, environment);

    default:
      throw new RangeError();
  }
}

// BindingPattern : ObjectBindingPattern
function BindingInitialization_ObjectBindingPattern(BindingPattern, value, environment) {
  switch (true) {
    // ObjectBindingPattern : { }
    case isEmptyObjectBindingPattern(BindingPattern):
      return new NormalCompletion(undefined);
    case isObjectBindingPatternWithBindingPropertyListAndBindingRestProperty(BindingPattern): {
      const BindingPropertyList = BindingPattern.properties.slice(0, -1);
      const BindingRestProperty = BindingPattern.properties[BindingPattern.properties - 1];
      return BindingInitialization_ObjectBindingPattern_BindingPropertyList_BindingRestProperty(
        BindingPropertyList, BindingRestProperty, value, environment,
      );
    }
    case isObjectBindingPatternWithSingleBindingRestProperty(BindingPattern):
      return BindingInitialization_ObjectBindingPattern_BindingRestProperty(
        BindingPattern.properties[0], value, environment,
      );
    case isObjectBindingPatternWithBindingPropertyList(BindingPattern):
      return BindingInitialization_ObjectBindingPattern_BindingPropertyList(
        BindingPattern.properties, value, environment,
      );
    default:
      throw new RangeError();
  }
}

// BindingPattern : ArrayBindingPattern
function BindingInitialization_ArrayBindingPattern(ArrayBindingPattern, value, environment) {
  const iteratorRecord = Q(GetIterator(value));
  const result = IteratorBindingInitialization(ArrayBindingPattern, iteratorRecord, environment);
  if (iteratorRecord.Done.isFalse()) {
    return Q(IteratorClose(iteratorRecord, result));
  }
  return result;
}

// ObjectBindingPattern :
//   { BindingPropertyList }
//   { BindingPropertyList , }
function BindingInitialization_ObjectBindingPattern_BindingPropertyList(
  BindingPropertyList, value, environment,
) {
  Q(PropertyBindingInitialization(BindingPropertyList, value, environment));
  return new NormalCompletion(undefined);
}

// ObjectBindingPattern : { BindingRestProperty }
function BindingInitialization_ObjectBindingPattern_BindingRestProperty(
  BindingRestProperty, value, environment,
) {
  const excludedNames = [];
  return RestBindingInitialization(BindingRestProperty, value, environment, excludedNames);
}

// ObjectBindingPattern : { BindingPropertyList , BindingRestProperty }
function BindingInitialization_ObjectBindingPattern_BindingPropertyList_BindingRestProperty(
  BindingPropertyList, BindingRestProperty, value, environment,
) {
  const excludedNames = Q(PropertyBindingInitialization(BindingPropertyList, value, environment));
  return RestBindingInitialization(BindingRestProperty, value, environment, excludedNames);
}

function PropertyBindingInitialization(PropertyBindingList, value, environment) {

}

function RestBindingInitialization(BindingIdentifier, value, environment, excludedNames) {
  const lhs = Q(ResolveBinding(NewValue(BindingIdentifier), environment));
  const restObj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  Q(CopyDataProperties(restObj, value, excludedNames));
  if (Type(environment) === 'Undefined') {
    return PutValue(lhs, restObj);
  }
  return InitializeReferencedBinding(lhs, restObj);
}

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
// ArrayBindingPattern :
//   [ ]
//   [ Elision ]
//   [ Elision BindingRestElement ]
//   [ BindingElementList ]
//   [ BindingElementList , ]
//   [ BindingElementList , Elision ]
//   [ BindingElementList , Elision BindingRestElement ]
function IteratorBindingInitialization(ArrayBindingPattern, iteratorRecord, environment) {
  switch (true) {
    default:
      throw new RangeError();
  }
}
