import {
  Assert,
  ArrayCreate,
  ToUint32,
  ToString,
  CreateDataProperty,
  GetValue,
  Set,
  IteratorStep,
  IteratorValue,
  GetIterator,
} from '../abstract-ops/all.mjs';
import {
  isExpression,
  isSpreadElement,
} from '../ast.mjs';
import { New as NewValue } from '../value.mjs';
import {
  Q,
  X,
  ReturnIfAbrupt,
} from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';

function ArrayAccumulation(ElementList, array, nextIndex) {
  if (!ElementList || ElementList.length === 0) {
    return nextIndex;
  }
  const arg = ElementList.pop();

  switch (true) {
    // (implicit) Elision
    case !arg:
      return nextIndex + 1;
    // Elision AssignmentExpression
    case isExpression(arg): {
      const AssignmentExpression = arg;

      let postIndex = ArrayAccumulation(ElementList, array, nextIndex);
      ReturnIfAbrupt(postIndex);
      const padding = 0;
      const initResult = Evaluate_Expression(AssignmentExpression);
      const initValue = Q(GetValue(initResult));
      const created = CreateDataProperty(
        array, ToString(ToUint32(NewValue(postIndex + padding))), initValue,
      );
      Assert(created.isTrue());
      return postIndex + padding + 1;
    }
    case isSpreadElement(arg): {
      const AssignmentExpression = arg.argument;

      const spreadRef = Evaluate_Expression(AssignmentExpression);
      const spreadObj = Q(GetValue(spreadRef));
      const iteratorRecord = Q(GetIterator(spreadObj));
      while (true) { // eslint-disable-line no-constant-condition
        const next = Q(IteratorStep(iteratorRecord));
        if (next.isFalse()) {
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

    default:
      throw outOfRange('ArrayAccumulation', arg);
  }
}

// #sec-array-initializer-runtime-semantics-evaluation
// ArrayLiteral :
//   `[` Elision `]`
//   `[` ElementList `]`
//   `[` ElementList `,` Elision `]`
export function Evaluate_ArrayLiteral(ArrayLiteral) {
  const array = X(ArrayCreate(NewValue(0)));
  let len = ArrayAccumulation(ArrayLiteral.elements, array, 0);
  ReturnIfAbrupt(len);
  Set(array, NewValue('length'), ToUint32(NewValue(len)), NewValue(false));
  // NOTE: The above Set cannot fail because of the nature of the object returned by ArrayCreate.
  return array;
}
