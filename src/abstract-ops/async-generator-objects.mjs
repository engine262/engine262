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
import { Value, Type } from '../value.mjs';
import { resume, handleInResume } from '../helpers.mjs';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateIterResultObject,
  GetGeneratorKind,
  NewPromiseCapability,
  PerformPromiseThen,
  PromiseResolve,
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
  // Assert: generator is an AsyncGenerator instance.
  Assert(generator.AsyncGeneratorState === Value.undefined);
  const genContext = surroundingAgent.runningExecutionContext;
  genContext.Generator = generator;
  genContext.codeEvaluationState = (function* resumer() {
    const result = EnsureCompletion(yield* Evaluate(generatorBody));
    // Assert: If we return here, the async generator either threw an exception or performed either an implicit or explicit return.
    surroundingAgent.executionContextStack.pop(genContext);
    generator.AsyncGeneratorState = 'completed';
    let resultValue;
    if (result instanceof NormalCompletion) {
      resultValue = Value.undefined;
    } else {
      resultValue = result.Value;
      if (result.Type !== 'return') {
        return X(AsyncGeneratorReject(generator, resultValue));
      }
    }
    return X(AsyncGeneratorResolve(generator, resultValue, Value.true));
  }());
  generator.AsyncGeneratorContext = genContext;
  generator.AsyncGeneratorState = 'suspendedStart';
  generator.AsyncGeneratorQueue = [];
  return Value.undefined;
}

// 25.5.3.3 #sec-asyncgeneratorresolve
function AsyncGeneratorResolve(generator, value, done) {
  // Assert: generator is an AsyncGenerator instance.
  const queue = generator.AsyncGeneratorQueue;
  Assert(queue.length > 0);
  const next = queue.shift();
  const promiseCapability = next.Capability;
  const iteratorResult = X(CreateIterResultObject(value, done));
  X(Call(promiseCapability.Resolve, Value.undefined, [iteratorResult]));
  X(AsyncGeneratorResumeNext(generator));
  return Value.undefined;
}

// 25.5.3.4 #sec-asyncgeneratorreject
function AsyncGeneratorReject(generator, exception) {
  // Assert: generator is an AsyncGenerator instance.
  const queue = generator.AsyncGeneratorQueue;
  Assert(queue.length > 0);
  const next = queue.shift();
  const promiseCapability = next.Capability;
  X(Call(promiseCapability.Reject, Value.undefined, [exception]));
  X(AsyncGeneratorResumeNext(generator));
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
  // Assert: generator is an AsyncGenerator instance.
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
export function AsyncGeneratorEnqueue(generator, completion) {
  Assert(completion instanceof Completion);
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  if (Type(generator) !== 'Object' || !('AsyncGeneratorState' in generator)) {
    const badGeneratorError = surroundingAgent.Throw('TypeError', 'NotATypeObject', 'AsyncGenerator', generator).Value;
    X(Call(promiseCapability.Reject, Value.undefined, [badGeneratorError]));
    return promiseCapability.Promise;
  }
  const queue = generator.AsyncGeneratorQueue;
  const request = new AsyncGeneratorRequestRecord(completion, promiseCapability);
  queue.push(request);
  const state = generator.AsyncGeneratorState;
  if (state !== 'executing') {
    X(AsyncGeneratorResumeNext(generator));
  }
  return promiseCapability.Promise;
}

// 25.5.3.7 #sec-asyncgeneratoryield
export function* AsyncGeneratorYield(value) {
  const genContext = surroundingAgent.runningExecutionContext;
  Assert(genContext.Generator !== Value.undefined);
  const generator = genContext.Generator;
  Assert(GetGeneratorKind() === 'async');
  value = Q(yield* Await(value));
  generator.AsyncGeneratorState = 'suspendedYield';
  surroundingAgent.executionContextStack.pop(genContext);
  const resumptionValue = EnsureCompletion(yield handleInResume(AsyncGeneratorResolve, generator, value, Value.false));
  if (resumptionValue.Type !== 'return') {
    return Completion(resumptionValue);
  }
  const awaited = EnsureCompletion(yield* Await(resumptionValue.Value));
  if (awaited.Type === 'Throw') {
    return Completion(awaited);
  }
  Assert(awaited.Type === 'normal');
  return new Completion('return', awaited.Value, undefined);
}
