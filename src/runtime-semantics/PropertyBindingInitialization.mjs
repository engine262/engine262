import {
  Evaluate_PropertyName,
  KeyedBindingInitialization_BindingElement,
  KeyedBindingInitialization_SingleNameBinding,
} from './all.mjs';
import {
  isBindingPropertyWithColon,
  isBindingPropertyWithSingleNameBinding,
} from '../ast.mjs';
import {
  Q,
  ReturnIfAbrupt,
} from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';
import { Value } from '../value.mjs';

// #sec-destructuring-binding-patterns-runtime-semantics-propertybindinginitialization
//   BindingPropertyList : BindingPropertyList `,` BindingProperty
//
// (implicit)
//   BindingPropertyList : BindingProperty
export function* PropertyBindingInitialization_BindingPropertyList(
  BindingPropertyList, value, environment,
) {
  const boundNames = [];
  for (const BindingProperty of BindingPropertyList) {
    const nextNames = Q(yield* PropertyBindingInitialization_BindingProperty(
      BindingProperty, value, environment,
    ));
    boundNames.push(...nextNames);
  }
  return boundNames;
}

// #sec-destructuring-binding-patterns-runtime-semantics-propertybindinginitialization
//   BindingProperty :
//     SingleNameBinding
//     PropertyName `:` BindingElement
export function* PropertyBindingInitialization_BindingProperty(BindingProperty, value, environment) {
  switch (true) {
    case isBindingPropertyWithSingleNameBinding(BindingProperty): {
      const name = new Value(BindingProperty.key.name);
      Q(yield* KeyedBindingInitialization_SingleNameBinding(BindingProperty.value, value, environment, name));
      return [name];
    }
    case isBindingPropertyWithColon(BindingProperty): {
      const { key: PropertyName, value: BindingElement } = BindingProperty;
      const P = yield* Evaluate_PropertyName(PropertyName, BindingProperty.computed);
      ReturnIfAbrupt(P);
      Q(yield* KeyedBindingInitialization_BindingElement(BindingElement, value, environment, P));
      return [P];
    }
    default:
      throw outOfRange('PropertyBindingInitialization_BindingProperty', BindingProperty);
  }
}
