import {
  surroundingAgent,
} from '../engine.mjs';
import {
  BoundNames_Declaration,
  IsConstantDeclaration,
  LexicallyScopedDeclarations_StatementList,
} from '../static-semantics/all.mjs';
import {
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isFunctionDeclaration,
  isGeneratorDeclaration,
} from '../ast.mjs';
import {
  Assert,
} from '../abstract-ops/all.mjs';
import {
  DeclarativeEnvironmentRecord,
  NewDeclarativeEnvironment,
} from '../environment.mjs';
import {
  Value,
} from '../value.mjs';
import {
  NormalCompletion,
  X,
} from '../completion.mjs';
import { Evaluate_StatementList } from '../evaluator.mjs';
import {
  InstantiateFunctionObject,
} from './all.mjs';

// 13.2.14 #sec-blockdeclarationinstantiation
export function BlockDeclarationInstantiation(code, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof DeclarativeEnvironmentRecord);
  const declarations = LexicallyScopedDeclarations_StatementList(code);
  for (const d of declarations) {
    for (const dn of BoundNames_Declaration(d).map(Value)) {
      if (IsConstantDeclaration(d)) {
        X(envRec.CreateImmutableBinding(dn, Value.true));
      } else {
        X(envRec.CreateMutableBinding(dn, false));
      }
      if (isFunctionDeclaration(d) || isGeneratorDeclaration(d)
          || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d)) {
        const fn = BoundNames_Declaration(d)[0];
        const fo = InstantiateFunctionObject(d, env);
        envRec.InitializeBinding(new Value(fn), fo);
      }
    }
  }
}

// 13.2.13 #sec-block-runtime-semantics-evaluation
//   Block :
//     `{` `}`
//     `{` StatementList `}`
export function* Evaluate_Block(Block) {
  const StatementList = Block.body;

  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  BlockDeclarationInstantiation(StatementList, blockEnv);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  const blockValue = yield* Evaluate_StatementList(StatementList);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return blockValue;
}

export const Evaluate_BlockStatement = Evaluate_Block;
