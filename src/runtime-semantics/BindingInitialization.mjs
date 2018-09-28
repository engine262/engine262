import {
  Assert,
  GetIterator,
  IteratorClose,
  PutValue,
  RequireObjectCoercible,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import {
  isArrayBindingPattern,
  isBindingIdentifier,
  isBindingPattern,
  isBindingRestProperty,
  isObjectBindingPattern,
} from '../ast.mjs';
import {
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  NormalCompletion,
  Q,
} from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  IteratorBindingInitialization_ArrayBindingPattern,
  PropertyBindingInitialization_BindingPropertyList,
  RestBindingInitialization_BindingRestProperty,
} from './all.mjs';

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

// #sec-identifiers-runtime-semantics-bindinginitialization
//   BindingIdentifier :
//     Identifier
//     `yield`
//     `await`
export function BindingInitialization_BindingIdentifier(BindingIdentifier, value, environment) {
  const name = NewValue(BindingIdentifier.name);
  return Q(InitializeBoundName(name, value, environment));
}

// #sec-destructuring-binding-patterns-runtime-semantics-bindinginitialization
//   BindingPattern :
//     ObjectBindingPattern
//     ArrayBindingPattern
export function* BindingInitialization_BindingPattern(BindingPattern, value, environment) {
  switch (true) {
    case isObjectBindingPattern(BindingPattern):
      Q(RequireObjectCoercible(value));
      return yield* BindingInitialization_ObjectBindingPattern(BindingPattern, value, environment);

    case isArrayBindingPattern(BindingPattern): {
      const iteratorRecord = Q(GetIterator(value));
      const result = IteratorBindingInitialization_ArrayBindingPattern(
        BindingPattern, iteratorRecord, environment,
      );
      if (iteratorRecord.Done.isFalse()) {
        return Q(IteratorClose(iteratorRecord, result));
      }
      return result;
    }

    default:
      throw outOfRange('BindingInitialization_BindingPattern', BindingPattern);
  }
}

// (implicit)
//   ForBinding :
//     BindingIdentifier
//     BindingPattern
export function* BindingInitialization_ForBinding(ForBinding, value, environment) {
  switch (true) {
    case isBindingIdentifier(ForBinding):
      return BindingInitialization_BindingIdentifier(ForBinding, value, environment);

    case isBindingPattern(ForBinding):
      return yield* BindingInitialization_BindingPattern(ForBinding, value, environment);

    default:
      throw outOfRange('BindingInitialization_ForBinding', ForBinding);
  }
}

// #sec-destructuring-binding-patterns-runtime-semantics-bindinginitialization
//   ObjectBindingPattern :
//     `{` `}`
//     `{` BindingPropertyList `}`
//     `{` BindingPropertyList `,` `}`
//     `{` BindingRestProperty `}`
//     `{` BindingPropertyList `,` BindingRestProperty `}`
function* BindingInitialization_ObjectBindingPattern(ObjectBindingPattern, value, environment) {
  if (ObjectBindingPattern.properties.length === 0) {
    return new NormalCompletion(undefined);
  }

  let BindingRestProperty;
  let BindingPropertyList = ObjectBindingPattern.properties;
  const last = ObjectBindingPattern.properties[ObjectBindingPattern.properties.length - 1];
  if (isBindingRestProperty(last)) {
    BindingRestProperty = last;
    BindingPropertyList = BindingPropertyList.slice(0, -1);
  }

  const excludedNames = Q(yield* PropertyBindingInitialization_BindingPropertyList(
    BindingPropertyList, value, environment,
  ));
  if (BindingRestProperty === undefined) {
    return new NormalCompletion(undefined);
  }

  return RestBindingInitialization_BindingRestProperty(
    BindingRestProperty, value, environment, excludedNames,
  );
}

export function* BindingInitialization_CatchParameter(CatchParameter, value, environment) {
  switch (true) {
    case isBindingIdentifier(CatchParameter):
      return BindingInitialization_BindingIdentifier(CatchParameter, value, environment);

    case isBindingPattern(CatchParameter):
      return yield* BindingInitialization_BindingPattern(CatchParameter, value, environment);

    default:
      throw outOfRange('BindingInitialization_CatchParameter', CatchParameter);
  }
}

// #sec-for-in-and-for-of-statements-runtime-semantics-bindinginitialization
//   ForDeclaration : LetOrConst ForBinding
export function* BindingInitialization_ForDeclaration(ForDeclaration, value, environment) {
  return yield* BindingInitialization_ForBinding(ForDeclaration.declarations[0].id, value, environment);
}
