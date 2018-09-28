import {
  GetV,
  GetValue,
  HasOwnProperty,
  InitializeReferencedBinding,
  PutValue,
  ResolveBinding,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isSingleNameBinding,
} from '../ast.mjs';
import {
  Q,
  X,
} from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  BindingInitialization_BindingPattern,
} from './all.mjs';

// #sec-runtime-semantics-keyedbindinginitialization
//   BindingElement : BindingPattern Initializer
//
// (implicit)
//   BindingElement : SingleNameBinding
export function* KeyedBindingInitialization_BindingElement(BindingElement, value, environment, propertyName) {
  let BindingPattern;
  let Initializer;
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return yield* KeyedBindingInitialization_SingleNameBinding(BindingElement, value, environment, propertyName);
    case isBindingPattern(BindingElement):
      BindingPattern = BindingElement;
      Initializer = undefined;
      break;
    case isBindingPatternAndInitializer(BindingElement):
      BindingPattern = BindingElement.left;
      Initializer = BindingElement.right;
      break;
    default:
      throw outOfRange('KeyedBindingInitialization_BindingElement', BindingElement);
  }

  let v = Q(GetV(value, propertyName));
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = yield* Evaluate_Expression(Initializer);
    v = Q(GetValue(defaultValue));
  }
  return yield* BindingInitialization_BindingPattern(BindingPattern, v, environment);
}

// #sec-runtime-semantics-keyedbindinginitialization
//   SingleNameBinding : BindingIdentifier Initializer
export function* KeyedBindingInitialization_SingleNameBinding(SingleNameBinding, value, environment, propertyName) {
  let BindingIdentifier;
  let Initializer;
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      BindingIdentifier = SingleNameBinding;
      Initializer = undefined;
      break;
    case isBindingIdentifierAndInitializer(SingleNameBinding):
      BindingIdentifier = SingleNameBinding.left;
      Initializer = SingleNameBinding.right;
      break;
    default:
      throw outOfRange('KeyedBindingInitialization_SingleNameBinding', SingleNameBinding);
  }

  const bindingId = NewValue(BindingIdentifier.name);
  const lhs = Q(ResolveBinding(bindingId, environment));
  let v = Q(GetV(value, propertyName));
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = yield* Evaluate_Expression(Initializer);
    v = Q(GetValue(defaultValue));
    if (IsAnonymousFunctionDefinition(Initializer)) {
      const hasNameProperty = Q(HasOwnProperty(v, NewValue('name')));
      if (hasNameProperty.isFalse()) {
        X(SetFunctionName(v, bindingId));
      }
    }
  }
  if (Type(environment) === 'Undefined') {
    return Q(PutValue(lhs, v));
  }
  return InitializeReferencedBinding(lhs, v);
}
