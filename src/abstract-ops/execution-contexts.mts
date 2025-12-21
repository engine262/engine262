import { surroundingAgent } from '../host-defined/engine.mts';
import {
  GetIdentifierReference,
  EnvironmentRecord,
  type EnvironmentRecordWithThisBinding,
} from '../environment.mts';
import { __ts_cast__ } from '../helpers.mts';
import {
  JSStringValue, NullValue, ObjectValue, UndefinedValue, Value,
} from '../value.mts';
import { Assert } from './all.mts';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-execution-contexts */

/** https://tc39.es/ecma262/#sec-getactivescriptormodule */
export function GetActiveScriptOrModule() {
  for (let i = surroundingAgent.executionContextStack.length - 1; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.ScriptOrModule !== Value.null) {
      return e.ScriptOrModule;
    }
  }
  return Value.null;
}

/** Used in the inspector infrastructure to track the real source (or compiled) */
export function getActiveScriptId(): string | undefined {
  for (let i = surroundingAgent.executionContextStack.length - 1; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.HostDefined?.scriptId) {
      return e.HostDefined.scriptId;
    }
    if (!(e.ScriptOrModule instanceof NullValue)) {
      const fromScript = e.ScriptOrModule.HostDefined.scriptId;
      if (fromScript) {
        return fromScript;
      }
    }
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-resolvebinding */
export function ResolveBinding(name: JSStringValue, env?: EnvironmentRecord | UndefinedValue | NullValue, strict?: boolean) {
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

/** https://tc39.es/ecma262/#sec-getthisenvironment */
export function GetThisEnvironment(): EnvironmentRecordWithThisBinding {
  // 1. Let env be the running execution context's LexicalEnvironment.
  let env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Repeat,
  while (true) {
    __ts_cast__<EnvironmentRecord>(env);
    // a. Let exists be env.HasThisBinding().
    const exists = env.HasThisBinding();
    // b. If exists is true, return envRec.
    if (exists === Value.true) {
      return env as EnvironmentRecordWithThisBinding;
    }
    // c. Let outer be env.[[OuterEnv]].
    const outer = env.OuterEnv;
    // d. Assert: outer is not null.
    Assert(!(outer instanceof NullValue));
    // e. Set env to outer.
    env = outer;
  }
}

/** https://tc39.es/ecma262/#sec-resolvethisbinding */
export function ResolveThisBinding() {
  const envRec = GetThisEnvironment();
  return envRec.GetThisBinding();
}

/** https://tc39.es/ecma262/#sec-getnewtarget */
export function GetNewTarget(): ObjectValue | UndefinedValue {
  const envRec = GetThisEnvironment();
  Assert('NewTarget' in envRec);
  return envRec.NewTarget;
}

/** https://tc39.es/ecma262/#sec-getglobalobject */
export function GetGlobalObject() {
  const currentRealm = surroundingAgent.currentRealmRecord;
  return currentRealm.GlobalObject;
}
