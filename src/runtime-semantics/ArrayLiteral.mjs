import {
  ArrayCreate,
  Assert,
  CreateDataProperty,
  GetIterator,
  GetValue,
  IteratorStep,
  IteratorValue,
  Set,
  ToString,
  ToUint32,
} from '../abstract-ops/all.mjs';
import {
  isExpression,
  isSpreadElement,
} from '../ast.mjs';
import { New as NewValue, Type } from '../value.mjs';
import { Q, ReturnIfAbrupt, X } from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';

function* ArrayAccumulation_SpreadElement(SpreadElement, array, nextIndex) {
  const spreadRef = yield* Evaluate_Expression(SpreadElement.argument);
  const spreadObj = Q(GetValue(spreadRef));
  const iteratorRecord = Q(GetIterator(spreadObj));
  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (Type(next) === 'Boolean' && next.isFalse()) {
      return nextIndex;
    }
    const nextValue = Q(IteratorValue(next));
    const status = CreateDataProperty(
      array, ToString(ToUint32(NewValue(nextIndex))), nextValue,
    );
    Assert(status.isTrue());
    nextIndex += 1;
  }
}

function* ArrayAccumulation_AssignmentExpression(AssignmentExpression, array, nextIndex) {
  const initResult = yield* Evaluate_Expression(AssignmentExpression);
  const initValue = Q(GetValue(initResult));
  const created = CreateDataProperty(
    array, ToString(ToUint32(NewValue(nextIndex))), initValue,
  );
  Assert(created.isTrue());
  return nextIndex + 1;
}

function* ArrayAccumulation(ElementList, array, nextIndex) {
  let postIndex = nextIndex;
  for (const element of ElementList) {
    switch (true) {
      case !element:
        // Elision
        postIndex += 1;
        break;

      case isExpression(element):
        postIndex = yield* ArrayAccumulation_AssignmentExpression(element, array, postIndex);
        break;

      case isSpreadElement(element):
        postIndex = yield* ArrayAccumulation_SpreadElement(element, array, postIndex);
        break;

      default:
        throw outOfRange('ArrayAccumulation', element);
    }
  }
  return postIndex;
}

// #sec-array-initializer-runtime-semantics-evaluation
// ArrayLiteral :
//   `[` Elision `]`
//   `[` ElementList `]`
//   `[` ElementList `,` Elision `]`
export function* Evaluate_ArrayLiteral(ArrayLiteral) {
  const array = X(ArrayCreate(NewValue(0)));
  const len = yield* ArrayAccumulation(ArrayLiteral.elements, array, 0);
  ReturnIfAbrupt(len);
  X(Set(array, NewValue('length'), ToUint32(NewValue(len)), NewValue(false)));
  // NOTE: The above Set cannot fail because of the nature of the object returned by ArrayCreate.
  return array;
}
