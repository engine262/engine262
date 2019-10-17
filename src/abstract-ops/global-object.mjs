import { ExecutionContext, HostEnsureCanCompileStrings, surroundingAgent } from '../engine.mjs';
import {
  Assert,
  // GetThisEnvironment,
} from './all.mjs';
import { InstantiateFunctionObject } from '../runtime-semantics/all.mjs';
import { Type, Value } from '../value.mjs';
import {
  AbruptCompletion, Completion,
  NormalCompletion,
  Q,
  X,
} from '../completion.mjs';
import { ParseScript } from '../parse.mjs';
import {
  BoundNames_BindingIdentifier,
  BoundNames_Declaration,
  BoundNames_ForBinding,
  BoundNames_FunctionDeclaration,
  BoundNames_VariableDeclaration,
  IsConstantDeclaration,
  IsStrict,
  LexicallyScopedDeclarations_ScriptBody,
  VarDeclaredNames_ScriptBody,
  VarScopedDeclarations_ScriptBody,
} from '../static-semantics/all.mjs';
import {
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isBindingIdentifier,
  isForBinding,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isVariableDeclaration,
} from '../ast.mjs';
import { Evaluate_Script } from '../evaluator.mjs';
import {
  NewDeclarativeEnvironment,
  // FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  ObjectEnvironmentRecord,
} from '../environment.mjs';

// This file covers abstract operations defined in
// 18 #sec-global-object

// 18.2.1.1 #sec-performeval
export function PerformEval(x, callerRealm, strictCaller, direct) {
  if (direct === false) {
    Assert(strictCaller === false);
  }
  if (Type(x) !== 'String') {
    return x;
  }
  const evalRealm = surroundingAgent.currentRealmRecord;
  Q(HostEnsureCanCompileStrings(callerRealm, evalRealm));
  /*
  const thisEnvRec = X(GetThisEnvironment());
  let inFunction;
  let inMethod;
  let inDerivedConstructor;
  if (thisEnvRec instanceof FunctionEnvironmentRecord) {
    const F = thisEnvRec.FunctionObject;
    inFunction = true;
    inMethod = thisEnvRec.HasSuperBinding() === Value.true;
    if (F.ConstructorKind === 'derived') {
      inDerivedConstructor = true;
    } else {
      inDerivedConstructor = false;
    }
  } else {
    inFunction = false;
    inMethod = false;
    inDerivedConstructor = false;
  }
  */
  const r = ParseScript(x.stringValue(), evalRealm, undefined, strictCaller);
  if (Array.isArray(r)) {
    return surroundingAgent.Throw('SyntaxError');
  }
  const script = r.ECMAScriptCode;
  // If script Contains ScriptBody is false, return undefined.
  const body = script.body;
  let strictEval;
  if (strictCaller === true) {
    strictEval = true;
  } else {
    strictEval = IsStrict(script);
  }
  const runningContext = surroundingAgent.runningExecutionContext;
  let lexEnv;
  let varEnv;
  if (direct === true) {
    lexEnv = NewDeclarativeEnvironment(runningContext.LexicalEnvironment);
    varEnv = runningContext.VariableEnvironment;
  } else {
    lexEnv = NewDeclarativeEnvironment(evalRealm.GlobalEnv);
    varEnv = evalRealm.GlobalEnv;
  }
  if (strictEval === true) {
    varEnv = lexEnv;
  }
  // If runningContext is not already suspended, suspend runningContext.
  const evalContext = new ExecutionContext();
  evalContext.Function = Value.null;
  evalContext.Realm = evalRealm;
  evalContext.ScriptOrModule = runningContext.ScriptOrModule;
  evalContext.VariableEnvironment = varEnv;
  evalContext.LexicalEnvironment = lexEnv;
  surroundingAgent.executionContextStack.push(evalContext);
  let result = EvalDeclarationInstantiation(body, varEnv, lexEnv, strictEval);
  if (result.Type === 'normal') {
    result = Evaluate_Script(body);
  }
  if (result.Type === 'normal' && result.Value === undefined) {
    result = new NormalCompletion(Value.undefined);
  }
  surroundingAgent.executionContextStack.pop(evalContext);
  // Resume the context that is now on the top of the execution context stack as the running execution context.
  return Completion(result);
}

// 18.2.1.3 #sec-evaldeclarationinstantiation
function EvalDeclarationInstantiation(body, varEnv, lexEnv, strict) {
  const varNames = VarDeclaredNames_ScriptBody(body).map(Value);
  const varDeclarations = VarScopedDeclarations_ScriptBody(body);
  const lexEnvRec = lexEnv.EnvironmentRecord;
  const varEnvRec = varEnv.EnvironmentRecord;
  if (strict === false) {
    if (varEnvRec instanceof GlobalEnvironmentRecord) {
      for (const name of varNames) {
        if (varEnvRec.HasLexicalDeclaration(name) === Value.true) {
          return surroundingAgent.Throw('SyntaxError');
        }
        // NOTE: eval will not create a global var declaration that would be shadowed by a global lexical declaration.
      }
    }
    let thisLex = lexEnv;
    // Assert: The following loop will terminate.
    while (thisLex !== varEnv) {
      const thisEnvRec = thisLex.EnvironmentRecord;
      if (!(thisEnvRec instanceof ObjectEnvironmentRecord)) {
        for (const name of varNames) {
          if (thisEnvRec.HasBinding(name) === Value.true) {
            return surroundingAgent.Throw('SyntaxError');
            // NOTE: Annex B.3.5 defines alternate semantics for the above step.
          }
          // NOTE: A direct eval will not hoist var declaration over a like-named lexical declaration
        }
      }
      thisLex = thisLex.outerEnvironmentReference;
    }
  }
  const functionsToInitialize = [];
  const declaredFunctionNames = [];
  for (const d of [...varDeclarations].reverse()) {
    if (!isVariableDeclaration(d) && !isForBinding(d) && !isBindingIdentifier(d)) {
      Assert(isFunctionDeclaration(d) || isGeneratorDeclaration(d)
             || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d));
      const fn = new Value(BoundNames_FunctionDeclaration(d)[0]);
      if (!declaredFunctionNames.includes(fn)) {
        if (varEnvRec instanceof GlobalEnvironmentRecord) {
          const fnDefinable = Q(varEnvRec.CanDeclareGlobalFunction(fn));
          if (fnDefinable === Value.false) {
            return surroundingAgent.Throw('TypeError');
          }
        }
        declaredFunctionNames.push(fn);
        functionsToInitialize.unshift(d);
      }
    }
  }
  // NOTE: Annex B.3.3.3 adds additional steps at this point.
  const declaredVarNames = [];
  for (const d of varDeclarations) {
    let boundNames;
    if (isVariableDeclaration(d)) {
      boundNames = BoundNames_VariableDeclaration(d);
    } else if (isForBinding(d)) {
      boundNames = BoundNames_ForBinding(d);
    } else if (isBindingIdentifier(d)) {
      boundNames = BoundNames_BindingIdentifier(d);
    }
    if (boundNames !== undefined) {
      for (const vn of boundNames.map(Value)) {
        if (!declaredFunctionNames.includes(vn)) {
          if (varEnvRec instanceof GlobalEnvironmentRecord) {
            const vnDefinable = Q(varEnvRec.CanDeclareGlobalVar(vn));
            if (vnDefinable === Value.false) {
              return surroundingAgent.Throw('TypeError');
            }
          }
          if (!declaredVarNames.includes(vn)) {
            declaredVarNames.push(vn);
          }
        }
      }
    }
  }
  // NOTE: No abnormal terminations occur after this algorithm step unless
  // varEnvRec is a global Environment Record and the global object is a Proxy exotic object.
  const lexDeclarations = LexicallyScopedDeclarations_ScriptBody(body);
  for (const d of lexDeclarations) {
    for (const dn of BoundNames_Declaration(d).map(Value)) {
      if (IsConstantDeclaration(d)) {
        Q(lexEnvRec.CreateImmutableBinding(dn, Value.true));
      } else {
        Q(lexEnvRec.CreateMutableBinding(dn, Value.false));
      }
    }
  }
  for (const f of functionsToInitialize) {
    const fn = new Value(BoundNames_FunctionDeclaration(f)[0]);
    const fo = InstantiateFunctionObject(f, lexEnv);
    if (varEnvRec instanceof GlobalEnvironmentRecord) {
      Q(varEnvRec.CreateGlobalFunctionBinding(fn, fo, Value.true));
    } else {
      const bindingExists = varEnvRec.HasBinding(fn);
      if (bindingExists === Value.false) {
        const status = X(varEnvRec.CreateMutableBinding(fn, Value.true));
        Assert(!(status instanceof AbruptCompletion));
        X(varEnvRec.InitializeBinding(fn, fo));
      } else {
        X(varEnvRec.SetMutableBinding(fn, fo, Value.false));
      }
    }
  }
  for (const vn of declaredVarNames) {
    if (!declaredFunctionNames.includes(vn)) {
      if (varEnvRec instanceof GlobalEnvironmentRecord) {
        Q(varEnvRec.CreateGlobalVarBinding(vn, Value.true));
      } else {
        const bindingExists = varEnvRec.HasBinding(vn);
        if (bindingExists === Value.false) {
          const status = X(varEnvRec.CreateMutableBinding(vn, Value.true));
          Assert(!(status instanceof AbruptCompletion));
          X(varEnvRec.InitializeBinding(vn, Value.undefined));
        }
      }
    }
  }
  return new NormalCompletion(undefined);
}
