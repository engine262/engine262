import {
  Completion,
  NormalCompletion,
  Q, X,
  EnsureCompletion,
} from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { resume } from '../helpers.mjs';
import {
  Assert,
  CreateIterResultObject,
  RequireInternalSlot,
} from './all.mjs';

// This file covers abstract operations defined in #sec-generator-objects

// #sec-generatorstart
export function GeneratorStart(generator, generatorBody) {
  // 1. Assert: The value of generator.[[GeneratorState]] is undefined.
  Assert(generator.GeneratorState === Value.undefined);
  // 2. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 3. Set the Generator component of genContext to generator.
  genContext.Generator = generator;
  // 4. Set the code evaluation state of genContext such that when evaluation is resumed
  //    for that execution context the following steps will be performed:
  genContext.codeEvaluationState = (function* resumer() {
    // a. Let result be the result of evaluating generatorBody.
    const result = EnsureCompletion(yield* Evaluate(generatorBody));
    // b. Assert: If we return here, the generator either threw an exception or
    //    performed either an implicit or explicit return.
    // c. Remove genContext from the execution context stack and restore the execution context
    //    that is at the top of the execution context stack as the running execution context.
    surroundingAgent.executionContextStack.pop(genContext);
    // d. Set generator.[[GeneratorState]] to completed.
    generator.GeneratorState = 'completed';
    // e. Once a generator enters the completed state it never leaves it and its
    //    associated execution context is never resumed. Any execution state associated
    //    with generator can be discarded at this point.
    genContext.codeEvaluationState = null;
    // f. If result.[[Type]] is normal, let resultValue be undefined.
    let resultValue;
    if (result.Type === 'normal') {
      resultValue = Value.undefined;
    } else if (result.Type === 'return') {
      // g. Else if result.[[Type]] is return, let resultValue be result.[[Value]].
      resultValue = result.Value;
    } else {
      // i. Assert: result.[[Type]] is throw.
      Assert(result.Type === 'throw');
      // ii. Return Completion(result).
      return Completion(result);
    }
    // i. Return CreateIterResultObject(resultValue, true).
    return X(CreateIterResultObject(resultValue, Value.true));
  }());
  // 5. Set generator.[[GeneratorContext]] to genContext.
  generator.GeneratorContext = genContext;
  // 6. Set generator.[[GeneratorState]] to suspendedStart.
  generator.GeneratorState = 'suspendedStart';
  // 7. Return NormalCompletion(undefined).
  return new NormalCompletion(Value.undefined);
}

// #sec-generatorvalidate
export function GeneratorValidate(generator) {
  // 1. Perform ? RequireInternalSlot(generator, [[GeneratorState]]).
  Q(RequireInternalSlot(generator, 'GeneratorState'));
  // 2. Assert: generator also has a [[GeneratorContext]] internal slot.
  Assert('GeneratorContext' in generator);
  // 3. Let state be generator.[[GeneratorState]].
  const state = generator.GeneratorState;
  // 4. If state is executing, throw a TypeError exception.
  if (state === 'executing') {
    return surroundingAgent.Throw('TypeError', 'GeneratorRunning');
  }
  // 5. Return state.
  return state;
}

// #sec-generatorresume
export function GeneratorResume(generator, value) {
  // 1. Let state be ? GeneratorValidate(generator).
  const state = Q(GeneratorValidate(generator));
  // 2. If state is completed, return CreateIterResultObject(undefined, true).
  if (state === 'completed') {
    return X(CreateIterResultObject(Value.undefined, Value.true));
  }
  // 3. Assert: state is either suspendedStart or suspendedYield.
  Assert(state === 'suspendedStart' || state === 'suspendedYield');
  // 4. Let genContext be generator.[[GeneratorContext]].
  const genContext = generator.GeneratorContext;
  // 5. Let methodContext be the running execution context.
  // 6. Suspend methodContext.
  const methodContext = surroundingAgent.runningExecutionContext;
  // 7. Set generator.[[GeneratorState]] to executing.
  generator.GeneratorState = 'executing';
  // 8. Push genContext onto the execution context stack.
  surroundingAgent.executionContextStack.push(genContext);
  // 9. Resume the suspended evaluation of genContext using NormalCompletion(value) as
  //    the result of the operation that suspended it. Let result be the value returned by
  //    the resumed computation.
  const result = resume(genContext, new NormalCompletion(value));
  // 10. Assert: When we return here, genContext has already been removed from the execution
  //     context stack and methodContext is the currently running execution context.
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  // 11. Return Completion(result).
  return Completion(result);
}

// #sec-generatorresumeabrupt
export function GeneratorResumeAbrupt(generator, abruptCompletion) {
  // 1. Let state be ? GeneratorValidate(generator).
  let state = Q(GeneratorValidate(generator));
  // 2. If state is suspendedStart, then
  if (state === 'suspendedStart') {
    // a. Set generator.[[GeneratorState]] to completed.
    generator.GeneratorState = 'completed';
    // b. Once a generator enters the completed state it never leaves it and its
    //    associated execution context is never resumed. Any execution state associate
    //    with generator can be discarded at this point.
    generator.GeneratorContext = null;
    // c. Set state to completed.
    state = 'completed';
  }
  // 3. If state is completed, then
  if (state === 'completed') {
    // a. If abruptCompletion.[[Type]] is return, then
    if (abruptCompletion.Type === 'return') {
      // i. Return CreateIterResultObject(abruptCompletion.[[Value]], true).
      return X(CreateIterResultObject(abruptCompletion.Value, Value.true));
    }
    // b. Return Completion(abruptCompletion).
    return Completion(abruptCompletion);
  }
  // 4. Assert: state is suspendedYield.
  Assert(state === 'suspendedYield');
  // 5. Let genContext be generator.[[GeneratorContext]].
  const genContext = generator.GeneratorContext;
  // 6. Let methodContext be the running execution context.
  // 7. Suspend methodContext.
  const methodContext = surroundingAgent.runningExecutionContext;
  // 8. Set generator.[[GeneratorState]] to executing.
  generator.GeneratorState = 'executing';
  // 9. Push genContext onto the execution context stack.
  surroundingAgent.executionContextStack.push(genContext);
  // 10. Resume the suspended evaluation of genContext using abruptCompletion as the
  //     result of the operation that suspended it. Let result be the completion record
  //     returned by the resumed computation.
  const result = resume(genContext, abruptCompletion);
  // 11. Assert: When we return here, genContext has already been removed from the
  //     execution context stack and methodContext is the currently running execution context.
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  // 12. Return Completion(result).
  return Completion(result);
}

// #sec-getgeneratorkind
export function GetGeneratorKind() {
  // 1. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 2. If genContext does not have a Generator component, return non-generator.
  if (!genContext.Generator) {
    return 'non-generator';
  }
  // 3. Let generator be the Generator component of genContext.
  const generator = genContext.Generator;
  // 4. If generator has an [[AsyncGeneratorState]] internal slot, return async.
  if ('AsyncGeneratorState' in generator) {
    return 'async';
  }
  // 5. Else, return sync.
  return 'sync';
}

// #sec-generatoryield
export function* GeneratorYield(iterNextObj) {
  // 1. Assert: iterNextObj is an Object that implements the IteratorResult interface.
  // 2. Let genContext be the running execution context.
  const genContext = surroundingAgent.runningExecutionContext;
  // 3. Assert: genContext is the execution context of a generator.
  Assert(genContext.Generator !== undefined);
  // 4. Let generator be the value of the Generator component of genContext.
  const generator = genContext.Generator;
  // 5. Assert: GetGeneratorKind is sync.
  Assert(GetGeneratorKind() === 'sync');
  // 6. Set generator.GeneratorState to suspendedYield.
  generator.GeneratorState = 'suspendedYield';
  // 7. Remove genContext from the execution context stack.
  surroundingAgent.executionContextStack.pop(genContext);
  // 8. Set the code evaluation state of genContext such that when evaluation is resumed with
  //    a Completion resumptionValue the following steps will be performed:
  //      a. Return resumptionValue
  const resumptionValue = yield new NormalCompletion(iterNextObj);
  // 9. Return NormalCompletion(iterNextObj).
  return resumptionValue;
  // 10. NOTE: this returns to the evaluation of the operation that had most previously resumed evaluation of genContext.
}
