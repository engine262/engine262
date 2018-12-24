import {
  Assert,
  CreateIterResultObject,
} from './all.mjs';
import {
  AbruptCompletion, Completion,
  EnsureCompletion,
  NormalCompletion,
  Q,
  X,
} from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate_FunctionBody } from '../runtime-semantics/all.mjs';
import { Type, Value } from '../value.mjs';
import { resume } from '../helpers.mjs';

// This file covers abstract operations defined in
// 25.4 #sec-generator-objects

// 25.4.3.1 #sec-generatorstart
export function GeneratorStart(generator, generatorBody) {
  Assert(Type(generator.GeneratorState) === 'Undefined');
  const genContext = surroundingAgent.runningExecutionContext;
  genContext.Generator = generator;
  genContext.codeEvaluationState = (function* resumer() {
    const result = EnsureCompletion(yield* Evaluate_FunctionBody(generatorBody));
    surroundingAgent.executionContextStack.pop(genContext);
    generator.GeneratorState = 'completed';
    genContext.codeEvaluationState = null;
    let resultValue;
    if (result.Type === 'normal') {
      resultValue = Value.undefined;
    } else if (result.Type === 'return') {
      resultValue = result.Value;
    } else {
      Assert(result.Type === 'throw');
      return Completion(result);
    }
    return X(CreateIterResultObject(resultValue, Value.true));
  }());
  generator.GeneratorContext = genContext;
  generator.GeneratorState = 'suspendedStart';
  return new NormalCompletion(Value.undefined);
}

// 25.4.3.2 #sec-generatorvalidate
export function GeneratorValidate(generator) {
  if (Type(generator) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Provided generator should be an object');
  }
  if (!('GeneratorState' in generator)) {
    return surroundingAgent.Throw('TypeError', 'Provided generator is not a generator object');
  }
  Assert('GeneratorContext' in generator);
  const state = generator.GeneratorState;
  if (state === 'executing') {
    return surroundingAgent.Throw('TypeError', 'Cannot manipulate an executing generator');
  }
  return state;
}

// 25.4.3.3 #sec-generatorresume
export function GeneratorResume(generator, value) {
  const state = Q(GeneratorValidate(generator));
  if (state === 'completed') {
    return X(CreateIterResultObject(Value.undefined, Value.true));
  }
  Assert(state === 'suspendedStart' || state === 'suspendedYield');
  const genContext = generator.GeneratorContext;
  const originalStackLength = surroundingAgent.executionContextStack.length;
  const methodContext = surroundingAgent.runningExecutionContext;
  // Suspend methodContext.
  generator.GeneratorState = 'executing';
  surroundingAgent.executionContextStack.push(genContext);
  const result = resume(genContext, new NormalCompletion(value));
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  Assert(surroundingAgent.executionContextStack.length === originalStackLength);
  return Completion(result);
}

// 25.4.3.4 #sec-generatorresumeabrupt
export function GeneratorResumeAbrupt(generator, abruptCompletion) {
  Assert(abruptCompletion instanceof AbruptCompletion);
  let state = Q(GeneratorValidate(generator));
  if (state === 'suspendedStart') {
    generator.GeneratorState = 'completed';
    generator.GeneratorContext = null;
    state = 'completed';
  }
  if (state === 'completed') {
    if (abruptCompletion.Type === 'return') {
      return X(CreateIterResultObject(abruptCompletion.Value, Value.true));
    }
    return Completion(abruptCompletion);
  }
  Assert(state === 'suspendedYield');
  const genContext = generator.GeneratorContext;
  const originalStackLength = surroundingAgent.executionContextStack.length;
  const methodContext = surroundingAgent.runningExecutionContext;
  // Suspend methodContext.
  generator.GeneratorState = 'executing';
  surroundingAgent.executionContextStack.push(genContext);
  const result = resume(genContext, abruptCompletion);
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  Assert(surroundingAgent.executionContextStack.length === originalStackLength);
  return Completion(result);
}

// 25.4.3.5 #sec-getgeneratorkind
export function GetGeneratorKind() {
  const genContext = surroundingAgent.runningExecutionContext;
  if (!genContext.Generator) {
    return 'non-generator';
  }
  const generator = genContext.Generator;
  if ('AsyncGeneratorState' in generator) {
    return 'async';
  }
  return 'sync';
}

// 25.4.3.6 #sec-generatoryield
export function* GeneratorYield(iterNextObj) {
  const genContext = surroundingAgent.runningExecutionContext;
  const generator = genContext.Generator;
  Assert(GetGeneratorKind() === 'sync');
  generator.GeneratorState = 'suspendedYield';
  surroundingAgent.executionContextStack.pop(genContext);
  const resumptionValue = yield new NormalCompletion(iterNextObj);
  return resumptionValue;
}
