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
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';

function* ArrayAccumulation_SpreadElement(SpreadElement, array, nextIndex) {
  const spreadRef = yield* Evaluate(SpreadElement.argument);
  const spreadObj = Q(GetValue(spreadRef));
  const iteratorRecord = Q(GetIterator(spreadObj));
  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (next === Value.false) {
      return nextIndex;
    }
    const nextValue = Q(IteratorValue(next));
    const idxNum = X(ToUint32(new Value(nextIndex)));
    const idxStr = X(ToString(idxNum));
    const status = X(CreateDataProperty(array, idxStr, nextValue));
    Assert(status === Value.true);
    nextIndex += 1;
  }
}

function* ArrayAccumulation_AssignmentExpression(AssignmentExpression, array, nextIndex) {
  const initResult = yield* Evaluate(AssignmentExpression);
  const initValue = Q(GetValue(initResult));
  const idxNum = X(ToUint32(new Value(nextIndex)));
  const idxStr = X(ToString(idxNum));
  const created = X(CreateDataProperty(array, idxStr, initValue));
  Assert(created === Value.true);
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
        postIndex = Q(yield* ArrayAccumulation_AssignmentExpression(element, array, postIndex));
        break;

      case isSpreadElement(element):
        postIndex = Q(yield* ArrayAccumulation_SpreadElement(element, array, postIndex));
        break;

      default:
        throw new OutOfRange('ArrayAccumulation', element);
    }
  }
  return postIndex;
}

// 12.2.5.3 #sec-array-initializer-runtime-semantics-evaluation
// ArrayLiteral :
//   `[` Elision `]`
//   `[` ElementList `]`
//   `[` ElementList `,` Elision `]`
export function* Evaluate_ArrayLiteral(ArrayLiteral) {
  const array = X(ArrayCreate(new Value(0)));
  const len = Q(yield* ArrayAccumulation(ArrayLiteral.elements, array, 0));
  X(Set(array, new Value('length'), ToUint32(new Value(len)), Value.false));
  // NOTE: The above Set cannot fail because of the nature of the object returned by ArrayCreate.
  return array;
}
