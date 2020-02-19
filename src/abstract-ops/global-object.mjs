import { ExecutionContext, HostEnsureCanCompileStrings, surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import { InstantiateFunctionObject } from '../runtime-semantics/all.mjs';
import {
  IsStrict,
  VarDeclaredNames,
  VarScopedDeclarations,
  LexicallyScopedDeclarations,
  BoundNames,
  IsConstantDeclaration,
} from '../static-semantics/all.mjs';
import {
  AbruptCompletion,
  Completion,
  NormalCompletion,
  Q, X,
} from '../completion.mjs';
import { Parser, forwardError } from '../parse.mjs';
import {
  NewDeclarativeEnvironment,
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  ObjectEnvironmentRecord,
} from '../environment.mjs';
import { Evaluate } from '../evaluator.mjs';
import { unwind, ValueSet } from '../helpers.mjs';
import { Assert, GetThisEnvironment } from './all.mjs';

// This file covers abstract operations defined in
// 18 #sec-global-object

// 2.1.1 #sec-performeval
export function PerformEval(x, callerRealm, strictCaller, direct) {
  // 1. Assert: If direct is false, then strictCaller is also false.
  if (direct === false) {
    Assert(strictCaller === false);
  }
  // 2. If Type(x) is not String, return x.
  if (Type(x) !== 'String') {
    return x;
  }
  // 3. Let evalRealm be the current Realm Record.
  const evalRealm = surroundingAgent.currentRealmRecord;
  // 4. Perform ? HostEnsureCanCompileStrings(callerRealm, evalRealm).
  Q(HostEnsureCanCompileStrings(callerRealm, evalRealm));
  // 5. Let inFunction be false.
  let inFunction = false;
  // 6. Let inMethod be false.
  let inMethod = false;
  // 7. Let inDerivedConstructor be false.
  let inDerivedConstructor = false;
  // 8. If direct is true, then
  if (direct === true) {
    // a. Let thisEnvRec be ! GetThisEnvironment().
    const thisEnvRec = X(GetThisEnvironment());
    // b. If thisEnvRec is a function Environment Record, then
    if (thisEnvRec instanceof FunctionEnvironmentRecord) {
      // i. Let F be thisEnvRec.[[FunctionObject]].
      const F = thisEnvRec.FunctionObject;
      // ii. Let inFunction be true.
      inFunction = true;
      // iii. Let inMethod be thisEnvRec.HasSuperBinding().
      inMethod = thisEnvRec.HasSuperBinding() === Value.true;
      // iv. If F.[[ConstructorKind]] is derived, set inDerivedConstructor to true.
      if (F.ConstructorKind === 'derived') {
        inDerivedConstructor = true;
      }
    }
  }
  // 9. Perform the following substeps in an implementation-dependent order, possibly interleaving parsing and error detection:
  //   a. Let script be the ECMAScript code that is the result of parsing ! UTF16DecodeString(x), for the goal symbol Script.
  //   b. If script Contains ScriptBody is false, return undefined.
  //   c. Let body be the ScriptBody of script.
  //   d. If inFunction is false, and body Contains NewTarget, throw a SyntaxError exception.
  //   e. If inMethod is false, and body Contains SuperProperty, throw a SyntaxError exception.
  //   f. If inDerivedConstructor is false, and body Contains SuperCall, throw a SyntaxError exception.
  const parser = new Parser(x.stringValue());
  const script = forwardError(() => parser.scope({
    newTarget: inFunction,
    superPropety: inMethod,
    superCall: inDerivedConstructor,
  }, () => parser.parseScript()));
  if (Array.isArray(script)) {
    return surroundingAgent.Throw(script[0]);
  }
  if (script.ScriptBody === null) {
    return Value.undefined;
  }
  const body = script.ScriptBody;
  // 10. If strictCaller is true, let strictEval be true.
  // 11. Else, let strictEval be IsStrict of script.
  let strictEval;
  if (strictCaller === true) {
    strictEval = true;
  } else {
    strictEval = IsStrict(script);
  }
  // 12. Let runningContext be the running execution context.
  const runningContext = surroundingAgent.runningExecutionContext;
  let lexEnv;
  let varEnv;
  // 13. NOTE: If direct is true, runningContext will be the execution context that performed the direct eval.
  //     If direct is false, runningContext will be the execution context for the invocation of the eval function.
  // 14. If direct is true, then
  if (direct === true) {
    // a. Let lexEnv be NewDeclarativeEnvironment(runningContext's LexicalEnvironment).
    lexEnv = NewDeclarativeEnvironment(runningContext.LexicalEnvironment);
    // b. Let varEnv be runningContext's VariableEnvironment.
    varEnv = runningContext.VariableEnvironment;
  } else { // 15. Else,
    // a. Let lexEnv be NewDeclarativeEnvironment(evalRealm.[[GlobalEnv]]).
    lexEnv = NewDeclarativeEnvironment(evalRealm.GlobalEnv);
    // b. Let varEnv be evalRealm.[[GlobalEnv]].
    varEnv = evalRealm.GlobalEnv;
  }
  // 16. If strictEval is true, set varEnv to lexEnv.
  if (strictEval === true) {
    varEnv = lexEnv;
  }
  // 17. If runningContext is not already suspended, suspend runningContext.
  // 18. Let evalContext be a new ECMAScript code execution context.
  const evalContext = new ExecutionContext();
  // 19. Set evalContext's Function to null.
  evalContext.Function = Value.null;
  // 20. Set evalContext's Realm to evalRealm.
  evalContext.Realm = evalRealm;
  // 21. Set evalContext's ScriptOrModule to runningContext's ScriptOrModule.
  evalContext.ScriptOrModule = runningContext.ScriptOrModule;
  // 22. Set evalContext's VariableEnvironment to varEnv.
  evalContext.VariableEnvironment = varEnv;
  // 23. Set evalContext's LexicalEnvironment to lexEnv.
  evalContext.LexicalEnvironment = lexEnv;
  // 24. Push evalContext onto the execution context stack.
  surroundingAgent.executionContextStack.push(evalContext);
  // 25. Let result be EvalDeclarationInstantiation(body, varEnv, lexEnv, strictEval).
  let result = EvalDeclarationInstantiation(body, varEnv, lexEnv, strictEval);
  // 26. If result.[[Type]] is normal, then
  if (result.Type === 'normal') {
    // a. Set result to the result of evaluating body.
    result = unwind(Evaluate(body));
  }
  // 27. If result.[[Type]] is normal and result.[[Value]] is empty, then
  if (result.Type === 'normal' && result.Value === undefined) {
    // a. Set result to NormalCompletion(undefined).
    result = new NormalCompletion(Value.undefined);
  }
  // 28. Suspend evalContext and remove it from the execution context stack.
  // 29. Resume the context that is now on the top of the execution context stack as the running execution context.
  surroundingAgent.executionContextStack.pop(evalContext);
  // 30. Return Completion(result).
  return Completion(result);
}

// 18.2.1.3 #sec-evaldeclarationinstantiation
function EvalDeclarationInstantiation(body, varEnv, lexEnv, strict) {
  // 1. Let varNames be the VarDeclaredNames of body.
  const varNames = VarDeclaredNames(body);
  // 2. Let varNames be the VarDeclaredNames of body.
  const varDeclarations = VarScopedDeclarations(body);
  // 3. Let varDeclarations be the VarScopedDeclarations of body.
  const lexEnvRec = lexEnv.EnvironmentRecord;
  // 4. Let lexEnvRec be lexEnv's EnvironmentRecord.
  const varEnvRec = varEnv.EnvironmentRecord;
  // 5. If strict is false, then
  if (strict === false) {
    // a. If strict is false, then
    if (varEnvRec instanceof GlobalEnvironmentRecord) {
      // i. For each name in varNames, do
      for (const name of varNames) {
        // 1. If varEnvRec.HasLexicalDeclaration(name) is true, throw a SyntaxError exception.
        if (varEnvRec.HasLexicalDeclaration(name) === Value.true) {
          return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
        }
        // 2. NOTE: eval will not create a global var declaration that would be shadowed by a global lexical declaration.
      }
    }
    // b. Let thisLex be lexEnv.
    let thisLex = lexEnv;
    // c. Assert: The following loop will terminate.
    // d. Repeat, while thisLex is not the same as varEnv,
    while (thisLex !== varEnv) {
      // i. Let thisEnvRec be thisLex's EnvironmentRecord.
      const thisEnvRec = thisLex.EnvironmentRecord;
      // ii. If thisEnvRec is not an object Environment Record, then
      if (!(thisEnvRec instanceof ObjectEnvironmentRecord)) {
        // 1. NOTE: The environment of with statements cannot contain any lexical declaration so it doesn't need to be checked for var/let hoisting conflicts.
        // 2. For each name in varNames, do
        for (const name of varNames) {
          // a. If thisEnvRec.HasBinding(name) is true, then
          if (thisEnvRec.HasBinding(name) === Value.true) {
            // i. Throw a SyntaxError exception.
            return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
            // ii. NOTE: Annex B.3.5 defines alternate semantics for the above step.
          }
          // b. NOTE: A direct eval will not hoist var declaration over a like-named lexical declaration
        }
      }
      // iii. Set thisLex to thisLex's outer environment reference.
      thisLex = thisLex.outerEnvironmentReference;
    }
  }
  // 6. Let functionsToInitialize be a new empty List.
  const functionsToInitialize = [];
  // 7. Let declaredFunctionNames be a new empty List.
  const declaredFunctionNames = new ValueSet();
  // 8. For each d in varDeclarations, in reverse list order, do
  for (const d of [...varDeclarations].reverse()) {
    // a. If d is neither a VariableDeclaration nor a ForBinding nor a BindingIdentifier, then
    if (d.type !== 'VariableDeclaration'
        && d.type !== 'ForBinding'
        && d.type !== 'BindingIdentifier') {
      // i. Assert: d is either a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration.
      Assert(d.type === 'FunctionDeclaration'
             || d.type === 'GeneratorDeclaration'
             || d.type === 'AsyncFunctionDeclaration'
             || d.type === 'AsyncGeneratorDeclaration');
      // ii. NOTE: If there are multiple function declarations for the same name, the last declaration is used.
      // iii. Let fn be the sole element of the BoundNames of d.
      const fn = BoundNames(d)[0];
      // iv. If fn is not an element of declaredFunctionNames, then
      if (!declaredFunctionNames.has(fn)) {
        // 1. If varEnvRec is a global Environment Record, then
        if (varEnvRec instanceof GlobalEnvironmentRecord) {
          // a. Let fnDefinable be ? varEnvRec.CanDeclareGlobalFunction(fn).
          const fnDefinable = Q(varEnvRec.CanDeclareGlobalFunction(fn));
          // b. Let fnDefinable be ? varEnvRec.CanDeclareGlobalFunction(fn).
          if (fnDefinable === Value.false) {
            return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', fn);
          }
        }
        // 2. Append fn to declaredFunctionNames.
        declaredFunctionNames.add(fn);
        // 3. Insert d as the first element of functionsToInitialize.
        functionsToInitialize.unshift(d);
      }
    }
  }
  // 9. NOTE: Annex B.3.3.3 adds additional steps at this point.
  // 10. Let declaredVarNames be a new empty List.
  const declaredVarNames = new ValueSet();
  // 11. For each d in varDeclarations, do
  for (const d of varDeclarations) {
    // a. If d is a VariableDeclaration, a ForBinding, or a BindingIdentifier, then
    if (d.type === 'VariableDeclaration'
        || d.type === 'ForBinding'
        || d.type === 'BindingIdentifier') {
      // i. For each String vn in the BoundNames of d, do
      for (const vn of BoundNames(d)) {
        // 1. If vn is not an element of declaredFunctionNames, then
        if (!declaredFunctionNames.has(vn)) {
          // a. If varEnvRec is a global Environment Record, then
          if (varEnvRec instanceof GlobalEnvironmentRecord) {
            // i. Let vnDefinable be ? varEnvRec.CanDeclareGlobalVar(vn).
            const vnDefinable = Q(varEnvRec.CanDeclareGlobalVar(vn));
            // ii. If vnDefinable is false, throw a TypeError exception.
            if (vnDefinable === Value.false) {
              return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', vn);
            }
          }
          // b. If vn is not an element of declaredVarNames, then
          if (!declaredVarNames.includes(vn)) {
            // i. Append vn to declaredVarNames.
            declaredVarNames.push(vn);
          }
        }
      }
    }
  }
  // 12. NOTE: No abnormal terminations occur after this algorithm step unless
  //     varEnvRec is a global Environment Record and the global object is a Proxy exotic object.
  // 13. Let lexDeclarations be the LexicallyScopedDeclarations of body.
  const lexDeclarations = LexicallyScopedDeclarations(body);
  // 14. For each element d in lexDeclarations, do
  for (const d of lexDeclarations) {
    // a. NOTE: Lexically declared names are only instantiated here but not initialized.
    // b. For each element dn of the BoundNames of d, do
    for (const dn of BoundNames(d)) {
      // i. If IsConstantDeclaration of d is true, then
      if (IsConstantDeclaration(d)) {
        // 1. Perform ? lexEnvRec.CreateImmutableBinding(dn, true).
        Q(lexEnvRec.CreateImmutableBinding(dn, Value.true));
      } else { // ii. Else,
        // 1. Perform ? lexEnvRec.CreateMutableBinding(dn, false).
        Q(lexEnvRec.CreateMutableBinding(dn, Value.false));
      }
    }
  }
  // 15. For each Parse Node f in functionsToInitialize, do
  for (const f of functionsToInitialize) {
    // a. Let fn be the sole element of the BoundNames of f.
    const fn = BoundNames(f)[0];
    // b. Let fn be the sole element of the BoundNames of f.
    const fo = InstantiateFunctionObject(f, lexEnv);
    // c. If varEnvRec is a global Environment Record, then
    if (varEnvRec instanceof GlobalEnvironmentRecord) {
      // i. Perform ? varEnvRec.CreateGlobalFunctionBinding(fn, fo, true).
      Q(varEnvRec.CreateGlobalFunctionBinding(fn, fo, Value.true));
    } else { // d. Else,
      // i. Let bindingExists be varEnvRec.HasBinding(fn).
      const bindingExists = varEnvRec.HasBinding(fn);
      // ii. Let bindingExists be varEnvRec.HasBinding(fn).
      if (bindingExists === Value.false) {
        // 1. Let status be ! varEnvRec.CreateMutableBinding(fn, true).
        const status = X(varEnvRec.CreateMutableBinding(fn, Value.true));
        // 2. Assert: status is not an abrupt completion because of validation preceding step 12.
        Assert(!(status instanceof AbruptCompletion));
        // 3. Perform ! varEnvRec.InitializeBinding(fn, fo).
        X(varEnvRec.InitializeBinding(fn, fo));
      } else { // iii. Else,
        // 1. Perform ! varEnvRec.SetMutableBinding(fn, fo, false).
        X(varEnvRec.SetMutableBinding(fn, fo, Value.false));
      }
    }
  }
  // 16. For each String vn in declaredVarNames, in list order, do
  for (const vn of declaredVarNames) {
    // a. If varEnvRec is a global Environment Record, then
    if (varEnvRec instanceof GlobalEnvironmentRecord) {
      // i. Perform ? varEnvRec.CreateGlobalVarBinding(vn, true).
      Q(varEnvRec.CreateGlobalVarBinding(vn, Value.true));
    } else { // b. Else,
      // i. Let bindingExists be varEnvRec.HasBinding(vn).
      const bindingExists = varEnvRec.HasBinding(vn);
      // ii. If bindingExists is false, then
      if (bindingExists === Value.false) {
        // 1. Let status be ! varEnvRec.CreateMutableBinding(vn, true).
        const status = X(varEnvRec.CreateMutableBinding(vn, Value.true));
        // 2. Assert: status is not an abrupt completion because of validation preceding step 12.
        Assert(!(status instanceof AbruptCompletion));
        // 3. Perform ! varEnvRec.InitializeBinding(vn, undefined).
        X(varEnvRec.InitializeBinding(vn, Value.undefined));
      }
    }
  }
  // 17. Return NormalCompletion(empty).
  return new NormalCompletion(undefined);
}
