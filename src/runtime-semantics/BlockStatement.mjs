import {
  surroundingAgent,
} from '../engine.mjs';
import {
  BoundNames_Declaration,
  LexicallyScopedDeclarations_StatementList,
  IsConstantDeclaration,
} from '../static-semantics/all.mjs';
import {
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
} from '../ast.mjs';
import {
  Assert,
} from '../abstract-ops/all.mjs';
import {
  InstantiateFunctionObject,
} from './all.mjs';
import {
  NewDeclarativeEnvironment,
  DeclarativeEnvironmentRecord,
} from '../environment.mjs';
import {
  New as NewValue,
} from '../value.mjs';
import {
  X,
  NormalCompletion,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-blockdeclarationinstantiation
function BlockDeclarationInstantiation(code, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof DeclarativeEnvironmentRecord);
  const declarations = LexicallyScopedDeclarations_StatementList(code);
  for (const d of declarations) {
    for (const dn of BoundNames_Declaration(d)) {
      if (IsConstantDeclaration(d)) {
        X(envRec.CreateImmutableBinding(dn, NewValue(true)));
      } else {
        X(envRec.CreateMutableBinding(dn, NewValue(false)));
      }
      if (isFunctionDeclaration(d) || isGeneratorDeclaration(d)
          || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d)) {
        const fn = BoundNames_Declaration(d)[0];
        const fo = InstantiateFunctionObject(d, env);
        envRec.InitializeBinding(fn, fo);
      }
    }
  }
}

// #sec-block-runtime-semantics-evaluation
// Block :
//   { }
//   { StatementList }
export function Evaluate_BlockStatement(BlockStatement) {
  const StatementList = BlockStatement.body;

  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  BlockDeclarationInstantiation(StatementList, blockEnv);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  const blockValue = Evaluate(StatementList);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return blockValue;
}
