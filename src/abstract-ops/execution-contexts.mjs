import { Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  GetIdentifierReference,
  EnvironmentRecord,
} from '../environment.mjs';
import { Value } from '../value.mjs';
import { Assert } from './all.mjs';

// This file covers abstract operations defined in
/** http://tc39.es/ecma262/#sec-execution-contexts  */

/** http://tc39.es/ecma262/#sec-getactivescriptormodule  */
export function GetActiveScriptOrModule() {
  for (let i = surroundingAgent.executionContextStack.length - 1; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.ScriptOrModule !== Value.null) {
      return e.ScriptOrModule;
    }
  }
  return Value.null;
}

/** http://tc39.es/ecma262/#sec-resolvebinding  */
export function ResolveBinding(name, env, strict) {
  // 1. If env is not present or if env is undefined, then
  if (env === undefined || env === Value.undefined) {
    // a. Set env to the running execution context's LexicalEnvironment.
    env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  }
  // 2. Assert: env is an Environment Record.
  Assert(env instanceof EnvironmentRecord);
  // 3. If the code matching the syntactic production that is being evaluated is contained in strict mode code, let strict be true; else let strict be false.
  // 4. Return ? GetIdentifierReference(env, name, strict).
  return GetIdentifierReference(env, name, strict ? Value.true : Value.false);
}

/** http://tc39.es/ecma262/#sec-getthisenvironment  */
export function GetThisEnvironment() {
  // 1. Let env be the running execution context's LexicalEnvironment.
  let env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Repeat,
  while (true) {
    // a. Let exists be env.HasThisBinding().
    const exists = env.HasThisBinding();
    // b. If exists is true, return envRec.
    if (exists === Value.true) {
      return env;
    }
    // c. Let outer be env.[[OuterEnv]].
    const outer = env.OuterEnv;
    // d. Assert: outer is not null.
    Assert(outer !== Value.null);
    // e. Set env to outer.
    env = outer;
  }
}

/** http://tc39.es/ecma262/#sec-resolvethisbinding  */
export function ResolveThisBinding() {
  const envRec = GetThisEnvironment();
  return Q(envRec.GetThisBinding());
}

/** http://tc39.es/ecma262/#sec-getnewtarget  */
export function GetNewTarget() {
  const envRec = GetThisEnvironment();
  Assert('NewTarget' in envRec);
  return envRec.NewTarget;
}

/** http://tc39.es/ecma262/#sec-getglobalobject  */
export function GetGlobalObject() {
  const currentRealm = surroundingAgent.currentRealmRecord;
  return currentRealm.GlobalObject;
}
