import { surroundingAgent } from '../engine.mjs';
import {
  MakeMethod,
  OrdinaryFunctionCreate,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';

export class ClassStaticBlockDefinitionRecord {
  constructor({ BodyFunction }) {
    this.BodyFunction = BodyFunction;
  }
}

// #sec-runtime-semantics-classstaticblockdefinitionevaluation
//    ClassStaticBlock : `static` `{` ClassStaticBlockBody `}`
export function ClassStaticBlockDefinitionEvaluation({ ClassStaticBlockBody }, homeObject) {
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
