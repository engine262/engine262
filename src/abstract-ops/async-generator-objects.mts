// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  Q, X,
  Await,
  Completion,
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
  ThrowCompletion,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { resume, handleInResume } from '../helpers.mjs';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateIterResultObject,
  generatorBrandToErrorMessageType,
  GetGeneratorKind,
  OrdinaryObjectCreate,
  PerformPromiseThen,
  PromiseResolve,
  RequireInternalSlot,
  SameValue,
} from './all.mjs';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-asyncgenerator-objects */

/** https://tc39.es/ecma262/#sec-asyncgeneratorrequest-records */
class AsyncGeneratorRequestRecord {
  Completion;
  Capability;
  constructor(completion, promiseCapability) {
    this.Completion = completion;
    this.Capability = promiseCapability;
  }
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorstart */
export function AsyncGeneratorStart(generator, generatorBody) {
  // 1. Assert: generator.[[AsyncGeneratorState]] is undefined.
  Assert(generator.AsyncGeneratorState === Value.undefined);
  // 2. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 3. Set the Generator component of genContext to generator.
  genContext.Generator = generator;
  // 4. Set the code evaluation state of genContext such that when evaluation
  //    is resumed for that execution context the following steps will be performed:
  genContext.codeEvaluationState = (function* resumer() {
    // a. If generatorBody is a Parse Node, then
    //     i. Let result be the result of evaluating generatorBody.
    // b. Else,
    //     i. Assert: generatorBody is an Abstract Closure.
    //     ii. Let result be generatorBody().
    let result = EnsureCompletion(
      // Note: Engine262 can only perform the "If generatorBody is an Abstract Closure" check:
      yield* typeof generatorBody === 'function'
        ? generatorBody()
        : Evaluate(generatorBody),
    );
    // c. Assert: If we return here, the async generator either threw an exception or performed either an implicit or explicit return.
    // d. Remove genContext from the execution context stack and restore the execution context
    //    that is at the top of the execution context stack as the running execution context.
    surroundingAgent.executionContextStack.pop(genContext);
    // e. Set generator.[[AsyncGeneratorState]] to completed.
    generator.AsyncGeneratorState = 'completed';
    // f. If result.[[Type]] is normal, set result to NormalCompletion(undefined).
    if (result.Type === 'normal') {
      result = NormalCompletion(Value.undefined);
    }
    // g. If result.[[Type]] is return, set result to NormalCompletion(result.[[Value]]).
    if (result.Type === 'return') {
      result = NormalCompletion(result.Value);
    }
    // h. Perform ! AsyncGeneratorCompleteStep(generator, result, true).
    X(AsyncGeneratorCompleteStep(generator, result, Value.true));
    // i. Perform ! AsyncGeneratorDrainQueue(generator).
    X(AsyncGeneratorDrainQueue(generator));
    // j. Return undefined.
    return Value.undefined;
  }());
  // 5. Set generator.[[AsyncGeneratorContext]] to genContext.
  generator.AsyncGeneratorContext = genContext;
  // 6. Set generator.[[AsyncGeneratorState]] to suspendedStart.
  generator.AsyncGeneratorState = 'suspendedStart';
  // 7. Set generator.[[AsyncGeneratorQueue]] to a new empty List.
  generator.AsyncGeneratorQueue = [];
  // 8. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorvalidate */
export function AsyncGeneratorValidate(generator, generatorBrand) {
  // 1. Perform ? RequireInternalSlot(generator, [[AsyncGeneratorContext]]).
  Q(RequireInternalSlot(generator, 'AsyncGeneratorContext'));
  // 2. Perform ? RequireInternalSlot(generator, [[AsyncGeneratorState]]).
  Q(RequireInternalSlot(generator, 'AsyncGeneratorState'));
  // 3. Perform ? RequireInternalSlot(generator, [[AsyncGeneratorQueue]]).
  Q(RequireInternalSlot(generator, 'AsyncGeneratorQueue'));
  // 4. If generator.[[GeneratorBrand]] is not the same value as generatorBrand, throw a TypeError exception.
  const brand = generator.GeneratorBrand;
  if (
    brand === undefined || generatorBrand === undefined
      ? brand !== generatorBrand
      : SameValue(brand, generatorBrand) === Value.false
  ) {
    return surroundingAgent.Throw(
      'TypeError',
      'NotATypeObject',
      generatorBrandToErrorMessageType(generatorBrand) || 'AsyncGenerator',
      generator,
    );
  }
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorenqueue */
export function AsyncGeneratorEnqueue(generator, completion, promiseCapability) {
  // 1. Let request be AsyncGeneratorRequest { [[Completion]]: completion, [[Capability]]: promiseCapability }.
  const request = new AsyncGeneratorRequestRecord(completion, promiseCapability);
  // 2. Append request to the end of generator.[[AsyncGeneratorQueue]].
  generator.AsyncGeneratorQueue.push(request);
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorcompletestep */
function AsyncGeneratorCompleteStep(generator, completion, done, realm) {
  // 1. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 2. Assert: queue is not empty.
  Assert(queue.length > 0);
  // 3. Let next be the first element of queue.
  // 4. Remove the first element from queue.
  const next = queue.shift();
  // 5. Let promiseCapability be next.[[Capability]].
  const promiseCapability = next.Capability;
  // 6. Let value be completion.[[Value]].
  const value = completion.Value;
  // 7. If completion.[[Type]] is throw, then
  if (completion.Type === 'throw') {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « value »).
    X(Call(promiseCapability.Reject, Value.undefined, [value]));
  } else { // 8. Else,
    // a. Assert: completion.[[Type]] is normal.
    Assert(completion.Type === 'normal');
    let iteratorResult;
    // b. If realm is present, then
    if (realm !== undefined) {
      // i. Let oldRealm be the running execution context's Realm.
      const oldRealm = surroundingAgent.runningExecutionContext.Realm;
      // ii. Set the running execution context's Realm to realm.
      surroundingAgent.runningExecutionContext.Realm = realm;
      // iii. Let iteratorResult be ! CreateIterResultObject(value, done).
      iteratorResult = X(CreateIterResultObject(value, done));
      // iv. Set the running execution context's Realm to oldRealm.
      surroundingAgent.runningExecutionContext.Realm = oldRealm;
    } else { // c. Else,
      // i. Let iteratorResult be ! CreateIterResultObject(value, done).
      iteratorResult = X(CreateIterResultObject(value, done));
    }
    // d. Perform ! Call(promiseCapability.[[Resolve]], undefined, « iteratorResult »).
    X(Call(promiseCapability.Resolve, Value.undefined, [iteratorResult]));
  }
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorresume */
export function AsyncGeneratorResume(generator, completion) {
  // 1. Assert: generator.[[AsyncGeneratorState]] is either suspendedStart or suspendedYield.
  Assert(generator.AsyncGeneratorState === 'suspendedStart' || generator.AsyncGeneratorState === 'suspendedYield');
  // 2. Let genContext be generator.[[AsyncGeneratorContext]].
  const genContext = generator.AsyncGeneratorContext;
  // 3. Let callerContext be the running execution context.
  const callerContext = surroundingAgent.runningExecutionContext;
  // 4. Suspend callerContext.
  // 5. Set generator.[[AsyncGeneratorState]] to executing.
  generator.AsyncGeneratorState = 'executing';
  // 6. Push genContext onto the execution context stack; genContext is now the running execution context.
  surroundingAgent.executionContextStack.push(genContext);
  // 7. Resume the suspended evaluation of genContext using completion as the result of the operation that suspended it. Let result be the completion record returned by the resumed computation.
  const result = resume(genContext, completion);
  // 8. Assert: result is never an abrupt completion.
  Assert(!(result instanceof AbruptCompletion));
  // 9. Assert: When we return here, genContext has already been removed from the execution context stack and callerContext is the currently running execution context.
  Assert(surroundingAgent.runningExecutionContext === callerContext);
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorunwrapyieldresumption */
function* AsyncGeneratorUnwrapYieldResumption(resumptionValue) {
  // 1. If resumptionValue.[[Type]] is not return, return Completion(resumptionValue).
  if (resumptionValue.Type !== 'return') {
    return Completion(resumptionValue);
  }
  // 2. Let awaited be Await(resumptionValue.[[Value]]).
  const awaited = EnsureCompletion(yield* Await(resumptionValue.Value));
  // 3. If awaited.[[Type]] is throw, return Completion(awaited).
  if (awaited.Type === 'throw') {
    return Completion(awaited);
  }
  // 4. Assert: awaited.[[Type]] is normal.
  Assert(awaited.Type === 'normal');
  // 5. Return Completion { [[Type]]: return, [[Value]]: awaited.[[Value]], [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: awaited.Value, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-asyncgeneratoryield */
export function* AsyncGeneratorYield(value) {
  // 1. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 2. Assert: genContext is the execution context of a generator.
  Assert(genContext.Generator !== Value.undefined);
  // 3. Let generator be the value of the Generator component of genContext.
  const generator = genContext.Generator;
  // 4. Assert: GetGeneratorKind() is async.
  Assert(GetGeneratorKind() === 'async');
  // 5. Let completion be NormalCompletion(value).
  const completion = NormalCompletion(value);
  // 6. Assert: The execution context stack has at least two elements.
  Assert(surroundingAgent.executionContextStack.length >= 2);
  // 7. Let previousContext be the second to top element of the execution context stack.
  const previousContext = surroundingAgent.executionContextStack[surroundingAgent.executionContextStack.length - 2];
  // 8. Let previousRealm be previousContext's Realm.
  const previousRealm = previousContext.Realm;
  // 9. Perform ! AsyncGeneratorCompleteStep(generator, completion, false, previousRealm).
  X(AsyncGeneratorCompleteStep(generator, completion, Value.false, previousRealm));
  // 10. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 11. If queue is not empty, then
  if (queue.length > 0) {
    // a. NOTE: Execution continues without suspending the generator.
    // b. Let toYield be the first element of queue.
    const toYield = queue[0];
    // c. Let resumptionValue be toYield.[[Completion]].
    const resumptionValue = toYield.Completion;
    // d. Return AsyncGeneratorUnwrapYieldResumption(resumptionValue).
    return yield* AsyncGeneratorUnwrapYieldResumption(resumptionValue);
  } else { // 12. Else,
    // a. Set generator.[[AsyncGeneratorState]] to suspendedYield.
    generator.AsyncGeneratorState = 'suspendedYield';
    // b. Remove genContext from the execution context stack and restore the execution context that is at the top of the execution context stack as the running execution context.
    surroundingAgent.executionContextStack.pop(genContext);
    // c. Set the code evaluation state of genContext such that when evaluation is resumed with a Completion resumptionValue the following steps will be performed:
    const resumptionValue = EnsureCompletion(yield handleInResume(() => Value.undefined));
    // i. Return AsyncGeneratorUnwrapYieldResumption(resumptionValue).
    return yield* AsyncGeneratorUnwrapYieldResumption(resumptionValue);
    // ii. NOTE: When the above step returns, it returns to the evaluation of the YieldExpression production that originally called this abstract operation.

    // d. Return undefined.
    // e. NOTE: This returns to the evaluation of the operation that had most previously resumed evaluation of genContext.
  }
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorawaitreturn */
export function AsyncGeneratorAwaitReturn(generator) {
  // 1. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 2. Assert: queue is not empty.
  Assert(queue.length > 0);
  // 3. Let next be the first element of queue.
  const next = queue[0];
  // 4. Let completion be next.[[Completion]].
  const completion = next.Completion;
  // 5. Assert: completion.[[Type]] is return.
  Assert(completion.Type === 'return');
  // 6. Let promise be ? PromiseResolve(%Promise%, completion.[[Value]]).
  const promise = Q(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), completion.Value));
  // 7. Let fulfilledClosure be a new Abstract Closure with parameters (value) that captures generator and performs the following steps when called:
  const fulfilledClosure = ([value = Value.undefined]) => {
    // a. Set generator.[[AsyncGeneratorState]] to completed.
    generator.AsyncGeneratorState = 'completed';
    // b. Let result be NormalCompletion(value).
    const result = NormalCompletion(value);
    // c. Perform ! AsyncGeneratorCompleteStep(generator, result, true).
    X(AsyncGeneratorCompleteStep(generator, result, Value.true));
    // d. Perform ! AsyncGeneratorDrainQueue(generator).
    X(AsyncGeneratorDrainQueue(generator));
    // e. Return undefined.
    return Value.undefined;
  };
  // 8. Let onFulfilled be ! CreateBuiltinFunction(fulfilledClosure, 1, "", « »).
  const onFulfilled = X(CreateBuiltinFunction(fulfilledClosure, 1, Value(''), []));
  // 9. Let rejectedClosure be a new Abstract Closure with parameters (reason) that captures generator and performs the following steps when called:
  const rejectedClosure = ([reason = Value.undefined]) => {
    // a. Set generator.[[AsyncGeneratorState]] to completed.
    generator.AsyncGeneratorState = 'completed';
    // b. Let result be ThrowCompletion(reason).
    const result = ThrowCompletion(reason);
    // c. Perform ! AsyncGeneratorCompleteStep(generator, result, true).
    X(AsyncGeneratorCompleteStep(generator, result, Value.true));
    // d. Perform ! AsyncGeneratorDrainQueue(generator).
    X(AsyncGeneratorDrainQueue(generator));
    // e. Return undefined.
    return Value.undefined;
  };
  // 10. Let onRejected be ! CreateBuiltinFunction(rejectedClosure, 1, "", « »).
  const onRejected = X(CreateBuiltinFunction(rejectedClosure, 1, Value(''), []));
  // 11. Perform ! PerformPromiseThen(promise, onFulfilled, onRejected).
  X(PerformPromiseThen(promise, onFulfilled, onRejected));
}

/** https://tc39.es/ecma262/#sec-asyncgeneratordrainqueue */
function AsyncGeneratorDrainQueue(generator) {
  // 1. Assert: generator.[[AsyncGeneratorState]] is completed.
  Assert(generator.AsyncGeneratorState === 'completed');
  // 2. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 3. If queue is empty, return.
  if (queue.length === 0) {
    return;
  }
  // 4. Let done be false.
  let done = false;
  // 5. Repeat, while done is false,
  while (done === false) {
    // a. Let next be the first element of queue.
    const next = queue[0];
    // b. Let completion be next.[[Completion]].
    let completion = next.Completion;
    // c. If completion.[[Type]] is return, then
    if (completion.Type === 'return') {
      // i. Set generator.[[AsyncGeneratorState]] to awaiting-return.
      generator.AsyncGeneratorState = 'awaiting-return';
      // ii. Perform ! AsyncGeneratorAwaitReturn(generator).
      X(AsyncGeneratorAwaitReturn(generator));
      // iii. Set done to true.
      done = true;
    } else { // d. Else,
      // i. If completion.[[Type]] is normal, then
      if (completion.type === 'normal') {
        // 1. Set completion to NormalCompletion(undefined).
        completion = NormalCompletion(Value.undefined);
      }
      // ii. Perform ! AsyncGeneratorCompleteStep(generator, completion, true).
      X(AsyncGeneratorCompleteStep(generator, completion, Value.true));
      // iii. If queue is empty, set done to true.
      if (queue.length === 0) {
        done = true;
      }
    }
  }
}

/** https://tc39.es/ecma262/#sec-createasynciteratorfromclosure */
export function CreateAsyncIteratorFromClosure(closure, generatorBrand, generatorPrototype) {
  Assert(typeof closure === 'function');
  // 1. NOTE: closure can contain uses of the Await shorthand, and uses of the Yield shorthand to yield an IteratorResult object.
  // 2. Let internalSlotsList be « [[AsyncGeneratorState]], [[AsyncGeneratorContext]], [[AsyncGeneratorQueue]], [[GeneratorBrand]] ».
  const internalSlotsList = ['AsyncGeneratorState', 'AsyncGeneratorContext', 'AsyncGeneratorQueue', 'GeneratorBrand'];
  // 3. Let generator be ! OrdinaryObjectCreate(generatorPrototype, internalSlotsList).
  const generator = X(OrdinaryObjectCreate(generatorPrototype, internalSlotsList));
  // 4. Set generator.[[GeneratorBrand]] to generatorBrand.
  generator.GeneratorBrand = generatorBrand;
  // 5. Set generator.[[AsyncGeneratorState]] to undefined.
  generator.AsyncGeneratorState = Value.undefined;
  // 6. Perform ? AsyncGeneratorStart(generator, closure, generatorBrand).
  Q(AsyncGeneratorStart(generator, closure));
  // 7. Return generator.
  return generator;
}
