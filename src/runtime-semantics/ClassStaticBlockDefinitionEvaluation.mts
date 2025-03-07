// @ts-nocheck
import { surroundingAgent } from '../engine.mts';
import {
  MakeMethod,
  OrdinaryFunctionCreate,
} from '../abstract-ops/all.mts';
import { X } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

export class ClassStaticBlockDefinitionRecord {
  BodyFunction;

  constructor({ BodyFunction }) {
    this.BodyFunction = BodyFunction;
  }
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-classstaticblockdefinitionevaluation */
//    ClassStaticBlock : `static` `{` ClassStaticBlockBody `}`
export function ClassStaticBlockDefinitionEvaluation({ ClassStaticBlockBody }: ParseNode.ClassStaticBlock, homeObject) {
  // 1. Let lex be the running execution context's LexicalEnvironment.
  const lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let privateEnv be the running execution context's PrivateEnvironment.
  const privateEnv = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 3. Let sourceText be the empty sequence of Unicode code points.
  const sourceText = '';
  // 4. Let formalParameters be an instance of the production FormalParameters : [empty] .
  const formalParameters = [];
  // 5. Let bodyFunction be OrdinaryFunctionCreate(%Function.prototype%, sourceText, formalParameters, ClassStaticBlockBody, non-lexical-this, lex, privateEnv).
  const bodyFunction = X(OrdinaryFunctionCreate(
    surroundingAgent.intrinsic('%Function.prototype%'),
    sourceText,
    formalParameters,
    ClassStaticBlockBody,
    'non-lexical-this',
    lex,
    privateEnv,
  ));
  // 6. Perform MakeMethod(bodyFunction, homeObject).
  X(MakeMethod(bodyFunction, homeObject));
  // 7. Return the ClassStaticBlockDefinition Record { [[BodyFunction]]: bodyFunction }.
  return new ClassStaticBlockDefinitionRecord({ BodyFunction: bodyFunction });
}
