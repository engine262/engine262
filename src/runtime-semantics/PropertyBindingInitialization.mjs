import { BoundNames } from '../static-semantics/all.mjs';
import { Q, ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate_PropertyName, KeyedBindingInitialization } from './all.mjs';

// #sec-destructuring-binding-patterns-runtime-semantics-propertybindinginitialization
export function* PropertyBindingInitialization(node, value, environment) {
  if (Array.isArray(node)) {
    const boundNames = [];
    for (const item of node) {
      const nextNames = Q(yield* PropertyBindingInitialization(item, value, environment));
      boundNames.push(...nextNames);
    }
    return boundNames;
  }
  if (node.PropertyName) {
    const P = yield* Evaluate_PropertyName(node.PropertyName);
    ReturnIfAbrupt(P);
    Q(yield* KeyedBindingInitialization(node.BindingElement, value, environment, P));
    return [P];
  } else {
    const name = BoundNames(node)[0];
    Q(yield* KeyedBindingInitialization(node, value, environment, name));
    return [name];
  }
}
