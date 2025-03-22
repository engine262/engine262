import { surroundingAgent } from '../host-defined/engine.mts';
import { ObjectValue, Value } from '../value.mts';
import {
  Assert,
  Call,
  GeneratorYield,
  GetGeneratorKind,
  GetIterator,
  GetMethod,
  GetValue,
  IteratorClose,
  IteratorComplete,
  IteratorValue,
  AsyncGeneratorYield,
  AsyncIteratorClose,
  Yield,
} from '../abstract-ops/all.mts';
import {
  Await,
  NormalCompletion,
  Q,
  ReturnCompletion,
  ThrowCompletion,
  type ValueCompletion,
} from '../completion.mts';
import { Evaluate, type YieldEvaluator } from '../evaluator.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation */
//   YieldExpression :
//     `yield`
//     `yield` AssignmentExpression
//     `yield` `*` AssignmentExpression
export function* Evaluate_YieldExpression({ hasStar, AssignmentExpression }: ParseNode.YieldExpression): YieldEvaluator {
  if (hasStar) {
    // 1. Let generatorKind be GetGeneratorKind().
    const generatorKind = GetGeneratorKind();
    // 2. Assert: generatorKind is either sync or async.
    Assert(generatorKind === 'async' || generatorKind === 'sync');
    // 2. Let exprRef be ? Evaluation of AssignmentExpression.
    const exprRef = Q(yield* Evaluate(AssignmentExpression!));
    // 3. Let value be ? GetValue(exprRef).
    let value = Q(yield* GetValue(exprRef));
    // 4. Let iteratorRecord be ? GetIterator(value, generatorKind).
    const iteratorRecord = Q(yield* GetIterator(value, generatorKind));
    // 5. Let iterator be iteratorRecord.[[Iterator]].
    const iterator = iteratorRecord.Iterator;
    // 6. Let received be NormalCompletion(undefined).
    let received: ValueCompletion | ReturnCompletion = NormalCompletion(Value.undefined);
    // 7. Repeat,
    while (true) {
      // a. If received is a normal completion, then
      if (received instanceof NormalCompletion) {
        // i. Let innerResult be ? Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]], « received.[[Value]] »).
        let innerResult: Value = Q(yield* Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [received.Value]));
        // ii. If generatorKind is async, then set innerResult to ? Await(innerResult).
        if (generatorKind === 'async') {
          innerResult = Q(yield* Await(innerResult));
        }
        // iii. If Type(innerResult) is not Object, throw a TypeError exception.
        if (!(innerResult instanceof ObjectValue)) {
          return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult);
        }
        // iv. Let done be ? IteratorComplete(innerResult).
        const done = Q(yield* IteratorComplete(innerResult));
        // v. If done is true, then
        if (done === Value.true) {
          // 1. Return ? IteratorValue(innerResult).
          return Q(yield* IteratorValue(innerResult));
        }
        // vi. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).
        if (generatorKind === 'async') {
          received = yield* AsyncGeneratorYield(Q(yield* IteratorValue(innerResult)));
        } else { // vii. Else, set received to GeneratorYield(innerResult).
          received = yield* GeneratorYield(innerResult);
        }
      } else if (received instanceof ThrowCompletion) { // b. Else if received is a throw completion, then
        // i. Let throw be ? GetMethod(iterator, "throw").
        const thr = Q(yield* GetMethod(iterator, Value('throw')));
        // ii. If throw is not undefined, then
        if (thr !== Value.undefined) {
          // 1. Let innerResult be ? Call(throw, iterator, « received.[[Value]] »).
          let innerResult: Value = Q(yield* Call(thr, iterator, [received.Value]));
          // 2. If generatorKind is async, then set innerResult to ? Await(innerResult).
          if (generatorKind === 'async') {
            innerResult = Q(yield* Await(innerResult));
          }
          // 3. NOTE: Exceptions from the inner iterator throw method are propagated. Normal completions from an inner throw method are processed similarly to an inner next.
          // 4. If Type(innerResult) is not Object, throw a TypeError exception.
          if (!(innerResult instanceof ObjectValue)) {
            return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult);
          }
          // 5. Let done be ? IteratorComplete(innerResult).
          const done = Q(yield* IteratorComplete(innerResult));
          // 6. If done is true, then
          if (done === Value.true) {
            // a. Return ? IteratorValue(innerResult).
            return Q(yield* IteratorValue(innerResult));
          }
          // 7. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).
          if (generatorKind === 'async') {
            received = yield* AsyncGeneratorYield(Q(yield* IteratorValue(innerResult)));
          } else { // 8. Else, set received to GeneratorYield(innerResult).
            received = yield* GeneratorYield(innerResult);
          }
        } else { // iii. Else,
          // 1. NOTE: If iterator does not have a throw method, this throw is going to terminate the yield* loop. But first we need to give iterator a chance to clean up.
          // 2. Let closeCompletion be NormalCompletion(empty).
          const closeCompletion = NormalCompletion(undefined);
          // 3. If generatorKind is async, perform ? AsyncIteratorClose(iteratorRecord, closeCompletion).
          // 4. Else, perform ? IteratorClose(iteratorRecord, closeCompletion).
          if (generatorKind === 'async') {
            Q(yield* AsyncIteratorClose(iteratorRecord, closeCompletion));
          } else {
            Q(yield* IteratorClose(iteratorRecord, closeCompletion));
          }
          // 5. NOTE: The next step throws a TypeError to indicate that there was a yield* protocol violation: iterator does not have a throw method.
          // 6. Throw a TypeError exception.
          return surroundingAgent.Throw('TypeError', 'IteratorThrowMissing');
        }
      } else { // c. Else,
        // i. Assert: received is a return completion.
        Assert(received instanceof ReturnCompletion);
        // ii. Let return be ? GetMethod(iterator, "return").
        const ret = Q(yield* GetMethod(iterator, Value('return')));
        // iii. If return is undefined, then
        if (ret === Value.undefined) {
          // Set value to received.[[Value]].
          let value: Value = received.Value;
          // 1. If generatorKind is async, then set received.[[Value]] to ? Await(received.[[Value]]).
          if (generatorKind === 'async') {
            value = Q(yield* Await(value));
          }
          // 2. Return ReturnCompletion(value).
          return ReturnCompletion(value);
        }
        // iv. Let innerReturnResult be ? Call(return, iterator, « received.[[Value]] »).
        let innerReturnResult: Value = Q(yield* Call(ret, iterator, [received.Value]));
        // v. If generatorKind is async, then set innerReturnResult to ? Await(innerReturnResult).
        if (generatorKind === 'async') {
          innerReturnResult = Q(yield* Await(innerReturnResult));
        }
        // vi. If Type(innerReturnResult) is not Object, throw a TypeError exception.
        if (!(innerReturnResult instanceof ObjectValue)) {
          return surroundingAgent.Throw('TypeError', 'NotAnObject', innerReturnResult);
        }
        // vii. Let done be ? IteratorComplete(innerReturnResult).
        const done = Q(yield* IteratorComplete(innerReturnResult));
        // viii. If done is true, then
        if (done === Value.true) {
          // 1. Set value to ? IteratorValue(innerReturnResult).
          value = Q(yield* IteratorValue(innerReturnResult));
          // 2. Return ReturnCompletion(value).
          return ReturnCompletion(value);
        }
        // ix. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).
        if (generatorKind === 'async') {
          received = yield* AsyncGeneratorYield(Q(yield* IteratorValue(innerReturnResult)));
        } else { // ixx. Else, set received to GeneratorYield(innerResult).
          received = yield* GeneratorYield(innerReturnResult);
        }
      }
    }
  }
  if (AssignmentExpression) {
    // 1. Let exprRef be the result of evaluating AssignmentExpression.
    const exprRef = yield* Evaluate(AssignmentExpression);
    // 2. Let value be ? GetValue(exprRef).
    const value = Q(yield* GetValue(exprRef));
    // 3. Return ? Yield(value).
    return Q(yield* Yield(value));
  }
  // 1. Return ? Yield(undefined).
  return Q(yield* Yield(Value.undefined));
}
