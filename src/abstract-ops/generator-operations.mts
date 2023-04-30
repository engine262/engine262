// @ts-nocheck
import {
  Await,
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
  AsyncGeneratorYield,
  CreateIterResultObject,
  OrdinaryObjectCreate,
  RequireInternalSlot,
  SameValue,
} from './all.mjs';

/** http://tc39.es/ecma262/#sec-generator-objects */

/** http://tc39.es/ecma262/#sec-generatorstart */
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
    // a. If generatorBody is a Parse Node, then
    //    i. Let result be the result of evaluating generatorBody.
    // b. Else,
    //    i. Assert: generatorBody is an Abstract Closure.
    //    ii. Let result be generatorBody().
    const result = EnsureCompletion(
      // Note: Engine262 can only perform the "If generatorBody is an Abstract Closure" check:
      yield* typeof generatorBody === 'function'
        ? generatorBody()
        : Evaluate(generatorBody),
    );
    // c. Assert: If we return here, the generator either threw an exception or
    //    performed either an implicit or explicit return.
    // d. Remove genContext from the execution context stack and restore the execution context
    //    that is at the top of the execution context stack as the running execution context.
    surroundingAgent.executionContextStack.pop(genContext);
    // e. Set generator.[[GeneratorState]] to completed.
    generator.GeneratorState = 'completed';
    // f. Once a generator enters the completed state it never leaves it and its
    //    associated execution context is never resumed. Any execution state associated
    //    with generator can be discarded at this point.
    genContext.codeEvaluationState = null;
    // g. If result.[[Type]] is normal, let resultValue be undefined.
    let resultValue;
    if (result.Type === 'normal') {
      resultValue = Value.undefined;
    } else if (result.Type === 'return') {
      // h. Else if result.[[Type]] is return, let resultValue be result.[[Value]].
      resultValue = result.Value;
    } else { // i. Else,
      // i. Assert: result.[[Type]] is throw.
      Assert(result.Type === 'throw');
      // ii. Return Completion(result).
      return Completion(result);
    }
    // j. Return CreateIterResultObject(resultValue, true).
    return X(CreateIterResultObject(resultValue, Value.true));
  }());
  // 5. Set generator.[[GeneratorContext]] to genContext.
  generator.GeneratorContext = genContext;
  // 6. Set generator.[[GeneratorState]] to suspendedStart.
  generator.GeneratorState = 'suspendedStart';
  // 7. Return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}

export function generatorBrandToErrorMessageType(generatorBrand) {
  let expectedType;
  if (generatorBrand !== undefined) {
    expectedType = generatorBrand.stringValue();
    if (expectedType.startsWith('%') && expectedType.endsWith('Prototype%')) {
      expectedType = expectedType.slice(1, -10).trim();
      if (expectedType.endsWith('Iterator')) {
        expectedType = `${expectedType.slice(0, -8).trim()} Iterator`;
      }
    }
  }
  return expectedType;
}

/** http://tc39.es/ecma262/#sec-generatorvalidate */
export function GeneratorValidate(generator, generatorBrand) {
  // 1. Perform ? RequireInternalSlot(generator, [[GeneratorState]]).
  Q(RequireInternalSlot(generator, 'GeneratorState'));
  // 2. Perform ? RequireInternalSlot(generator, [[GeneratorBrand]]).
  Q(RequireInternalSlot(generator, 'GeneratorBrand'));
  // 3. If generator.[[GeneratorBrand]] is not the same value as generatorBrand, throw a TypeError exception.
  const brand = generator.GeneratorBrand;
  if (
    brand === undefined || generatorBrand === undefined
      ? brand !== generatorBrand
      : SameValue(brand, generatorBrand) === Value.false
  ) {
    return surroundingAgent.Throw(
      'TypeError',
      'NotATypeObject',
      generatorBrandToErrorMessageType(generatorBrand) || 'Generator',
      generator,
    );
  }
  // 4. Assert: generator also has a [[GeneratorContext]] internal slot.
  Assert('GeneratorContext' in generator);
  // 5. Let state be generator.[[GeneratorState]].
  const state = generator.GeneratorState;
  // 6. If state is executing, throw a TypeError exception.
  if (state === 'executing') {
    return surroundingAgent.Throw('TypeError', 'GeneratorRunning');
  }
  // 7. Return state.
  return state;
}

/** http://tc39.es/ecma262/#sec-generatorresume */
export function GeneratorResume(generator, value, generatorBrand) {
  // 1. Let state be ? GeneratorValidate(generator, generatorBrand).
  const state = Q(GeneratorValidate(generator, generatorBrand));
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
  const result = EnsureCompletion(resume(genContext, NormalCompletion(value)));
  // 10. Assert: When we return here, genContext has already been removed from the execution
  //     context stack and methodContext is the currently running execution context.
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  // 11. Return Completion(result).
  return Completion(result);
}

/** http://tc39.es/ecma262/#sec-generatorresumeabrupt */
export function GeneratorResumeAbrupt(generator, abruptCompletion, generatorBrand) {
  // 1. Let state be ? GeneratorValidate(generator, generatorBrand).
  let state = Q(GeneratorValidate(generator, generatorBrand));
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
  const result = EnsureCompletion(resume(genContext, abruptCompletion));
  // 11. Assert: When we return here, genContext has already been removed from the
  //     execution context stack and methodContext is the currently running execution context.
  Assert(surroundingAgent.runningExecutionContext === methodContext);
  // 12. Return Completion(result).
  return Completion(result);
}

/** http://tc39.es/ecma262/#sec-getgeneratorkind */
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

/** http://tc39.es/ecma262/#sec-generatoryield */
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
  const resumptionValue = yield NormalCompletion(iterNextObj);
  // 9. Return NormalCompletion(iterNextObj).
  return resumptionValue;
  // 10. NOTE: this returns to the evaluation of the operation that had most previously resumed evaluation of genContext.
}

/** http://tc39.es/ecma262/#sec-yield */
export function* Yield(value) {
  // 1. Let generatorKind be GetGeneratorKind().
  const generatorKind = GetGeneratorKind();
  // 2. If generatorKind is async, return ? AsyncGeneratorYield(? Await(value)).
  if (generatorKind === 'async') {
    return Q(yield* AsyncGeneratorYield(Q(yield* Await(value))));
  }
  // 3. Otherwise, return ? GeneratorYield(CreateIterResultObject(value, false)).
  return Q(yield* GeneratorYield(CreateIterResultObject(value, Value.false)));
}

/** http://tc39.es/ecma262/#sec-createiteratorfromclosure */
export function CreateIteratorFromClosure(closure, generatorBrand, generatorPrototype) {
  Assert(typeof closure === 'function');
  // 1. NOTE: closure can contain uses of the Yield shorthand to yield an IteratorResult object.
  // 2. Let internalSlotsList be « [[GeneratorState]], [[GeneratorContext]], [[GeneratorBrand]] ».
  const internalSlotsList = ['GeneratorState', 'GeneratorContext', 'GeneratorBrand'];
  // 3. Let generator be ! OrdinaryObjectCreate(generatorPrototype, internalSlotsList).
  const generator = X(OrdinaryObjectCreate(generatorPrototype, internalSlotsList));
  // 4. Set generator.[[GeneratorBrand]] to generatorBrand.
  generator.GeneratorBrand = generatorBrand;
  // 5. Set generator.[[GeneratorState]] to undefined.
  generator.GeneratorState = Value.undefined;
  // 6. Perform ! GeneratorStart(generator, closure).
  X(GeneratorStart(generator, closure));
  // 7. Return generator.
  return generator;
}
