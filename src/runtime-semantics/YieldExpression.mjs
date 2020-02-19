import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
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
  AsyncGeneratorYield,
  AsyncIteratorClose,
} from '../abstract-ops/all.mjs';
import {
  Await,
  Completion,
  NormalCompletion,
  ReturnCompletion,
  EnsureCompletion,
  Q, X,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   YieldExpression :
//     `yield`
//     `yield` AssignmentExpression
//     `yield` `*` AssignmentExpression
export function* Evaluate_YieldExpression({ hasStar, AssignmentExpression }) {
  // 1. Let generatorKind be ! GetGeneratorKind().
  const generatorKind = X(GetGeneratorKind());
  if (hasStar) {
    // 2. Let exprRef be the result of evaluating AssignmentExpression.
    const exprRef = yield* Evaluate(AssignmentExpression);
    // 3. Let value be ? GetValue(exprRef).
    const value = Q(GetValue(exprRef));
    // 4. Let iteratorRecord be ? GetIterator(value, generatorKind).
    const iteratorRecord = Q(GetIterator(value, generatorKind));
    // 5. Let iterator be iteratorRecord.[[Iterator]].
    const iterator = iteratorRecord.Iterator;
    // 6. Let received be NormalCompletion(undefined).
    let received = NormalCompletion(Value.undefined);
    // 7. Repeat,
    while (true) {
      // a. If received.[[Type]] is normal, then
      if (received.Type === 'normal') {
        // i. Let innerResult be ? Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]], « received.[[Value]] »).
        let innerResult = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [received.Value]));
        // ii. If generatorKind is async, then set innerResult to ? Await(innerResult).
        if (generatorKind === 'async') {
          innerResult = Q(yield* Await(innerResult));
        }
        // iii. If Type(innerResult) is not Object, throw a TypeError exception.
        if (Type(innerResult) !== 'Object') {
          return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult);
        }
        // iv. Let done be ? IteratorComplete(innerResult).
        const done = Q(IteratorComplete(innerResult));
        // v. If done is true, then
        if (done === Value.true) {
          // 1. Return ? IteratorValue(innerResult).
          return Q(IteratorValue(innerResult));
        }
        // vi. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).
        if (generatorKind === 'async') {
          received = yield* AsyncGeneratorYield(Q(IteratorValue(innerResult)));
        } else { // vii. Else, set received to GeneratorYield(innerResult).
          received = yield* GeneratorYield(innerResult);
        }
      } else if (received.type === 'throw') { // b. Else if received.[[Type]] is throw, then
        // i. Let throw be ? GetMethod(iterator, "throw").
        const thr = Q(GetMethod(iterator, new Value('throw')));
        // ii. If throw is not undefined, then
        if (thr !== Value.undefined) {
          // 1. Let innerResult be ? Call(throw, iterator, « received.[[Value]] »).
          let innerResult = Q(Call(thr, iterator, [received.Value]));
          // 2. If generatorKind is async, then set innerResult to ? Await(innerResult).
          if (generatorKind === 'async') {
            innerResult = Q(yield* Await(innerResult));
          }
          // 3. NOTE: Exceptions from the inner iterator throw method are propagated. Normal completions from an inner throw method are processed similarly to an inner next.
          // 4. If Type(innerResult) is not Object, throw a TypeError exception.
          if (Type(innerResult) !== 'Object') {
            return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult);
          }
          // 5. Let done be ? IteratorComplete(innerResult).
          const done = Q(IteratorComplete(innerResult));
          // 6. If done is true, then
          if (done === Value.true) {
            // a. Return ? IteratorValue(innerResult).
            return Q(IteratorValue(innerResult));
          }
          // 7. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).
          if (generatorKind === 'async') {
            received = yield* AsyncGeneratorYield(Q(IteratorValue(innerResult)));
          } else { // 8. Else, set received to GeneratorYield(innerResult).
            received = yield* GeneratorYield(innerResult);
          }
        } else { // iii. Else,
          // 1. NOTE: If iterator does not have a throw method, this throw is going to terminate the yield* loop. But first we need to give iterator a chance to clean up.
          // 2. Let closeCompletion be Completion { [[Type]]: normal, [[Value]]: empty, [[Target]]: empty }.
          const closeCompletion = NormalCompletion(undefined);
          // 3. If generatorKind is async, perform ? AsyncIteratorClose(iteratorRecord, closeCompletion).
          // 4. Else, perform ? IteratorClose(iteratorRecord, closeCompletion).
          if (generatorKind === 'async') {
            Q(yield* AsyncIteratorClose(iteratorRecord, closeCompletion));
          } else {
            Q(IteratorClose(iteratorRecord, closeCompletion));
          }
          // 5. NOTE: The next step throws a TypeError to indicate that there was a yield* protocol violation: iterator does not have a throw method.
          // 6. Throw a TypeError exception.
          return surroundingAgent.Throw('TypeError', 'IteratorThrowMissing');
        }
      } else { // c. Else,
        // i. Assert: received.[[Type]] is return.
        Assert(received.Type === 'return');
        // ii. Let return be ? GetMethod(iterator, "return").
        const ret = Q(GetMethod(iterator, new Value('return')));
        // iii. If return is undefined, then
        if (ret === Value.undefined) {
          // 1. If generatorKind is async, then set received.[[Value]] to ? Await(received.[[Value]]).
          if (generatorKind === 'async') {
            received.Value = Q(yield* Await(received.Value));
          }
          // 2. Return Completion(received).
          return Completion(received);
        }
        // iv. Let innerReturnResult be ? Call(return, iterator, « received.[[Value]] »).
        let innerReturnResult = Q(Call(ret, iterator, [received.Value]));
        // v. If generatorKind is async, then set innerReturnResult to ? Await(innerReturnResult).
        if (generatorKind === 'async') {
          innerReturnResult = Q(yield* Await(innerReturnResult));
        }
        // vi. If Type(innerReturnResult) is not Object, throw a TypeError exception.
        if (Type(innerReturnResult) !== 'Object') {
          return surroundingAgent.Throw('TypeError', 'NotAnObject', innerReturnResult);
        }
        // vii. Let done be ? IteratorComplete(innerReturnResult).
        const done = Q(IteratorComplete(innerReturnResult));
        // viii. If done is true, then
        if (done === Value.true) {
          // 1. Let value be ? IteratorValue(innerReturnResult).
          const innerValue = Q(IteratorValue(innerReturnResult));
          // 2. Return Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.
          return new ReturnCompletion(innerValue);
        }
        // ix. If generatorKind is async, then set received to AsyncGeneratorYield(? IteratorValue(innerResult)).
        if (generatorKind === 'async') {
          received = yield* AsyncGeneratorYield(Q(IteratorValue(innerReturnResult)));
        } else { // ixx. Else, set received to GeneratorYield(innerResult).
          received = yield* GeneratorYield(innerReturnResult);
        }
      }
      received = EnsureCompletion(received);
    }
  }
  if (AssignmentExpression !== null) {
    // 2. Let exprRef be the result of evaluating AssignmentExpression.
    const exprRef = yield* Evaluate(AssignmentExpression);
    // 3. Let value be ? GetValue(exprRef).
    const value = Q(GetValue(exprRef));
    // 4. If generatorKind is async, then return ? AsyncGeneratorYield(value).
    if (generatorKind === 'async') {
      return Q(yield* AsyncGeneratorYield(value));
    }
    // 5. Otherwise, return ? GeneratorYield(CreateIterResultObject(value, false)).
    return Q(yield* GeneratorYield(CreateIterResultObject(value, Value.false)));
  }
  // 2. If generatorKind is async, then return ? AsyncGeneratorYield(undefined).
  if (generatorKind === 'async') {
    return Q(yield* AsyncGeneratorYield(Value.undefined));
  }
  // 3. Otherwise, return ? GeneratorYield(CreateIterResultObject(undefined, false)).
  return Q(yield* GeneratorYield(CreateIterResultObject(Value.undefined, Value.false)));
}
