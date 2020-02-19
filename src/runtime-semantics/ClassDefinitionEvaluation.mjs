import { surroundingAgent } from '../engine.mjs';
import { forwardingConstructorNode, emptyConstructorNode } from '../parse.mjs';
import { Value, Type } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  Get,
  GetValue,
  IsConstructor,
  MakeConstructor,
  MakeClassConstructor,
  SetFunctionName,
  CreateMethodProperty,
  OrdinaryObjectCreate,
} from '../abstract-ops/all.mjs';
import {
  IsStatic,
  ConstructorMethod,
  NonConstructorMethodDefinitions,
} from '../static-semantics/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import {
  Q, X,
  AbruptCompletion,
  Completion,
} from '../completion.mjs';
import {
  DefineMethod,
  PropertyDefinitionEvaluation,
} from './all.mjs';

// ClassTail : ClassHeritage? `{` ClassBody? `}`
export function* ClassDefinitionEvaluation(ClassTail, classBinding, className) {
  const { ClassHeritage, ClassBody } = ClassTail;
  // 1. Let lex be the LexicalEnvironment of the running execution context.
  const lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let classScope be NewDeclarativeEnvironment(lex).
  const classScope = NewDeclarativeEnvironment(lex);
  // 3. Let classScopeEnvRec be classScope's EnvironmentRecord.
  const classScopeEnvRec = classScope.EnvironmentRecord;
  // 4. If classBinding is not undefined, then
  if (classBinding !== Value.undefined) {
    // a. Perform classScopeEnvRec.CreateImmutableBinding(classBinding, true).
    classScopeEnvRec.CreateImmutableBinding(classBinding, Value.true);
  }
  let protoParent;
  let constructorParent;
  // 5. If ClassHeritage is not present, then
  if (ClassHeritage === null) {
    // a. Let protoParent be %Object.prototype%.
    protoParent = surroundingAgent.intrinsic('%Object.prototype%');
    // b. Let constructorParent be %Function.prototype%.
    constructorParent = surroundingAgent.intrinsic('%Function.prototype%');
  } else { // 6. Else,
    // a. Set the running execution context's LexicalEnvironment to classScope.
    surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope;
    // b. Let superclassRef be the result of evaluating ClassHeritage.
    const superclassRef = yield* Evaluate(ClassHeritage);
    // c. Set the running execution context's LexicalEnvironment to lex.
    surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
    // d. Let superclass be ? GetValue(superclassRef).
    const superclass = Q(GetValue(superclassRef));
    // e. If superclass is null, then
    if (superclass === Value.null) {
      // i. Let protoParent be null.
      protoParent = Value.null;
      // ii. Let constructorParent be %Function.prototype%.
      constructorParent = surroundingAgent.intrinsic('%Function.prototype%');
    } else if (IsConstructor(superclass) === Value.false) {
      // f. Else if IsConstructor(superclass) is false, throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'NotAConstructor', superclass);
    } else { // g. Else,
      // i. Let protoParent be ? Get(superclass, "prototype").
      protoParent = Q(Get(superclass, new Value('prototype')));
      // ii. If Type(protoParent) is neither Object nor Null, throw a TypeError exception.
      if (Type(protoParent) !== 'Object' && Type(protoParent) !== 'Null') {
        return surroundingAgent.Throw('TypeError', 'ObjectPrototypeType');
      }
      // iii. Let constructorParent be superclass.
      constructorParent = superclass;
    }
  }
  // 7. Let proto be OrdinaryObjectCreate(protoParent).
  const proto = OrdinaryObjectCreate(protoParent);
  let constructor;
  // 8. If ClassBody is not present, let constructor be empty.
  if (ClassBody === null) {
    constructor = undefined;
  } else { // 9. Else, let constructor be ConstructorMethod of ClassBody.
    constructor = ConstructorMethod(ClassBody);
  }
  // 10. If constructor is empty, then
  if (constructor === undefined) {
    // a. If ClassHeritage is present, then
    if (ClassHeritage !== null) {
      // i. Set constructor to the result of parsing the source text
      //    `constructor(...args) { super(...args); } using the syntactic grammar with the goal
      //    symbol MethodDefinition[~Yield, ~Await].
      constructor = forwardingConstructorNode;
    } else { // b. Else,
      // i. Set constructor to the result of parsing the source text `constructor() {}` using the
      //    syntactic grammar with the goal symbol MethodDefinition[~Yield, ~Await].
      constructor = emptyConstructorNode;
    }
  }
  // 11. Set the running execution context's LexicalEnvironment to classScope.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope;
  // 12. Let constructorInfo be ! DefineMethod of constructor with arguments proto and constructorParent.
  const constructorInfo = X(yield* DefineMethod(constructor, proto, constructorParent));
  // 13. Let F be constructorInfo.[[Closure]].
  const F = constructorInfo.Closure;
  // 14. Perform SetFunctionName(F, className).
  SetFunctionName(F, className);
  // 15. Perform MakeConstructor(F, false, proto).
  MakeConstructor(F, Value.false, proto);
  // 16. If ClassHeritage is present, set F.[[ConstructorKind]] to derived.
  if (ClassHeritage !== null) {
    F.ConstructorKind = 'derived';
  }
  // 17. Perform MakeClassConstructor(F).
  MakeClassConstructor(F);
  // 18. Perform CreateMethodProperty(proto, "constructor", F).
  CreateMethodProperty(proto, new Value('constructor'), F);
  // 19. If ClassBody is not present, let methods be a new empty List.
  let methods;
  if (ClassBody === null) {
    methods = [];
  } else { // 20. Else, let methods be NonConstructorMethodDefinitions of ClassBody.
    methods = NonConstructorMethodDefinitions(ClassBody);
  }
  // 21. For each ClassElement m in order from methods, do
  for (const m of methods) {
    let status;
    // a. If IsStatic of m is false, then
    if (IsStatic(m) === false) {
      // i. Let status be PropertyDefinitionEvaluation of m with arguments proto and false.
      status = yield* PropertyDefinitionEvaluation(m, proto, Value.false);
    } else { // b. Else,
      // i. Let status be PropertyDefinitionEvaluation of m with arguments F and false.
      status = yield* PropertyDefinitionEvaluation(m, F, Value.false);
    }
    // c. If status is an abrupt completion, then
    if (status instanceof AbruptCompletion) {
      // i. Set the running execution context's LexicalEnvironment to lex.
      surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
      // ii. Return Completion(status).
      return Completion(status);
    }
  }
  // 22. Set the running execution context's LexicalEnvironment to lex.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
  // 23. If classBinding is not undefined, then
  if (classBinding !== Value.undefined) {
    // a. Perform classScopeEnvRec.InitializeBinding(classBinding, F).
    classScopeEnvRec.InitializeBinding(classBinding, F);
  }
  // 24. Return F.
  return F;
}
