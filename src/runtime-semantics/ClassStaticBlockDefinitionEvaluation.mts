import { X } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { GCMarkable, GCTrace } from '../gc.mts';
import { callable, record } from '../utils/language.mts';
import { surroundingAgent } from '#self';
import {
  MakeMethod,
  OrdinaryFunctionCreate,
  type ECMAScriptFunctionObject,
  ObjectValue,
} from '#self';

type ClassStaticBlockDefinitionRecordInit = Omit<ClassStaticBlockDefinitionRecord, keyof GCMarkable>;
/** https://tc39.es/ecma262/#sec-classstaticblockdefinition-record-specification-type */ // @ts-expect-error
export function ClassStaticBlockDefinitionRecord(O: ClassStaticBlockDefinitionRecordInit): ClassStaticBlockDefinitionRecord
/** https://tc39.es/ecma262/#sec-classstaticblockdefinition-record-specification-type */ // @ts-expect-error
export @callable() @record class ClassStaticBlockDefinitionRecord implements GCMarkable {
  readonly BodyFunction: ECMAScriptFunctionObject;

  constructor(O: ClassStaticBlockDefinitionRecordInit) {
    if (new.target !== ClassStaticBlockDefinitionRecord) {
      throw new TypeError('ClassStaticBlockDefinitionRecord is a final class and cannot be subclassed');
    }
    this.BodyFunction = O.BodyFunction;
  }

  mark(trace: GCTrace): void {
    trace.strong('BodyFunction', this.BodyFunction, 'capture');
  }
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-classstaticblockdefinitionevaluation */
//    ClassStaticBlock : `static` `{` ClassStaticBlockBody `}`
export function ClassStaticBlockDefinitionEvaluation({ ClassStaticBlockBody }: ParseNode.ClassStaticBlock, homeObject: ObjectValue) {
  // 1. Let lex be the running execution context's LexicalEnvironment.
  const lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let privateEnv be the running execution context's PrivateEnvironment.
  const privateEnv = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 3. Let sourceText be the empty sequence of Unicode code points.
  const sourceText = '';
  // 4. Let formalParameters be an instance of the production FormalParameters : [empty] .
  const formalParameters: readonly [] = [];
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
  return ClassStaticBlockDefinitionRecord({ BodyFunction: bodyFunction });
}
