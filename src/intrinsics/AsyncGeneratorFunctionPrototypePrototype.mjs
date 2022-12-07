import { surroundingAgent } from '../engine.mjs';
import {
  X,
  Completion,
  NormalCompletion,
  ThrowCompletion,
  IfAbruptRejectPromise,
} from '../completion.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  Call,
  NewPromiseCapability,
  AsyncGeneratorValidate,
  AsyncGeneratorEnqueue,
  AsyncGeneratorResume,
  AsyncGeneratorAwaitReturn,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-asyncgenerator-prototype-next */
function AsyncGeneratorPrototype_next([value = Value.undefined], { thisValue }) {
  // 1. Let generator be the this value.
  const generator = thisValue;
  // 2. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 3. Let result be AsyncGeneratorValidate(generator, empty).
  const result = AsyncGeneratorValidate(generator, undefined);
  // 4. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 5. Let state be generator.[[AsyncGeneratorState]].
  const state = generator.AsyncGeneratorState;
  // 6. If state is completed, then
  if (state === 'completed') {
    // a. Let iteratorResult be ! CreateIterResultObject(undefined, true).
    const iteratorResult = X(CreateIterResultObject(Value.undefined, Value.true));
    // b. Perform ! Call(promiseCapability.[[Resolve]], undefined, « iteratorResult »).
    X(Call(promiseCapability.Resolve, Value.undefined, [iteratorResult]));
    // c. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 7. Let completion be NormalCompletion(value).
  const completion = NormalCompletion(value);
  // 8. Perform ! AsyncGeneratorEnqueue(generator, completion, promiseCapability).
  X(AsyncGeneratorEnqueue(generator, completion, promiseCapability));
  // 9. If state is either suspendedStart or suspendedYield, then
  if (state === 'suspendedStart' || state === 'suspendedYield') {
    // a. Perform ! AsyncGeneratorResume(generator, completion).
    X(AsyncGeneratorResume(generator, completion));
  } else { // 10. Else,
    // a. Assert: state is either executing or awaiting-return.
    Assert(state === 'executing' || state === 'awaiting-return');
  }
  // 11. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}

/** http://tc39.es/ecma262/#sec-asyncgenerator-prototype-return */
function AsyncGeneratorPrototype_return([value = Value.undefined], { thisValue }) {
  // 1. Let generator be the this value.
  const generator = thisValue;
  // 2. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 3. Let result be AsyncGeneratorValidate(generator, empty).
  const result = AsyncGeneratorValidate(generator, undefined);
  // 4. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 5. Let completion be Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.
  const completion = new Completion({ Type: 'return', Value: value, Target: undefined });
  // 6. Perform ! AsyncGeneratorEnqueue(generator, completion, promiseCapability).
  X(AsyncGeneratorEnqueue(generator, completion, promiseCapability));
  // 7. Let state be generator.[[AsyncGeneratorState]].
  const state = generator.AsyncGeneratorState;
  // 8. If state is either suspendedStart or completed, then
  if (state === 'suspendedStart' || state === 'completed') {
    // a. Set generator.[[AsyncGeneratorState]] to awaiting-return.
    generator.AsyncGeneratorState = 'awaiting-return';
    // b. Perform ! AsyncGeneratorAwaitReturn(generator).
    X(AsyncGeneratorAwaitReturn(generator));
  } else if (state === 'suspendedYield') { // 9. Else if state is suspendedYield, then
    // a. Perform ! AsyncGeneratorResume(generator, completion).
    X(AsyncGeneratorResume(generator, completion));
  } else { // 10. Else,
    // a. Assert: state is either executing or awaiting-return.
    Assert(state === 'executing' || state === 'awaiting-return');
  }
  // 11. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}

/** http://tc39.es/ecma262/#sec-asyncgenerator-prototype-throw */
function AsyncGeneratorPrototype_throw([exception = Value.undefined], { thisValue }) {
  // 1. Let generator be the this value.
  const generator = thisValue;
  // 2. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 3. Let result be AsyncGeneratorValidate(generator, empty).
  const result = AsyncGeneratorValidate(generator, undefined);
  // 4. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 5. Let state be generator.[[AsyncGeneratorState]].
  let state = generator.AsyncGeneratorState;
  // 6. If state is suspendedStart, then
  if (state === 'suspendedStart') {
    // a. Set generator.[[AsyncGeneratorState]] to completed.
    generator.AsyncGeneratorState = 'completed';
    // b. Set state to completed.
    state = 'completed';
  }
  // 7. If state is completed, then
  if (state === 'completed') {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « exception »).
    X(Call(promiseCapability.Reject, Value.undefined, [exception]));
    // b. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 8. Let completion be ThrowCompletion(exception).
  const completion = ThrowCompletion(exception);
  // 9. Perform ! AsyncGeneratorEnqueue(generator, completion, promiseCapability).
  X(AsyncGeneratorEnqueue(generator, completion, promiseCapability));
  // 10. If state is suspendedYield, then
  if (state === 'suspendedYield') {
    // a. Perform ! AsyncGeneratorResume(generator, completion).
    X(AsyncGeneratorResume(generator, completion));
  } else { // 11. Else,
    // a. Assert: state is either executing or awaiting-return.
    Assert(state === 'executing' || state === 'awaiting-return');
  }
  // 12. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}

export function bootstrapAsyncGeneratorFunctionPrototypePrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', AsyncGeneratorPrototype_next, 1],
    ['return', AsyncGeneratorPrototype_return, 1],
    ['throw', AsyncGeneratorPrototype_throw, 1],
  ], realmRec.Intrinsics['%AsyncIteratorPrototype%'], 'AsyncGenerator');

  realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'] = proto;
}
