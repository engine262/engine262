import { ExecutionContext, surroundingAgent } from '../host-defined/engine.mts';
import {
  Q, X,
  Await,
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
  ThrowCompletion,
  type YieldCompletion,
  ReturnCompletion,
} from '../completion.mts';
import { Evaluate, type PlainEvaluator, type YieldEvaluator } from '../evaluator.mts';
import {
  BooleanValue, JSStringValue, ObjectValue, Value, type Arguments,
  type NativeSteps,
} from '../value.mts';
import {
  resume, __ts_cast__, type Mutable,
} from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateIteratorResultObject,
  generatorBrandToErrorMessageType,
  GetGeneratorKind,
  OrdinaryObjectCreate,
  PerformPromiseThen,
  PromiseCapabilityRecord,
  PromiseResolve,
  Realm,
  RequireInternalSlot,
  SameValue,
  type OrdinaryObject,
} from './all.mts';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-asyncgenerator-objects */

/** https://tc39.es/ecma262/#sec-asyncgeneratorrequest-records */
class AsyncGeneratorRequestRecord {
  Completion: YieldCompletion;

  Capability: PromiseCapabilityRecord;

  constructor(completion: YieldCompletion, promiseCapability: PromiseCapabilityRecord) {
    this.Completion = completion;
    this.Capability = promiseCapability;
  }
}

export interface AsyncGeneratorObject extends OrdinaryObject {
  AsyncGeneratorState: 'suspendedStart' | 'suspendedYield' | 'executing' | 'completed' | 'draining-queue';
  AsyncGeneratorContext: ExecutionContext;
  AsyncGeneratorQueue: AsyncGeneratorRequestRecord[];
  GeneratorBrand: JSStringValue | undefined;
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorstart */
export function AsyncGeneratorStart(generator: AsyncGeneratorObject, generatorBody: ParseNode.AsyncGeneratorBody | (() => YieldEvaluator)) {
  // 1. Assert: generator.[[AsyncGeneratorState]] is 'suspendedStart'.
  Assert(generator.AsyncGeneratorState === 'suspendedStart');
  // 2. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 3. Set the Generator component of genContext to generator.
  genContext.Generator = generator;
  const closure = function* resumer(): YieldEvaluator {
    const acGenContext = surroundingAgent.runningExecutionContext;
    const acGenerator = acGenContext.Generator as AsyncGeneratorObject;
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
    ) as YieldCompletion;
    // c. Assert: If we return here, the async generator either threw an exception or performed either an implicit or explicit return.
    // d. Remove genContext from the execution context stack and restore the execution context
    //    that is at the top of the execution context stack as the running execution context.
    surroundingAgent.executionContextStack.pop(acGenContext);
    // e. Set generator.[[AsyncGeneratorState]] to completed.
    acGenerator.AsyncGeneratorState = 'draining-queue';
    // f. If result.[[Type]] is normal, set result to NormalCompletion(undefined).
    if (result instanceof NormalCompletion) {
      result = NormalCompletion(Value.undefined);
    }
    // g. If result.[[Type]] is return, set result to NormalCompletion(result.[[Value]]).
    if (result instanceof ReturnCompletion) {
      result = NormalCompletion(result.Value);
    }
    // h. Perform AsyncGeneratorCompleteStep(generator, result, true).
    AsyncGeneratorCompleteStep(acGenerator, result, Value.true);
    // i. Perform AsyncGeneratorDrainQueue(generator).
    yield* AsyncGeneratorDrainQueue(acGenerator);
    // j. Return undefined.
    return Value.undefined;
  };
  // 4. Set the code evaluation state of genContext such that when evaluation
  //    is resumed for that execution context the following steps will be performed:
  genContext.codeEvaluationState = (closure());
  // 5. Set generator.[[AsyncGeneratorContext]] to genContext.
  generator.AsyncGeneratorContext = genContext;
  // 7. Set generator.[[AsyncGeneratorQueue]] to a new empty List.
  generator.AsyncGeneratorQueue = [];
  // 8. Return undefined.
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorvalidate */
export function AsyncGeneratorValidate(generator: Value, generatorBrand: JSStringValue | undefined) {
  // 1. Perform ? RequireInternalSlot(generator, [[AsyncGeneratorContext]]).
  Q(RequireInternalSlot(generator, 'AsyncGeneratorContext'));
  // 2. Perform ? RequireInternalSlot(generator, [[AsyncGeneratorState]]).
  Q(RequireInternalSlot(generator, 'AsyncGeneratorState'));
  // 3. Perform ? RequireInternalSlot(generator, [[AsyncGeneratorQueue]]).
  Q(RequireInternalSlot(generator, 'AsyncGeneratorQueue'));
  __ts_cast__<AsyncGeneratorObject>(generator);
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
  return undefined;
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorenqueue */
export function AsyncGeneratorEnqueue(generator: AsyncGeneratorObject, completion: YieldCompletion, promiseCapability: PromiseCapabilityRecord) {
  // 1. Let request be AsyncGeneratorRequest { [[Completion]]: completion, [[Capability]]: promiseCapability }.
  const request = new AsyncGeneratorRequestRecord(completion, promiseCapability);
  // 2. Append request to the end of generator.[[AsyncGeneratorQueue]].
  generator.AsyncGeneratorQueue.push(request);
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorcompletestep */
function AsyncGeneratorCompleteStep(generator: AsyncGeneratorObject, completion: YieldCompletion, done: BooleanValue, realm?: Realm) {
  // 1. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 2. Assert: queue is not empty.
  Assert(queue.length > 0);
  // 3. Let next be the first element of queue.
  // 4. Remove the first element from queue.
  const next = queue.shift()!;
  // 5. Let promiseCapability be next.[[Capability]].
  const promiseCapability = next.Capability;
  // 6. Let value be completion.[[Value]].
  const value = completion.Value;
  // 7. If completion.[[Type]] is throw, then
  if (completion instanceof ThrowCompletion) {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « value »).
    X(Call(promiseCapability.Reject, Value.undefined, [value]));
  } else { // 8. Else,
    // a. Assert: completion.[[Type]] is normal.
    Assert(completion instanceof NormalCompletion);
    let iteratorResult;
    // b. If realm is present, then
    if (realm !== undefined) {
      // i. Let oldRealm be the running execution context's Realm.
      const oldRealm = surroundingAgent.runningExecutionContext.Realm;
      // ii. Set the running execution context's Realm to realm.
      surroundingAgent.runningExecutionContext.Realm = realm;
      // iii. Let iteratorResult be CreateIteratorResultObject(value, done).
      iteratorResult = CreateIteratorResultObject(value, done);
      // iv. Set the running execution context's Realm to oldRealm.
      surroundingAgent.runningExecutionContext.Realm = oldRealm;
    } else { // c. Else,
      // i. Let iteratorResult be CreateIteratorResultObject(value, done).
      iteratorResult = CreateIteratorResultObject(value, done);
    }
    // d. Perform ! Call(promiseCapability.[[Resolve]], undefined, « iteratorResult »).
    X(Call(promiseCapability.Resolve, Value.undefined, [iteratorResult]));
  }
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorresume */
export function* AsyncGeneratorResume(generator: AsyncGeneratorObject, completion: YieldCompletion) {
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
  const result = yield* resume(genContext, { type: 'async-generator-resume', value: completion });
  // 8. Assert: result is never an abrupt completion.
  Assert(!(result instanceof AbruptCompletion));
  // 9. Assert: When we return here, genContext has already been removed from the execution context stack and callerContext is the currently running execution context.
  Assert(surroundingAgent.runningExecutionContext === callerContext);
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorunwrapyieldresumption */
function* AsyncGeneratorUnwrapYieldResumption(resumptionValue: YieldCompletion): YieldEvaluator {
  // 1. If resumptionValue.[[Type]] is not return, return Completion(resumptionValue).
  if (!(resumptionValue instanceof ReturnCompletion)) {
    return Q(resumptionValue);
  }
  // 2. Let awaited be Await(resumptionValue.[[Value]]).
  const awaited = EnsureCompletion(yield* Await(resumptionValue.Value));
  // 3. If awaited.[[Type]] is throw, return Completion(awaited).
  if (awaited instanceof ThrowCompletion) {
    return Q(awaited);
  }
  // 4. Assert: awaited.[[Type]] is normal.
  Assert(awaited instanceof NormalCompletion);
  // 5. Return Completion { [[Type]]: return, [[Value]]: awaited.[[Value]], [[Target]]: empty }.
  return ReturnCompletion(awaited.Value);
}

/** https://tc39.es/ecma262/#sec-asyncgeneratoryield */
export function* AsyncGeneratorYield(value: Value): YieldEvaluator {
  // 1. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 2. Assert: genContext is the execution context of a generator.
  Assert(!!genContext.Generator);
  // 3. Let generator be the value of the Generator component of genContext.
  const generator = genContext.Generator as AsyncGeneratorObject;
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
  // 9. Perform AsyncGeneratorCompleteStep(generator, completion, false, previousRealm).
  AsyncGeneratorCompleteStep(generator, completion, Value.false, previousRealm);
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
    const resumptionValue = yield { type: 'async-generator-yield' };
    Assert(resumptionValue.type === 'async-generator-resume');
    // i. Return AsyncGeneratorUnwrapYieldResumption(resumptionValue).
    return yield* AsyncGeneratorUnwrapYieldResumption(EnsureCompletion(resumptionValue.value));
    // ii. NOTE: When the above step returns, it returns to the evaluation of the YieldExpression production that originally called this abstract operation.

    // d. Return undefined.
    // e. NOTE: This returns to the evaluation of the operation that had most previously resumed evaluation of genContext.
  }
}

/** https://tc39.es/ecma262/#sec-asyncgeneratorawaitreturn */
export function* AsyncGeneratorAwaitReturn(generator: AsyncGeneratorObject): PlainEvaluator {
  Assert(generator.AsyncGeneratorState === 'draining-queue');
  // 1. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 2. Assert: queue is not empty.
  Assert(queue.length > 0);
  // 3. Let next be the first element of queue.
  const next = queue[0];
  // 4. Let completion be next.[[Completion]].
  const completion = next.Completion;
  // 5. Assert: completion.[[Type]] is return.
  Assert(completion instanceof ReturnCompletion);
  // 6. Let promise be PromiseResolve(%Promise%, completion.[[Value]]).
  const promiseCompletion = yield* PromiseResolve(surroundingAgent.intrinsic('%Promise%'), completion.Value);
  if (promiseCompletion instanceof AbruptCompletion) {
    AsyncGeneratorCompleteStep(generator, promiseCompletion, Value.true);
    yield* AsyncGeneratorDrainQueue(generator);
    return;
  }
  const promise = X(promiseCompletion);
  // 7. Let fulfilledClosure be a new Abstract Closure with parameters (value) that captures generator and performs the following steps when called:
  const fulfilledClosure: NativeSteps = function* fulfilledClosure([value = Value.undefined]: Arguments) {
    Assert(generator.AsyncGeneratorState === 'draining-queue');
    // b. Let result be NormalCompletion(value).
    const result = NormalCompletion(value);
    // c. Perform AsyncGeneratorCompleteStep(generator, result, true).
    AsyncGeneratorCompleteStep(generator, result, Value.true);
    // d. Perform AsyncGeneratorDrainQueue(generator).
    yield* AsyncGeneratorDrainQueue(generator);
    // e. Return undefined.
    return Value.undefined;
  };
  // 8. Let onFulfilled be CreateBuiltinFunction(fulfilledClosure, 1, "", « »).
  const onFulfilled = CreateBuiltinFunction(fulfilledClosure, 1, Value(''), []);
  // 9. Let rejectedClosure be a new Abstract Closure with parameters (reason) that captures generator and performs the following steps when called:
  const rejectedClosure: NativeSteps = function* rejectedClosure([reason = Value.undefined]: Arguments) {
    Assert(generator.AsyncGeneratorState === 'draining-queue');
    // b. Let result be ThrowCompletion(reason).
    const result = ThrowCompletion(reason);
    // c. Perform AsyncGeneratorCompleteStep(generator, result, true).
    AsyncGeneratorCompleteStep(generator, result, Value.true);
    // d. Perform AsyncGeneratorDrainQueue(generator).
    yield* AsyncGeneratorDrainQueue(generator);
    // e. Return undefined.
    return Value.undefined;
  };
  // 10. Let onRejected be CreateBuiltinFunction(rejectedClosure, 1, "", « »).
  const onRejected = CreateBuiltinFunction(rejectedClosure, 1, Value(''), []);
  // 11. Perform PerformPromiseThen(promise, onFulfilled, onRejected).
  PerformPromiseThen(promise, onFulfilled, onRejected);
}

/** https://tc39.es/ecma262/#sec-asyncgeneratordrainqueue */
function* AsyncGeneratorDrainQueue(generator: AsyncGeneratorObject) {
  // 1. Assert: generator.[[AsyncGeneratorState]] is completed.
  Assert(generator.AsyncGeneratorState === 'draining-queue');
  // 2. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  while (queue.length) {
    const next = queue[0];
    let completion = next.Completion;
    if (completion instanceof ReturnCompletion) {
      yield* AsyncGeneratorAwaitReturn(generator);
      return;
    } else {
      if (completion instanceof NormalCompletion) {
        completion = NormalCompletion(Value.undefined);
      }
      AsyncGeneratorCompleteStep(generator, completion, Value.true);
    }
  }
  generator.AsyncGeneratorState = 'completed';
}

/** https://tc39.es/ecma262/#sec-createasynciteratorfromclosure */
export function CreateAsyncIteratorFromClosure(closure: () => YieldEvaluator, generatorBrand: JSStringValue, generatorPrototype: ObjectValue) {
  Assert(typeof closure === 'function');
  // 1. NOTE: closure can contain uses of the Await shorthand, and uses of the Yield shorthand to yield an IteratorResult object.
  // 2. Let internalSlotsList be « [[AsyncGeneratorState]], [[AsyncGeneratorContext]], [[AsyncGeneratorQueue]], [[GeneratorBrand]] ».
  const internalSlotsList = ['AsyncGeneratorState', 'AsyncGeneratorContext', 'AsyncGeneratorQueue', 'GeneratorBrand'];
  // 3. Let generator be ! OrdinaryObjectCreate(generatorPrototype, internalSlotsList).
  const generator = X(OrdinaryObjectCreate(generatorPrototype, internalSlotsList)) as Mutable<AsyncGeneratorObject>;
  // 4. Set generator.[[GeneratorBrand]] to generatorBrand.
  generator.GeneratorBrand = generatorBrand;
  // 5. Set generator.[[AsyncGeneratorState]] to suspendedStart.
  generator.AsyncGeneratorState = 'suspendedStart';
  const callerContext = surroundingAgent.runningExecutionContext;
  const calleeContext = new ExecutionContext();
  calleeContext.Function = Value.null;
  calleeContext.Realm = callerContext.Realm;
  calleeContext.ScriptOrModule = callerContext.ScriptOrModule;
  // 11. If callerContext is not already suspended, suspend callerContext.
  surroundingAgent.executionContextStack.push(calleeContext);
  // 6. Perform AsyncGeneratorStart(generator, closure, generatorBrand).
  AsyncGeneratorStart(generator, closure);
  surroundingAgent.executionContextStack.pop(calleeContext);
  // 7. Return generator.
  return generator;
}
