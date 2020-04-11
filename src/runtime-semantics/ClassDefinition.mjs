import { surroundingAgent } from '../engine.mjs';
import { emptyConstructorNode, forwardingConstructorNode } from '../parse.mjs';
import {
  Assert,
  CreateMethodProperty,
  Get,
  GetValue,
  IsConstructor,
  MakeClassConstructor,
  MakeConstructor,
  OrdinaryObjectCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Type, Value } from '../value.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import {
  ConstructorMethod_ClassBody,
  IsStatic_ClassElement,
  NonConstructorMethodDefinitions_ClassBody,
} from '../static-semantics/all.mjs';
import {
  AbruptCompletion,
  Completion,
  NormalCompletion,
  Q,
} from '../completion.mjs';
import {
  DefineMethod,
  InitializeBoundName,
  PropertyDefinitionEvaluation_ClassElement,
} from './all.mjs';

// 14.6.13 #sec-runtime-semantics-classdefinitionevaluation
//   ClassTail : ClassHeritage `{` ClassBody `}`
export function* ClassDefinitionEvaluation_ClassTail({ ClassHeritage, ClassBody }, classBinding, className) {
  const lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const classScope = NewDeclarativeEnvironment(lex);
  const classScopeEnvRec = classScope.EnvironmentRecord;
  if (classBinding !== Value.undefined) {
    classScopeEnvRec.CreateImmutableBinding(classBinding, Value.true);
  }
  let protoParent;
  let constructorParent;
  if (!ClassHeritage) {
    protoParent = surroundingAgent.intrinsic('%Object.prototype%');
    constructorParent = surroundingAgent.intrinsic('%Function.prototype%');
  } else {
    surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope;
    const superclassRef = yield* Evaluate(ClassHeritage);
    surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
    const superclass = Q(GetValue(superclassRef));
    if (Type(superclass) === 'Null') {
      protoParent = Value.null;
      constructorParent = surroundingAgent.intrinsic('%Function.prototype%');
    } else if (IsConstructor(superclass) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAConstructor', superclass);
    } else {
      protoParent = Q(Get(superclass, new Value('prototype')));
      if (Type(protoParent) !== 'Object' && Type(protoParent) !== 'Null') {
        return surroundingAgent.Throw('TypeError', 'ObjectPrototypeType');
      }
      constructorParent = superclass;
    }
  }
  const proto = OrdinaryObjectCreate(protoParent);
  let constructor;
  if (!ClassBody) {
    constructor = undefined;
  } else {
    constructor = ConstructorMethod_ClassBody(ClassBody);
  }
  if (constructor === undefined) {
    if (ClassHeritage) {
      // Set constructor to the result of parsing the source text `constructor(...args) { super(...args); }`
      constructor = forwardingConstructorNode;
    } else {
      // Set constructor to the result of parsing the source text `constructor() {}`
      constructor = emptyConstructorNode;
    }
  }
  surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope;
  const constructorInfo = yield* DefineMethod(constructor, proto, constructorParent);
  Assert(!(constructorInfo instanceof AbruptCompletion));
  const F = constructorInfo.Closure;
  SetFunctionName(F, className);
  MakeConstructor(F, false, proto);
  if (ClassHeritage) {
    F.ConstructorKind = 'derived';
  }
  MakeClassConstructor(F);
  CreateMethodProperty(proto, new Value('constructor'), F);
  let methods;
  if (!ClassBody) {
    methods = [];
  } else {
    methods = NonConstructorMethodDefinitions_ClassBody(ClassBody);
  }
  for (const m of methods) {
    let status;
    if (IsStatic_ClassElement(m) === false) {
      status = yield* PropertyDefinitionEvaluation_ClassElement(m, proto, false);
    } else {
      status = yield* PropertyDefinitionEvaluation_ClassElement(m, F, false);
    }
    if (status instanceof AbruptCompletion) {
      surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
      return Completion(status);
    }
  }
  surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
  if (classBinding !== Value.undefined) {
    classScopeEnvRec.InitializeBinding(classBinding, F);
  }
  return F;
}

// 14.6.16 #sec-class-definitions-runtime-semantics-evaluation
//   ClassExpression : `class` BindingIdentifier ClassTail
export function* Evaluate_ClassExpression(ClassExpression) {
  const {
    id: BindingIdentifier,
    body,
    superClass,
  } = ClassExpression;
  const ClassTail = {
    ClassHeritage: superClass,
    ClassBody: body.body,
  };

  let className;
  if (!BindingIdentifier) {
    className = new Value('');
  } else {
    className = new Value(BindingIdentifier.name);
  }
  const value = Q(yield* ClassDefinitionEvaluation_ClassTail(ClassTail, className, className));
  value.SourceText = sourceTextMatchedBy(ClassExpression);
  return value;
}

// 14.6.14 #sec-runtime-semantics-bindingclassdeclarationevaluation
//   ClassDeclaration :
//     `class` BindingIdentifier ClassTail
//     `class` ClassTail
export function* BindingClassDeclarationEvaluation_ClassDeclaration(ClassDeclaration) {
  const {
    id: BindingIdentifier,
    body,
    superClass: ClassHeritage,
  } = ClassDeclaration;
  const ClassTail = {
    ClassHeritage,
    ClassBody: body.body,
  };

  let classBinding;
  let className;
  if (!BindingIdentifier) {
    classBinding = Value.undefined;
    className = new Value('default');
  } else {
    classBinding = new Value(BindingIdentifier.name);
    className = classBinding;
  }
  const value = Q(yield* ClassDefinitionEvaluation_ClassTail(ClassTail, classBinding, className));
  value.SourceText = sourceTextMatchedBy(ClassDeclaration);
  if (BindingIdentifier) {
    const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    Q(InitializeBoundName(className, value, env));
  }
  return value;
}

// 14.6.16 #sec-class-definitions-runtime-semantics-evaluation
//   ClassDeclaration : `class` BindingIdentifier ClassTail
export function* Evaluate_ClassDeclaration(ClassDeclaration) {
  Q(yield* BindingClassDeclarationEvaluation_ClassDeclaration(ClassDeclaration));
  return new NormalCompletion(undefined);
}
