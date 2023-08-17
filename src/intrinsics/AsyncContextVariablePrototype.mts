// @ts-nocheck
import {
  AsyncContextSnapshot, AsyncContextSwap, Call, RequireInternalSlot,
} from '../abstract-ops/all.mjs';
import { Completion, Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontext-variable.prototype.run */
function VariableProto_run([value = Value.undefined, func = Value.undefined, ...args], { thisValue }) {
  // 1. Let asyncVariable be the this value.
  const asyncVariable = thisValue;
  // 2. Perform ? RequireInternalSlot(asyncVariable, [[AsyncVariableName]]).
  Q(RequireInternalSlot(asyncVariable, 'AsyncVariableName'));

  // 3. Let previousContextMapping be AsyncContextSnapshot().
  const previousContextMapping = AsyncContextSnapshot();
  // 4. Let asyncContextMapping be a new empty List.
  // 5. For each Async Context Mapping Record p of previousContextMapping, do
  //     a. If SameValueZero(p.[[AsyncContextKey]], asyncVariable) is false, then
  //         i. Let q be the Async Context Mapping Record { [[AsyncContextKey]]: p.[[AsyncContextKey]], [[AsyncContextValue]]: p.[[AsyncContextValue]] }.
  //         ii. Append q to asyncContextMapping.
  // 6. Assert: asyncContextMapping does not contain an Async Context Mapping Record whose [[AsyncContextKey]] is asyncVariable.
  // 7. Let p be the Async Context Mapping Record { [[AsyncContextKey]]: asyncVariable, [[AsyncContextValue]]: value }.
  // 8. Append p to asyncContextMapping.
  const asyncContextMapping = new Map(previousContextMapping);
  asyncContextMapping.set(asyncVariable, value);

  // 9. AsyncContextSwap(asyncContextMapping).
  AsyncContextSwap(asyncContextMapping);
  // 10. Let result be Completion(Call(func, undefined, args)).
  const result = Completion(Call(func, Value.undefined, args));
  // 11. AsyncContextSwap(previousContextMapping).
  AsyncContextSwap(previousContextMapping);
  // 12. Return result.
  return result;
}

/** https://tc39.es/proposal-async-context/#sec-asynccontext-variable.prototype.name */
function VariableProto_nameGetter(args, { thisValue }) {
  // 1. Let asyncVariable be the this value.
  const asyncVariable = thisValue;
  // 2. Perform ? RequireInternalSlot(asyncVariable, [[AsyncVariableName]]).
  Q(RequireInternalSlot(asyncVariable, 'AsyncVariableName'));
  // 3. Return asyncVariable.[[AsyncVariableName]].
  return asyncVariable.AsyncVariableName;
}

/** https://tc39.es/proposal-async-context/#sec-asynccontext-variable.prototype.get */
function VariableProto_get(args, { thisValue }) {
  // 1. Let asyncVariable be the this value.
  const asyncVariable = thisValue;
  // 2. Perform ? RequireInternalSlot(asyncVariable, [[AsyncVariableDefaultValue]]).
  Q(RequireInternalSlot(asyncVariable, 'AsyncVariableDefaultValue'));

  // 3. Let agentRecord be the surrounding agent's Agent Record.
  const agentRecord = surroundingAgent.AgentRecord;
  // 4. Let asyncContextMapping be agentRecord.[[AsyncContextMapping]].
  const asyncContextMapping = agentRecord.AsyncContextMapping;
  // 5. For each Async Context Mapping Record p of asyncContextMapping, do
  //     a. If SameValueZero(p.[[AsyncContextKey]], asyncVariable) is true, return p.[[AsyncContextValue]].
  if (asyncContextMapping.has(asyncVariable)) {
    return asyncContextMapping.get(asyncVariable);
  }
  // 6. Return asyncVariable.[[AsyncVariableDefaultValue]].
  return asyncVariable.AsyncVariableDefaultValue;
}

export function bootstrapAsyncContextVariablePrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['run', VariableProto_run, 2],
    ['name', [VariableProto_nameGetter]],
    ['get', VariableProto_get, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'AsyncContext.Variable');

  realmRec.Intrinsics['%AsyncContext.Variable.prototype%'] = proto;
}
