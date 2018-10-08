import { isYieldExpressionWithStar } from '../ast.mjs';
import {
  Assert,
  Call,
  CreateIterResultObject,
  GeneratorYield,
  GetGeneratorKind,
  GetIterator,
  GetMethod,
  GetValue,
  IteratorClose,
  IteratorComplete,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
  Completion,
  NormalCompletion,
  ReturnCompletion,
  EnsureCompletion,
} from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  Evaluate_Expression,
} from '../evaluator.mjs';
import { Type, Value } from '../value.mjs';

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   YieldExpression :
//     `yield`
//     `yield` AssignmentExpression
function* Evaluate_YieldExpression_WithoutStar(YieldExpression) {
  const generatorKind = X(GetGeneratorKind());
  let value = Value.undefined;
  if (YieldExpression.argument) {
    const AssignmentExpression = YieldExpression.argument;
    const exprRef = yield* Evaluate_Expression(AssignmentExpression);
    value = Q(GetValue(exprRef));
  }
  // TODO(asynciterator)
  // if (generatorKind === 'async') {
  //   return Q(AsyncGeneratorYield(value));
  // }
  Assert(generatorKind === 'sync');
  return Q(yield* GeneratorYield(CreateIterResultObject(value, Value.false)));
}

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   YieldExpression :
//     `yield` `*` AssignmentExpression
function* Evaluate_YieldExpression_Star(YieldExpression) {
  const AssignmentExpression = YieldExpression.argument;

  const generatorKind = X(GetGeneratorKind());
  Assert(generatorKind === 'sync');
  const exprRef = yield* Evaluate_Expression(AssignmentExpression);
  const value = Q(GetValue(exprRef));
  const iteratorRecord = Q(GetIterator(value, generatorKind));
  const iterator = iteratorRecord.Iterator;
  let received = new NormalCompletion(Value.undefined);
  while (true) {
    if (received.Type === 'normal') {
      const innerResult = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [received.Value]));
      // TODO(asynciterator)
      // if (generatorKind === 'async') {
      //   innerResult = Q(Await(innerResult));
      // }
      if (Type(innerResult) !== 'Object') {
        return surroundingAgent.Throw('TypeError');
      }
      const done = Q(IteratorComplete(innerResult));
      if (done === Value.true) {
        return Q(IteratorValue(innerResult));
      }
      // TODO(asynciterator)
      // if (generatorKind === 'async') {
      //   received = EnsureCompletion(yield* AsyncGeneratorYield(Q(IteratorValue(innerResult))));
      // } else {
      received = EnsureCompletion(yield* GeneratorYield(innerResult));
      // }
    } else if (received.Type === 'throw') {
      const thr = Q(GetMethod(iterator, new Value('throw')));
      if (Type(thr) !== 'Undefined') {
        const innerResult = Q(Call(thr, iterator, [received.Value]));
        // TODO(asynciterator)
        // if (generatorKind === 'async') {
        //   innerResult = Q(Await(innerResult));
        // }
        if (Type(innerResult) !== 'Object') {
          return surroundingAgent.Throw('TypeError');
        }
        const done = Q(IteratorComplete(innerResult));
        if (done === Value.true) {
          return Q(IteratorValue(innerResult));
        }
        // TODO(asynciterator)
        // if (generatorKind === 'async') {
        //   received = EnsureCompletion(yield* AsyncGeneratorYield(Q(IteratorValue(innerResult))));
        // } else {
        received = EnsureCompletion(yield* GeneratorYield(innerResult));
        // }
      } else {
        const closeCompletion = new NormalCompletion(undefined);
        // TODO(asynciterator)
        // if (generatorKind === 'async') {
        //   Q(AsyncIteratorClose(iteratorRecord, closeCompletion);
        // } else {
        Q(IteratorClose(iteratorRecord, closeCompletion));
        // }
        return surroundingAgent.Throw('TypeError');
      }
    } else {
      Assert(received.Type === 'return');
      const ret = Q(GetMethod(iterator, new Value('return')));
      if (Type(ret) === 'Undefined') {
        // TODO(asynciterator)
        // if (generatorKind === 'async') {
        //   received.Value = Q(Await(received.Value));
        // }
        return Completion(received);
      }
      const innerReturnResult = Q(Call(ret, iterator, [received.Value]));
      // TODO(asynciterator)
      // if (generatorKind === 'async') {
      //   innerReturnResult = Q(Await(innerReturnResult));
      // }
      if (Type(innerReturnResult) !== 'Object') {
        return surroundingAgent.Throw('TypeError');
      }
      const done = Q(IteratorComplete(innerReturnResult));
      if (done === Value.true) {
        const innerValue = Q(IteratorValue(innerReturnResult));
        return new ReturnCompletion(innerValue);
      }
      // TODO(asynciterator)
      // if (generatorKind === 'async') {
      //   received = EnsureCompletion(yield* AsyncGeneratorYield(Q(IteratorValue(innerReturnResult))));
      // } else {
      received = EnsureCompletion(yield* GeneratorYield(innerReturnResult));
      // }
    }
  }
}

export function* Evaluate_YieldExpression(YieldExpression) {
  if (isYieldExpressionWithStar(YieldExpression)) {
    return yield* Evaluate_YieldExpression_Star(YieldExpression);
  }
  return yield* Evaluate_YieldExpression_WithoutStar(YieldExpression);
}
