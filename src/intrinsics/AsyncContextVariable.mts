// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  Get, HasProperty, OrdinaryCreateFromConstructor, ToString,
} from '../abstract-ops/all.mjs';
import { ObjectValue, Value } from '../value.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontext-variable */
function VariableConstructor([options = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }

  // 2. Let nameStr be the empty String.
  let nameStr = Value('');
  // 3. Let defaultValue be undefined.
  let defaultValue = Value.undefined;
  // 4. If options is an Object, then
  if (options instanceof ObjectValue) {
    // a. Let namePresent be ? HasProperty(options, "name").
    const namePresent = Q(HasProperty(options, Value('name')));
    // b. If namePresent is true, then
    if (namePresent === Value.true) {
      // i. Let name be ? Get(options, "name").
      const name = Q(Get(options, Value('name')));
      // ii. Set nameStr to ? ToString(name).
      nameStr = Q(ToString(name));
    }
    // c. Set defaultValue to ? Get(options, "defaultValue").
    defaultValue = Q(Get(options, Value('defaultValue')));
  }

  // 5. Let asyncVariable be ? OrdinaryCreateFromConstructor(NewTarget, "%AsyncContext.Variable.prototype%", « [[AsyncVariableName]], [[AsyncVariableDefaultValue]] »).
  const asyncVariable = Q(OrdinaryCreateFromConstructor(NewTarget, '%AsyncContext.Variable.prototype%', ['AsyncVariableName', 'AsyncVariableDefaultValue']));
  // 6. Set asyncVariable.[[AsyncVariableName]] to nameStr.
  asyncVariable.AsyncVariableName = nameStr;
  // 7. Set asyncVariable.[[AsyncVariableDefaultValue]] to defaultValue.
  asyncVariable.AsyncVariableDefaultValue = defaultValue;
  // 8. Return asyncVariable.
  return asyncVariable;
}

export function bootstrapAsyncContextVariable(realmRec) {
  const variableConstructor = bootstrapConstructor(realmRec, VariableConstructor, 'Variable', 1, realmRec.Intrinsics['%AsyncContext.Variable.prototype%']);

  realmRec.Intrinsics['%AsyncContext.Variable%'] = variableConstructor;
}
