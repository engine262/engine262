import { Value } from '../value.mjs';
import {
  Set,
  ArrayCreate,
  GetValue,
  GetIterator,
  IteratorStep,
  IteratorValue,
  ToString,
  CreateDataPropertyOrThrow,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { ReturnIfAbrupt, Q, X } from '../completion.mjs';

// #sec-runtime-semantics-arrayaccumulation
//  Elision :
//    `,`
//    Elision `,`
//  ElementList :
//    Elision? AssignmentExpression
//    Elision? SpreadElement
//    ElementList `,` Elision? AssignmentExpression
//    ElementList : ElementList `,` Elision SpreadElement
//  SpreadElement :
//    `...` AssignmentExpression
function* ArrayAccumulation(ElementList, array, nextIndex) {
  let postIndex = nextIndex;
  for (const element of ElementList) {
    switch (element.type) {
      case 'Elision':
        postIndex += 1;
        Q(Set(array, new Value('length'), new Value(postIndex), Value.true));
        break;
      case 'SpreadElement':
        postIndex = Q(yield* ArrayAccumulation_SpreadElement(element, array, postIndex));
        break;
      default:
        postIndex = Q(yield* ArrayAccumulation_AssignmentExpression(element, array, postIndex));
        break;
    }
  }
  return postIndex;
}

// SpreadElement : `...` AssignmentExpression
function* ArrayAccumulation_SpreadElement({ AssignmentExpression }, array, nextIndex) {
  // 1. Let spreadRef be the result of evaluating AssignmentExpression.
  const spreadRef = yield* Evaluate(AssignmentExpression);
  // 2. Let spreadObj be ? GetValue(spreadRef).
  const spreadObj = Q(GetValue(spreadRef));
  // 3. Let iteratorRecord be ? GetIterator(spreadObj).
  const iteratorRecord = Q(GetIterator(spreadObj));
  // 4. Repeat,
  while (true) {
    // a. Let next be ? IteratorStep(iteratorRecord).
    const next = Q(IteratorStep(iteratorRecord));
    // b. If next is false, return nextIndex.
    if (next === Value.false) {
      return nextIndex;
    }
    // c. Let nextValue be ? IteratorValue(next).
    const nextValue = Q(IteratorValue(next));
    // d. Perform ! CreateDataPropertyOrThrow(array, ! ToString(nextIndex), nextValue).
    X(CreateDataPropertyOrThrow(array, X(ToString(new Value(nextIndex))), nextValue));
    // e. Set nextIndex to nextIndex + 1.
    nextIndex += 1;
  }
}


function* ArrayAccumulation_AssignmentExpression(AssignmentExpression, array, nextIndex) {
  // 2. Let initResult be the result of evaluating AssignmentExpression.
  const initResult = yield* Evaluate(AssignmentExpression);
  // 3. Let initValue be ? GetValue(initResult).
  const initValue = Q(GetValue(initResult));
  // 4. Let created be ! CreateDataPropertyOrThrow(array, ! ToString(nextIndex), initValue).
  const _created = X(CreateDataPropertyOrThrow(array, X(ToString(new Value(nextIndex))), initValue));
  // 5. Return nextIndex + 1.
  return nextIndex + 1;
}

// #sec-array-initializer-runtime-semantics-evaluation
//  ArrayLiteral :
//    `[` Elision `]`
//    `[` ElementList `]`
//    `[` ElementList `,` Elision `]`
export function* Evaluate_ArrayLiteral({ ElementList }) {
  // 1. Let array be ! ArrayCreate(0).
  const array = X(ArrayCreate(new Value(0)));
  // 2. Let len be the result of performing ArrayAccumulation for ElementList with arguments array and 0.
  const len = yield* ArrayAccumulation(ElementList, array, 0);
  // 3. ReturnIfAbrupt(len).
  ReturnIfAbrupt(len);
  // 4. Return array.
  return array;
}
