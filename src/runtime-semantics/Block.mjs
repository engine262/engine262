import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { NewDeclarativeEnvironment, DeclarativeEnvironmentRecord } from '../environment.mjs';
import { Assert } from '../abstract-ops/all.mjs';
import {
  LexicallyScopedDeclarations,
  IsConstantDeclaration,
  BoundNames,
} from '../static-semantics/all.mjs';
import { X, NormalCompletion } from '../completion.mjs';
import { Evaluate_StatementList, InstantiateFunctionObject } from './all.mjs';

// #sec-blockdeclarationinstantiation
export function BlockDeclarationInstantiation(code, env) {
  // 1. Let envRec be env's EnvironmentRecord.
  const envRec = env.EnvironmentRecord;
  // 2. Assert: envRec is a declarative Environment Record.
  Assert(envRec instanceof DeclarativeEnvironmentRecord);
  // 3. Let declarations be the LexicallyScopedDeclarations of code.
  const declarations = LexicallyScopedDeclarations(code);
  // 4. For each element d in declarations, do
  for (const d of declarations) {
    // a. For each element dn of the BoundNames of d, do
    for (const dn of BoundNames(d)) {
      // i. If IsConstantDeclaration of d is true, then
      if (IsConstantDeclaration(d)) {
        // 1. Perform ! envRec.CreateImmutableBinding(dn, true).
        X(envRec.CreateImmutableBinding(dn, Value.true));
      } else { // ii. Else,
        // 1. Perform ! envRec.CreateMutableBinding(dn, false).
        X(envRec.CreateMutableBinding(dn, false));
      }
      // b. If d is a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration, then
      if (d.type === 'FunctionDeclaration'
          || d.type === 'GeneratorDeclaration'
          || d.type === 'AsyncFunctionDeclaration'
          || d.type === 'AsyncGeneratorDeclaration') {
        // i. Let fn be the sole element of the BoundNames of d.
        const fn = BoundNames(d)[0];
        // ii. Let fo be InstantiateFunctionObject of d with argument env.
        const fo = InstantiateFunctionObject(d, env);
        // iii. Perform envRec.InitializeBinding(fn, fo).
        envRec.InitializeBinding(fn, fo);
      }
    }
  }
}

// #sec-block-runtime-semantics-evaluation
//  Block :
//    `{` `}`
//    `{` StatementList `}`
export function* Evaluate_Block({ StatementList }) {
  if (StatementList.length === 0) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  // 1. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let blockEnv be NewDeclarativeEnvironment(oldEnv).
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  // 3. Perform BlockDeclarationInstantiation(StatementList, blockEnv).
  BlockDeclarationInstantiation(StatementList, blockEnv);
  // 4. Set the running execution context's LexicalEnvironment to blockEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  // 5. Let blockValue be the result of evaluating StatementList.
  const blockValue = yield* Evaluate_StatementList(StatementList);
  // 6. Set the running execution context's LexicalEnvironment to oldEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  // 7. Return blockValue.
  return blockValue;
}
