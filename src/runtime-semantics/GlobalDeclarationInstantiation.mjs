import {
  surroundingAgent,
} from '../engine.mjs';
import {
  EnvironmentRecord,
} from '../environment.mjs';
import { Assert } from '../abstract-ops/all.mjs';
import {
  BoundNames_BindingIdentifier,
  BoundNames_Declaration,
  BoundNames_ForBinding,
  BoundNames_FunctionDeclaration,
  BoundNames_VariableDeclaration,
  IsConstantDeclaration,
  LexicallyDeclaredNames_ScriptBody,
  LexicallyScopedDeclarations_ScriptBody,
  VarDeclaredNames_ScriptBody,
  VarScopedDeclarations_ScriptBody,
} from '../static-semantics/all.mjs';
import {
  InstantiateFunctionObject,
} from './all.mjs';
import {
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isBindingIdentifier,
  isForBinding,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isVariableDeclaration,
} from '../ast.mjs';
import { Value } from '../value.mjs';
import {
  NormalCompletion,
  Q,
} from '../completion.mjs';
import { msg } from '../helpers.mjs';

// 15.1.11 #sec-globaldeclarationinstantiation
export function GlobalDeclarationInstantiation(script, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof EnvironmentRecord);

  const lexNames = LexicallyDeclaredNames_ScriptBody(script).map(Value);
  const varNames = VarDeclaredNames_ScriptBody(script).map(Value);

  for (const name of lexNames) {
    if (envRec.HasVarDeclaration(name) === Value.true) {
      return surroundingAgent.Throw('SyntaxError', msg('AlreadyDeclared', name));
    }
    if (envRec.HasLexicalDeclaration(name) === Value.true) {
      return surroundingAgent.Throw('SyntaxError', msg('AlreadyDeclared', name));
    }
    const hasRestrictedGlobal = envRec.HasRestrictedGlobalProperty(name);
    if (hasRestrictedGlobal === Value.true) {
      return surroundingAgent.Throw('SyntaxError', msg('AlreadyDeclared', name));
    }
  }

  for (const name of varNames) {
    if (envRec.HasLexicalDeclaration(name) === Value.true) {
      return surroundingAgent.Throw('SyntaxError', msg('AlreadyDeclared', name));
    }
  }

  const varDeclarations = VarScopedDeclarations_ScriptBody(script);

  const functionsToInitialize = [];
  const declaredFunctionNames = [];

  for (const d of [...varDeclarations].reverse()) {
    if (!isVariableDeclaration(d) && !isForBinding(d) && !isBindingIdentifier(d)) {
      Assert(isFunctionDeclaration(d) || isGeneratorDeclaration(d)
             || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d));
      const fn = BoundNames_FunctionDeclaration(d)[0];
      if (!declaredFunctionNames.includes(fn)) {
        const fnDefinable = Q(envRec.CanDeclareGlobalFunction(new Value(fn)));
        if (fnDefinable === Value.false) {
          return surroundingAgent.Throw('TypeError');
        }
        declaredFunctionNames.push(fn);
        functionsToInitialize.unshift(d);
      }
    }
  }

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
          const vnDefinable = Q(envRec.CanDeclareGlobalVar(vn));
          if (vnDefinable === Value.false) {
            return surroundingAgent.Throw('TypeError');
          }
          if (!declaredVarNames.includes(vn)) {
            declaredVarNames.push(vn);
          }
        }
      }
    }
  }

  // NOTE: Annex B.3.3.2 adds additional steps at this point.
  // TODO(devsnek): Annex B.3.3.2

  const lexDeclarations = LexicallyScopedDeclarations_ScriptBody(script);
  for (const d of lexDeclarations) {
    for (const dn of BoundNames_Declaration(d).map(Value)) {
      if (IsConstantDeclaration(d)) {
        Q(envRec.CreateImmutableBinding(dn, Value.true));
      } else {
        Q(envRec.CreateMutableBinding(dn, Value.false));
      }
    }
  }

  for (const f of functionsToInitialize) {
    const fn = new Value(BoundNames_FunctionDeclaration(f)[0]);
    const fo = InstantiateFunctionObject(f, env);
    Q(envRec.CreateGlobalFunctionBinding(fn, fo, Value.false));
  }

  for (const vn of declaredVarNames) {
    Q(envRec.CreateGlobalVarBinding(vn, Value.false));
  }

  return new NormalCompletion(undefined);
}
