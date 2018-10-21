import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateIterResultObject,
  NewPromiseCapability,
  GetGeneratorKind,
} from './all.mjs';
import { PerformPromiseThen } from '../intrinsics/PromisePrototype.mjs';
import { Evaluate_FunctionBody } from '../runtime-semantics/all.mjs';
import {
  Q, X,
  Await,
  Completion,
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
} from '../completion.mjs';
import { Value, Type } from '../value.mjs';
import { Resume } from '../helpers.mjs';

// #sec-asyncgeneratorrequest-records
class AsyncGeneratorRequestRecord {
  constructor(completion, promiseCapability) {
    this.Completion = completion;
    this.Capability = promiseCapability;
  }
}

// #sec-asyncgeneratorstart
export function AsyncGeneratorStart(generator, generatorBody) {
  // Assert: generator is an AsyncGenerator instance.
  Assert(generator.AsyncGeneratorState === Value.undefined);
  const genContext = surroundingAgent.runningExecutionContext;
  genContext.Generator = generator;
  genContext.codeEvaluationState = (function* resumer() {
    const result = EnsureCompletion(yield* Evaluate_FunctionBody(generatorBody));
    // Assert: If we return here, the async generator either threw an exception or performed either an implicit or explicit return.
    Assert(surroundingAgent.runningExecutionContext === genContext);
    surroundingAgent.executionContextStack.pop();
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

// #sec-asyncgeneratorresolve
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

// #sec-asyncgeneratorreject
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

// #async-generator-resume-next-return-processor-fulfilled
function AsyncGeneratorResumeNextReturnProcessorFulfilledFunctions([value]) {
  const F = surroundingAgent.activeFunctionObject;
  F.Generator.AsyncGeneratorState = 'completed';
  return X(AsyncGeneratorResolve(F.Generator, value, Value.true));
}

// #async-generator-resume-next-return-processor-rejected
function AsyncGeneratorResumeNextReturnProcessorRejectedFunctions([reason]) {
  const F = surroundingAgent.activeFunctionObject;
  F.Generator.AsyncGeneratorState = 'completed';
  return X(AsyncGeneratorReject(F.Generator, reason));
}

// #sec-asyncgeneratorresumenext
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
        const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
        X(Call(promiseCapability.Resolve, Value.undefined, [completion.Value]));
        const stepsFulfilled = AsyncGeneratorResumeNextReturnProcessorFulfilledFunctions;
        const onFulfilled = CreateBuiltinFunction(stepsFulfilled, ['Generator']);
        onFulfilled.Generator = generator;
        const stepsRejected = AsyncGeneratorResumeNextReturnProcessorRejectedFunctions;
        const onRejected = CreateBuiltinFunction(stepsRejected, ['Generator']);
        onRejected.Generator = generator;
        X(PerformPromiseThen(promiseCapability.Promise, onFulfilled, onRejected));
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
  const result = Resume(genContext, completion);
  Assert(!(result instanceof AbruptCompletion));
  Assert(surroundingAgent.runningExecutionContext === callerContext);
  return Value.undefined;
}

// #sec-asyncgeneratorenqueue
export function AsyncGeneratorEnqueue(generator, completion) {
  Assert(completion instanceof Completion);
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  if (Type(generator) !== 'Object' || !('AsyncGeneratorState' in generator)) {
    const badGeneratorError = surroundingAgent.Throw('TypeError', 'Async Generator method called on incompatable receiver').Value;
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

// #sec-asyncgeneratoryield
export function* AsyncGeneratorYield(value) {
  const genContext = surroundingAgent.runningExecutionContext;
  Assert(genContext.Generator !== Value.undefined);
  const generator = genContext.Generator;
  Assert(GetGeneratorKind() === 'async');
  value = Q(yield* Await(value));
  generator.AsyncGeneratorState = 'suspendedYield';
  surroundingAgent.executionContextStack.pop();
  const resumptionValue = EnsureCompletion(yield [AsyncGeneratorResolve, generator, value, Value.false]);
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
