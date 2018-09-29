import {
  Assert,
  CreateIterResultObject,
} from './all.mjs';
import {
  Q, X,
  Completion,
  AbruptCompletion,
  NormalCompletion,
} from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate_FunctionBody } from '../runtime-semantics/all.mjs';
import { Value, Type } from '../value.mjs';

// 25.4.3.1 #sec-generatorstart
export function GeneratorStart(generator, generatorBody) {
  Assert(Type(generator.GeneratorState) === 'Undefined');
  const genContext = surroundingAgent.runningExecutionContext;
  genContext.Generator = generator;
  genContext.codeEvaluationState = (function* resumer() {
    const result = yield* Evaluate_FunctionBody(generatorBody);
    Assert(surroundingAgent.runningExecutionContext === genContext);
    surroundingAgent.executionContextStack.pop();
    generator.GeneratorState = 'completed';
    genContext.codeEvaluationState = null;
    let resultValue;
    if (result.Type === 'normal') {
      resultValue = new Value(undefined);
    } else if (result.Type === 'return') {
      resultValue = result.Value;
    } else {
      Assert(result.Type === 'throw');
      return Completion(result);
    }
    return X(CreateIterResultObject(resultValue, new Value(true)));
  }());
  generator.GeneratorContext = genContext;
  generator.GeneratorState = 'suspendedStart';
  return new NormalCompletion(new Value(undefined));
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
    return X(CreateIterResultObject(new Value(undefined), new Value(true)));
  }
  Assert(state === 'suspendedStart' || state === 'suspendedYield');
  const genContext = generator.GeneratorContext;
  const originalStackLength = surroundingAgent.executionContextStack.length;
  const methodContext = surroundingAgent.runningExecutionContext;
  // Suspend methodContext.
  generator.GeneratorState = 'executing';
  surroundingAgent.executionContextStack.push(genContext);
  const iter = genContext.codeEvaluationState.next(new NormalCompletion(value));
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  Assert(surroundingAgent.executionContextStack.length === originalStackLength);
  return Completion(iter.value);
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
      return X(CreateIterResultObject(new Value(undefined), new Value(true)));
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
  const { value } = genContext.codeEvaluationState.next(abruptCompletion);
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  Assert(surroundingAgent.executionContextStack.length === originalStackLength);
  return Completion(value);
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
  surroundingAgent.executionContextStack.pop();
  const resumptionValue = yield new NormalCompletion(iterNextObj);
  return resumptionValue;
}
