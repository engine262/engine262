import { surroundingAgent } from '../engine.mjs';
import {
  Q, X,
  Await,
  Completion,
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
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
  NewPromiseCapability,
  OrdinaryObjectCreate,
  PerformPromiseThen,
  PromiseResolve,
  RequireInternalSlot,
  SameValue,
} from './all.mjs';

// This file covers abstract operations defined in
// 25.5 #sec-asyncgenerator-objects

// 25.5.3.1 #sec-asyncgeneratorrequest-records
class AsyncGeneratorRequestRecord {
  constructor(completion, promiseCapability) {
    this.Completion = completion;
    this.Capability = promiseCapability;
  }
}

// 25.5.3.2 #sec-asyncgeneratorstart
export function AsyncGeneratorStart(generator, generatorBody) {
  // 1. Assert: generator is an AsyncGenerator instance.
  // 2. Assert: generator.[[AsyncGeneratorState]] is undefined.
  Assert(generator.AsyncGeneratorState === Value.undefined);
  // 3. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 4. Set the Generator component of genContext to generator.
  genContext.Generator = generator;
  // 5. Set the code evaluation state of genContext such that when evaluation
  //    is resumed for that execution context the following steps will be performed:
  genContext.codeEvaluationState = (function* resumer() {
    // a. If generatorBody is a Parse Node, then
    //     i. Let result be the result of evaluating generatorBody.
    // b. Else,
    //     i. Assert: generatorBody is an Abstract Closure.
    //     ii. Let result be generatorBody().
    const result = EnsureCompletion(
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
    let resultValue;
    // f. If result is a normal completion, let resultValue be undefined.
    if (result instanceof NormalCompletion) {
      resultValue = Value.undefined;
    } else { // g. Else,
      // i. Let resultValue be result.[[Value]].
      resultValue = result.Value;
      // ii. If result.[[Type]] is not return, then
      if (result.Type !== 'return') {
        // 1. Return ! AsyncGeneratorReject(generator, resultValue).
        return X(AsyncGeneratorReject(generator, resultValue));
      }
    }
    // h. Return ! AsyncGeneratorResolve(generator, resultValue, true).
    return X(AsyncGeneratorResolve(generator, resultValue, Value.true));
  }());
  // 6. Set generator.[[AsyncGeneratorContext]] to genContext.
  generator.AsyncGeneratorContext = genContext;
  // 7. Set generator.[[AsyncGeneratorState]] to suspendedStart.
  generator.AsyncGeneratorState = 'suspendedStart';
  // 8. Set generator.[[AsyncGeneratorQueue]] to a new empty List.
  generator.AsyncGeneratorQueue = [];
  // 9. Return undefined.
  return Value.undefined;
}

// #sec-asyncgeneratorvalidate
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

// 25.5.3.3 #sec-asyncgeneratorresolve
function AsyncGeneratorResolve(generator, value, done) {
  // 1. Assert: generator is an AsyncGenerator instance.
  // 2. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 3. Assert: queue is not an empty List.
  Assert(queue.length > 0);
  // 4. Let next be the first element of queue.
  // 5. Remove the first element from queue.
  const next = queue.shift();
  // 6. Let promiseCapability be next.[[Capability]].
  const promiseCapability = next.Capability;
  // 7. Let iteratorResult be ! CreateIterResultObject(value, done).
  const iteratorResult = X(CreateIterResultObject(value, done));
  // 8. Perform ! Call(promiseCapability.[[Resolve]], undefined, « iteratorResult »).
  X(Call(promiseCapability.Resolve, Value.undefined, [iteratorResult]));
  // 9. Perform ! AsyncGeneratorResumeNext(generator).
  X(AsyncGeneratorResumeNext(generator));
  // 10. Return undefined.
  return Value.undefined;
}

// 25.5.3.4 #sec-asyncgeneratorreject
function AsyncGeneratorReject(generator, exception) {
  // 1. Assert: generator is an AsyncGenerator instance.
  // 2. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 3. Assert: queue is not an empty List.
  Assert(queue.length > 0);
  // 4. Let next be the first element of queue.
  // 5. Remove the first element from queue.
  const next = queue.shift();
  // 6. Let promiseCapability be next.[[Capability]].
  const promiseCapability = next.Capability;
  // 7. Perform ! Call(promiseCapability.[[Reject]], undefined, « exception »).
  X(Call(promiseCapability.Reject, Value.undefined, [exception]));
  // 8. Perform ! AsyncGeneratorResumeNext(generator).
  X(AsyncGeneratorResumeNext(generator));
  // 9. Return undefined.
  return Value.undefined;
}

// 25.5.3.5.1 #async-generator-resume-next-return-processor-fulfilled
function AsyncGeneratorResumeNextReturnProcessorFulfilledFunctions([value = Value.undefined]) {
  const F = surroundingAgent.activeFunctionObject;
  F.Generator.AsyncGeneratorState = 'completed';
  return X(AsyncGeneratorResolve(F.Generator, value, Value.true));
}

// 25.5.3.5.2 #async-generator-resume-next-return-processor-rejected
function AsyncGeneratorResumeNextReturnProcessorRejectedFunctions([reason = Value.undefined]) {
  const F = surroundingAgent.activeFunctionObject;
  F.Generator.AsyncGeneratorState = 'completed';
  return X(AsyncGeneratorReject(F.Generator, reason));
}

// 25.5.3.5 #sec-asyncgeneratorresumenext
function AsyncGeneratorResumeNext(generator) {
  let state = generator.AsyncGeneratorState;
  Assert(state !== 'executing');
  if (state === 'awaiting-return') {
    return Value.undefined;
  }
  const queue = generator.AsyncGeneratorQueue;
  if (queue.length === 0) {
    return Value.undefined;
  }
  const next = queue[0];
  Assert(next instanceof AsyncGeneratorRequestRecord);
  const completion = next.Completion;
  if (completion instanceof AbruptCompletion) {
    if (state === 'suspendedStart') {
      generator.AsyncGeneratorState = 'completed';
      state = 'completed';
    }
    if (state === 'completed') {
      if (completion.Type === 'return') {
        generator.AsyncGeneratorState = 'awaiting-return';
        const promise = Q(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), completion.Value));
        const stepsFulfilled = AsyncGeneratorResumeNextReturnProcessorFulfilledFunctions;
        const onFulfilled = X(CreateBuiltinFunction(stepsFulfilled, ['Generator']));
        onFulfilled.Generator = generator;
        const stepsRejected = AsyncGeneratorResumeNextReturnProcessorRejectedFunctions;
        const onRejected = X(CreateBuiltinFunction(stepsRejected, ['Generator']));
        onRejected.Generator = generator;
        X(PerformPromiseThen(promise, onFulfilled, onRejected));
        return Value.undefined;
      } else {
        Assert(completion.Type === 'throw');
        X(AsyncGeneratorReject(generator, completion.Value));
        return Value.undefined;
      }
    }
  } else if (state === 'completed') {
    return X(AsyncGeneratorResolve(generator, Value.undefined, Value.true));
  }
  Assert(state === 'suspendedStart' || state === 'suspendedYield');
  const genContext = generator.AsyncGeneratorContext;
  const callerContext = surroundingAgent.runningExecutionContext;
  // Suspend callerContext
  generator.AsyncGeneratorState = 'executing';
  surroundingAgent.executionContextStack.push(genContext);
  const result = resume(genContext, completion);
  Assert(!(result instanceof AbruptCompletion));
  Assert(surroundingAgent.runningExecutionContext === callerContext);
  return Value.undefined;
}

// 25.5.3.6 #sec-asyncgeneratorenqueue
export function AsyncGeneratorEnqueue(generator, completion, generatorBrand) {
  Assert(completion instanceof Completion);
  // 1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 2. Let check be AsyncGeneratorValidate(generator, generatorBrand).
  const check = AsyncGeneratorValidate(generator, generatorBrand);
  // 3. If check is an abrupt completion, then
  if (check instanceof AbruptCompletion) {
    // a. Let badGeneratorError be a newly created TypeError object.
    const badGeneratorError = surroundingAgent.Throw(
      'TypeError',
      'NotATypeObject',
      generatorBrandToErrorMessageType(generatorBrand) || 'AsyncGenerator',
      generator,
    ).Value;
    // b. Perform ! Call(promiseCapability.[[Reject]], undefined, « badGeneratorError »).
    X(Call(promiseCapability.Reject, Value.undefined, [badGeneratorError]));
    // c. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 4. Let queue be generator.[[AsyncGeneratorQueue]].
  const queue = generator.AsyncGeneratorQueue;
  // 5. Let request be AsyncGeneratorRequest { [[Completion]]: completion, [[Capability]]: promiseCapability }.
  const request = new AsyncGeneratorRequestRecord(completion, promiseCapability);
  // 6. Append request to the end of queue.
  queue.push(request);
  // 7. Let state be generator.[[AsyncGeneratorState]].
  const state = generator.AsyncGeneratorState;
  // 8. If state is not executing, then
  if (state !== 'executing') {
    // a. Perform ! AsyncGeneratorResumeNext(generator).
    X(AsyncGeneratorResumeNext(generator));
  }
  // 9. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}

// #sec-asyncgeneratoryield
export function* AsyncGeneratorYield(value) {
  // 1. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 2. Assert: genContext is the execution context of a generator.
  Assert(genContext.Generator !== Value.undefined);
  // 3. Let generator be the value of the Generator component of genContext.
  const generator = genContext.Generator;
  // 4. Assert: GetGeneratorKind() is async.
  Assert(GetGeneratorKind() === 'async');
  // 5. Set value to ? Await(value).
  value = Q(yield* Await(value));
  // 6. Set generator.[[AsyncGeneratorState]] to suspendedYield.
  generator.AsyncGeneratorState = 'suspendedYield';
  // 7. Remove genContext from the execution context stack and restore the execution context that is at the top of the execution context stack as the running execution context.
  surroundingAgent.executionContextStack.pop(genContext);
  // 8. Set the code evaluation state of genContext such that when evaluation is resumed with a Completion resumptionValue the following steps will be performed:
  const resumptionValue = EnsureCompletion(yield handleInResume(AsyncGeneratorResolve, generator, value, Value.false, generator.GeneratorBrand));

  // a. If resumptionValue.[[Type]] is not return, return Completion(resumptionValue).
  if (resumptionValue.Type !== 'return') {
    return Completion(resumptionValue);
  }
  // b. Let awaited be Await(resumptionValue.[[Value]]).
  const awaited = EnsureCompletion(yield* Await(resumptionValue.Value));
  // c. If awaited.[[Type]] is throw, return Completion(awaited).
  if (awaited.Type === 'throw') {
    return Completion(awaited);
  }
  // d. Assert: awaited.[[Type]] is normal.
  Assert(awaited.Type === 'normal');
  // e. Return Completion { [[Type]]: return, [[Value]]: awaited.[[Value]], [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: awaited.Value, Target: undefined });
  // f. NOTE: When one of the above steps returns, it returns to the evaluation of the YieldExpression production that originally called this abstract operation.

  // 9. Return ! AsyncGeneratorResolve(generator, value, false, generator.[[GeneratorBrand]]).
  // 10. NOTE: This returns to the evaluation of the operation that had most previously resumed evaluation of genContext.
}

// #sec-createasynciteratorfromclosure
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
