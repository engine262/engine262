import { surroundingAgent } from '../engine.mjs';
import { EnvironmentRecord } from '../environment.mjs';
import { Assert } from '../abstract-ops/all.mjs';
import {
  BoundNames,
  IsConstantDeclaration,
  LexicallyDeclaredNames,
  LexicallyScopedDeclarations,
  VarDeclaredNames,
  VarScopedDeclarations,
} from '../static-semantics/all.mjs';
import { Value } from '../value.mjs';
import { Q, NormalCompletion } from '../completion.mjs';
import { ValueSet } from '../helpers.mjs';
import { InstantiateFunctionObject } from './all.mjs';

export function GlobalDeclarationInstantiation(script, env) {
  // 1. Let envRec be env's EnvironmentRecord.
  const envRec = env.EnvironmentRecord;
  // 2. Assert: envRec is a global Environment Record.
  Assert(envRec instanceof EnvironmentRecord);
  // 3. Let lexNames be the LexicallyDeclaredNames of script.
  const lexNames = LexicallyDeclaredNames(script);
  // 4. Let varNames be the VarDeclaredNames of script.
  const varNames = VarDeclaredNames(script);
  // 5. For each name in lexNames, do
  for (const name of lexNames) {
    // 1. If envRec.HasVarDeclaration(name) is true, throw a SyntaxError exception.
    if (envRec.HasVarDeclaration(name) === Value.true) {
      return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
    }
    // 1. If envRec.HasLexicalDeclaration(name) is true, throw a SyntaxError exception.
    if (envRec.HasLexicalDeclaration(name) === Value.true) {
      return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
    }
    // 1. Let hasRestrictedGlobal be ? envRec.HasRestrictedGlobalProperty(name).
    const hasRestrictedGlobal = Q(envRec.HasRestrictedGlobalProperty(name));
    // 1. If hasRestrictedGlobal is true, throw a SyntaxError exception.
    if (hasRestrictedGlobal === Value.true) {
      return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
    }
  }
  // 6. For each name in varNames, do
  for (const name of varNames) {
    // 1. If envRec.HasLexicalDeclaration(name) is true, throw a SyntaxError exception.
    if (envRec.HasLexicalDeclaration(name) === Value.true) {
      return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', name);
    }
  }
  // 7. Let varDeclarations be the VarScopedDeclarations of script.
  const varDeclarations = VarScopedDeclarations(script);
  // 8. Let functionsToInitialize be a new empty List.
  const functionsToInitialize = [];
  // 9. Let declaredFunctionNames be a new empty List.
  const declaredFunctionNames = new ValueSet();
  // 10. For each d in varDeclarations, in reverse list order, do
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
        // 1. Let fnDefinable be ? envRec.CanDeclareGlobalFunction(fn).
        const fnDefinable = Q(envRec.CanDeclareGlobalFunction(fn));
        // 2. If fnDefinable is false, throw a TypeError exception.
        if (fnDefinable === Value.false) {
          return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', fn);
        }
        // 3. Append fn to declaredFunctionNames.
        declaredFunctionNames.add(fn);
        // 4. Insert d as the first element of functionsToInitialize.
        functionsToInitialize.unshift(d);
      }
    }
  }
  // 11. Let declaredVarNames be a new empty List.
  const declaredVarNames = new ValueSet();
  // 12. For each d in varDeclarations, do
  for (const d of varDeclarations) {
    // a. If d is a VariableDeclaration, a ForBinding, or a BindingIdentifier, then
    if (d.type === 'VariableDeclaration'
        || d.type === 'ForBinding'
        || d.type === 'BindingIdentifier') {
      // i. For each String vn in the BoundNames of d, do
      for (const vn of BoundNames(d)) {
        // 1. If vn is not an element of declaredFunctionNames, then
        if (!declaredFunctionNames.has(vn)) {
          // a. Let vnDefinable be ? envRec.CanDeclareGlobalVar(vn).
          const vnDefinable = Q(envRec.CanDeclareGlobalVar(vn));
          // b. If vnDefinable is false, throw a TypeError exception.
          if (vnDefinable === Value.false) {
            return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', vn);
          }
          // c. If vn is not an element of declaredVarNames, then
          if (!declaredVarNames.has(vn)) {
            // i. Append vn to declaredVarNames.
            declaredVarNames.add(vn);
          }
        }
      }
    }
  }
  // 13. NOTE: No abnormal terminations occur after this algorithm step if the global object is an ordinary object. However, if the global object is a Proxy exotic object it may exhibit behaviours that cause abnormal terminations in some of the following steps.
  // 14. NOTE: Annex B.3.3.2 adds additional steps at this point.
  // 15. Let lexDeclarations be the LexicallyScopedDeclarations of script.
  const lexDeclarations = LexicallyScopedDeclarations(script);
  // 16. For each element d in lexDeclarations, do
  for (const d of lexDeclarations) {
    // a. NOTE: Lexically declared names are only instantiated here but not initialized.
    // b. For each element dn of the BoundNames of d, do
    for (const dn of BoundNames(d)) {
      // 1. If IsConstantDeclaration of d is true, then
      if (IsConstantDeclaration(d)) {
        // 1. Perform ? envRec.CreateImmutableBinding(dn, true).
        Q(envRec.CreateImmutableBinding(dn, Value.true));
      } else { // 1. Else,
        // 1. Perform ? envRec.CreateMutableBinding(dn, false).
        Q(envRec.CreateMutableBinding(dn, Value.false));
      }
    }
  }
  // 17. For each Parse Node f in functionsToInitialize, do
  for (const f of functionsToInitialize) {
    // a. Let fn be the sole element of the BoundNames of f.
    const fn = BoundNames(f)[0];
    // b. Let fo be InstantiateFunctionObject of f with argument env.
    const fo = InstantiateFunctionObject(f, env);
    // c. Perform ? envRec.CreateGlobalFunctionBinding(fn, fo, false).
    Q(envRec.CreateGlobalFunctionBinding(fn, fo, Value.false));
  }
  // 18. For each String vn in declaredVarNames, in list order, do
  for (const vn of declaredVarNames) {
    // a. Perform ? envRec.CreateGlobalVarBinding(vn, false).
    Q(envRec.CreateGlobalVarBinding(vn, Value.false));
  }
  // 19. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
