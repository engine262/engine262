import {
  surroundingAgent,
} from '../engine.mjs';
import {
  EnvironmentRecord,
} from '../environment.mjs';
import {
  Assert,
} from '../abstract-ops/all.mjs';
import {
  LexicallyDeclaredNames_ScriptBody,
  LexicallyScopedDeclarations_ScriptBody,
  VarDeclaredNames_ScriptBody,
  VarScopedDeclarations_ScriptBody,
  IsConstantDeclaration,
  BoundNames_FunctionDeclaration,
  BoundNames_LexicalDeclaration,
  BoundNames_VariableDeclaration,
} from '../static-semantics/all.mjs';
import {
  InstantiateFunctionObject,
} from './all.mjs';
import {
  isBindingIdentifier,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isVariableDeclaration,
  isForBinding,
} from '../ast.mjs';
import {
  New as NewValue,
} from '../value.mjs';
import {
  Q,
  NormalCompletion,
} from '../completion.mjs';

// 15.1.11 GlobalDeclarationInstantiation
export function GlobalDeclarationInstantiation(script, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof EnvironmentRecord);

  const lexNames = LexicallyDeclaredNames_ScriptBody(script).map(NewValue);
  const varNames = VarDeclaredNames_ScriptBody(script).map(NewValue);

  for (const name of lexNames) {
    if (envRec.HasVarDeclaration(name).isTrue()) {
      return surroundingAgent.Throw('SyntaxError');
    }
    if (envRec.HasLexicalDeclaration(name).isTrue()) {
      return surroundingAgent.Throw('SyntaxError');
    }
    const hasRestrictedGlobal = envRec.HasRestrictedGlobalProperty(name);
    if (hasRestrictedGlobal.isTrue()) {
      return surroundingAgent.Throw('SyntaxError');
    }
  }

  for (const name of varNames) {
    if (envRec.HasLexicalDeclaration(name).isTrue()) {
      return surroundingAgent.Throw('SyntaxError');
    }
  }

  const varDeclarations = VarScopedDeclarations_ScriptBody(script).map(NewValue);

  const functionsToInitialize = [];
  const declaredFunctionNames = [];

  for (const d of varDeclarations.reverse()) {
    if (!isVariableDeclaration(d) && !isForBinding(d) && !isBindingIdentifier(d)) {
      Assert(isFunctionDeclaration(d) || isGeneratorDeclaration(d)
             || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d));
      const fn = BoundNames_FunctionDeclaration(d)[0];
      if (!declaredFunctionNames.includes(fn)) {
        const fnDefinable = Q(envRec.CanDeclareGlobalFunction(d));
        if (fnDefinable.isFalse()) {
          return surroundingAgent.Throw('TypeError');
        }
        declaredFunctionNames.push(fn);
        functionsToInitialize.unshift(d);
      }
    }
  }

  const declaredVarNames = [];

  for (const d of varDeclarations) {
    if (isVariableDeclaration(d) || isForBinding(d) || isBindingIdentifier(d)) {
      for (const vn of BoundNames_VariableDeclaration(d).map(NewValue)) {
        if (!declaredFunctionNames.includes(vn)) {
          const vnDefinable = Q(envRec.CanDeclareGlobalVar(vn));
          if (vnDefinable.isFalse()) {
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
    for (const dn of BoundNames_LexicalDeclaration(d).map(NewValue)) {
      if (IsConstantDeclaration(d)) {
        Q(envRec.CreateImmutableBinding(dn, NewValue(true)));
      } else {
        Q(envRec.CreateMutableBinding(dn, NewValue(false)));
      }
    }
  }

  for (const f of functionsToInitialize) {
    const fn = BoundNames_FunctionDeclaration(f)[0];
    const fo = InstantiateFunctionObject(f, env);
    Q(envRec.CreateGlobalFunctionBinding(fn, fo, NewValue(false)));
  }

  for (const vn of declaredVarNames) {
    Q(envRec.CreateGlobalVarBinding(vn, NewValue(false)));
  }

  return new NormalCompletion(undefined);
}
