import { surroundingAgent } from '../host-defined/engine.mts';
import { X, ReturnIfAbrupt } from '../completion.mts';
import { MakeMethod, OrdinaryFunctionCreate } from '../abstract-ops/all.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { PlainEvaluator } from '../evaluator.mts';
import { Evaluate_PropertyName } from './PropertyName.mts';
import type {
  ECMAScriptFunctionObject, ObjectValue, PrivateName, PropertyKeyValue,
} from '#self';

export class ClassFieldDefinitionRecord {
  Name: PropertyKeyValue | PrivateName;

  Initializer: ECMAScriptFunctionObject | undefined;

  constructor(init: ClassFieldDefinitionRecord) {
    this.Name = init.Name;
    this.Initializer = init.Initializer;
  }
}

export function* ClassFieldDefinitionEvaluation(FieldDefinition: ParseNode.FieldDefinition, homeObject: ObjectValue): PlainEvaluator<ClassFieldDefinitionRecord> {
  const { ClassElementName, Initializer } = FieldDefinition;
  // 1. Let name be the result of evaluating ClassElementName.
  // 2. ReturnIfAbrupt(name).
  const name = ReturnIfAbrupt(yield* Evaluate_PropertyName(ClassElementName));
  // 3. If Initializer is present, then
  let initializer;
  if (Initializer) {
    // a. Let formalParameterList be an instance of the production FormalParameters : [empty].
    const formalParameterList: readonly [] = [];
    // b. Let scope be the LexicalEnvironment of the running execution context.
    const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    // c. Let privateScope be the running execution context's PrivateEnvironment.
    const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
    // d. Let sourceText be the empty sequence of Unicode code points.
    const sourceText = '';
    // e. Let initializer be ! OrdinaryFunctionCreate(%Function.prototype%, sourceText, formalParameterList, Initializer, non-lexical-this, scope, privateScope).
    initializer = X(OrdinaryFunctionCreate(
      surroundingAgent.intrinsic('%Function.prototype%'),
      sourceText,
      formalParameterList,
      Initializer,
      'non-lexical-this',
      scope,
      privateScope,
    ));
    // f. Perform MakeMethod(initializer, homeObject).
    MakeMethod(initializer, homeObject);
    // g. Set initializer.[[ClassFieldInitializerName]] to name.
    initializer.ClassFieldInitializerName = name;
  } else { // 4. Else,
    // a. Let initializer be empty.
    initializer = undefined;
  }
  // 5. Return the ClassFieldDefinition Record { [[Name]]: name, [[Initializer]]: initializer }.
  return new ClassFieldDefinitionRecord({
    Name: name,
    Initializer: initializer,
  });
}
