import acorn from 'acorn';
import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateMethodProperty,
  Get,
  GetValue,
  HasOwnProperty,
  IsConstructor,
  MakeClassConstructor,
  MakeConstructor,
  ObjectCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  DefineMethod,
  InitializeBoundName,
  PropertyDefinitionEvaluation_ClassElement,
} from './all.mjs';
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
  ReturnIfAbrupt,
} from '../completion.mjs';

const emptyConstructorNode = acorn.parse('(class { constructor() {} })').body[0].expression.body.body[0];
const forwardingConstructorNode = acorn.parse('(class extends X { constructor(... args){ super (...args);} })').body[0].expression.body.body[0];
Object.freeze(emptyConstructorNode);
Object.freeze(forwardingConstructorNode);

// #sec-runtime-semantics-classdefinitionevaluation
//   ClassTail : ClassHeritage `{` ClassBody `}`
function* ClassDefinitionEvaluation({ ClassHeritage, ClassBody }, className) {
  const lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const classScope = NewDeclarativeEnvironment(lex);
  const classScopeEnvRec = classScope.EnvironmentRecord;
  if (Type(className) !== 'Undefined') {
    classScopeEnvRec.CreateImmutableBinding(className, Value.true);
  }
  let protoParent;
  let constructorParent;
  if (!ClassHeritage) {
    protoParent = surroundingAgent.intrinsic('%ObjectPrototype%');
    constructorParent = surroundingAgent.intrinsic('%FunctionPrototype%');
  } else {
    surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope;
    const superclassRef = yield* Evaluate_Expression(ClassHeritage);
    surroundingAgent.runningExecutionContext.LexicalEnvironment = lex;
    const superclass = Q(GetValue(superclassRef));
    if (Type(superclass) === 'Null') {
      protoParent = Value.null;
      constructorParent = surroundingAgent.intrinsic('%FunctionPrototype%');
    } else if (IsConstructor(superclass) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    } else {
      protoParent = Q(Get(superclass, new Value('prototype')));
      if (Type(protoParent) !== 'Object' && Type(protoParent) !== 'Null') {
        return surroundingAgent.Throw('TypeError');
      }
      constructorParent = superclass;
    }
  }
  const proto = ObjectCreate(protoParent);
  let constructor;
  if (!ClassBody) {
    constructor = undefined;
  } else {
    constructor = ConstructorMethod_ClassBody(ClassBody);
  }
  if (constructor === undefined) {
    if (ClassHeritage) {
      // Set constructor to the result of parsing the source text `constructor(... args){ super (...args);}`
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
  if (ClassHeritage) {
    F.ConstructorKind = 'derived';
  }
  MakeConstructor(F, false, proto);
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
  if (Type(className) !== 'Undefined') {
    classScopeEnvRec.InitializeBinding(className, F);
  }
  return F;
}

// #sec-class-definitions-runtime-semantics-evaluation
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
    className = Value.undefined;
  } else {
    className = new Value(BindingIdentifier.name);
  }
  const value = yield* ClassDefinitionEvaluation(ClassTail, className);
  ReturnIfAbrupt(value);
  if (Type(className) !== 'Undefined') {
    const hasNameProperty = Q(HasOwnProperty(value, new Value('name')));
    if (hasNameProperty === Value.false) {
      SetFunctionName(value, className);
    }
  }
  value.SourceText = surroundingAgent.sourceTextMatchedBy(ClassExpression);
  return new NormalCompletion(value);
}

// #sec-runtime-semantics-bindingclassdeclarationevaluation
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

  let className;
  if (!BindingIdentifier) {
    className = Value.undefined;
  } else {
    className = new Value(BindingIdentifier.name);
  }
  const value = yield* ClassDefinitionEvaluation(ClassTail, className);
  ReturnIfAbrupt(value);
  if (BindingIdentifier) {
    const hasNameProperty = Q(HasOwnProperty(value, new Value('name')));
    if (hasNameProperty === Value.false) {
      SetFunctionName(value, className);
    }
    const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    Q(InitializeBoundName(className, value, env));
  }
  value.SourceText = surroundingAgent.sourceTextMatchedBy(ClassDeclaration);
  return new NormalCompletion(value);
}

// #sec-class-definitions-runtime-semantics-evaluation
//   ClassDeclaration : `class` BindingIdentifier ClassTail
export function* Evaluate_ClassDeclaration(ClassDeclaration) {
  Q(yield* BindingClassDeclarationEvaluation_ClassDeclaration(ClassDeclaration));
  return new NormalCompletion(undefined);
}
