import { Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  GetIdentifierReference,
  LexicalEnvironment,
} from '../environment.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import { Assert } from './all.mjs';

// 8.3.1 #sec-getactivescriptormodule
export function GetActiveScriptOrModule() {
  if (surroundingAgent.executionContextStack.length === 0) {
    return Value.null;
  }
  const ec = [...surroundingAgent.executionContextStack]
    .reverse()
    .find((e) => e.ScriptOrModule !== undefined);
  if (!ec) {
    return Value.null;
  }
  return ec.ScriptOrModule;
}

// 8.3.2 #sec-resolvebinding
export function ResolveBinding(name, env) {
  if (!env || Type(env) === 'Undefined') {
    env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  }
  Assert(env instanceof LexicalEnvironment);
  const strict = surroundingAgent.isStrictCode;
  return GetIdentifierReference(env, name, strict ? Value.true : Value.false);
}

// 8.3.3 #sec-getthisenvironment
export function GetThisEnvironment() {
  let lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  while (true) { // eslint-disable-line no-constant-condition
    const envRec = lex.EnvironmentRecord;
    const exists = envRec.HasThisBinding();
    if (exists === Value.true) {
      return envRec;
    }
    const outer = lex.outerEnvironmentReference;
    Assert(Type(outer) !== 'Null');
    lex = outer;
  }
}

// 8.3.4 #sec-resolvethisbinding
export function ResolveThisBinding() {
  const envRec = GetThisEnvironment();
  return Q(envRec.GetThisBinding());
}

// #sec-getnewtarget
export function GetNewTarget() {
  const envRec = GetThisEnvironment();
  Assert('NewTarget' in envRec);
  return envRec.NewTarget;
}

// 8.3.6 #sec-getglobalobject
export function GetGlobalObject() {
  const ctx = surroundingAgent.runningExecutionContext;
  const currentRealm = ctx.Realm;
  return currentRealm.GlobalObject;
}
