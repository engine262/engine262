import { outOfRange } from '../helpers.mjs';

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
// ArrayBindingPattern :
//   [ ]
//   [ Elision ]
//   [ Elision BindingRestElement ]
//   [ BindingElementList ]
//   [ BindingElementList , ]
//   [ BindingElementList , Elision ]
//   [ BindingElementList , Elision BindingRestElement ]
export function IteratorBindingInitialization_ArrayBindingPattern(ArrayBindingPattern) {
  switch (true) {
    default:
      throw outOfRange('IteratorBindingInitialization_ArrayBindingPattern', ArrayBindingPattern);
  }
}
