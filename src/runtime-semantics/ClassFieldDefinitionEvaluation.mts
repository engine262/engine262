// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { X, ReturnIfAbrupt } from '../completion.mjs';
import { MakeMethod, OrdinaryFunctionCreate } from '../abstract-ops/all.mjs';
import { Evaluate_PropertyName } from './PropertyName.mjs';

export class ClassFieldDefinitionRecord {
  constructor(init) {
    this.Name = init.Name;
    this.Initializer = init.Initializer;
  }
}

export function* ClassFieldDefinitionEvaluation(FieldDefinition, homeObject) {
  const { ClassElementName, Initializer } = FieldDefinition;
  // 1. Let name be the result of evaluating ClassElementName.
  const name = yield* Evaluate_PropertyName(ClassElementName);
  // 2. ReturnIfAbrupt(name).
  ReturnIfAbrupt(name);
  // 3. If Initializer is present, then
  let initializer;
  if (Initializer) {
    // a. Let formalParameterList be an instance of the production FormalParameters : [empty].
    const formalParameterList = [];
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
