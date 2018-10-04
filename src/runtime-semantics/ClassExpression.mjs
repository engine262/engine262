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
  PropertyDefinitionEvaluation_ClassElement,
} from './all.mjs';
import { Value, Type } from '../value.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import {
  ConstructorMethod_ClassBody,
  IsStatic_ClassElement,
  NonConstructorMethodDefinitions_ClassBody,
} from '../static-semantics/all.mjs';
import {
  Q,
  Completion,
  ReturnIfAbrupt,
  NormalCompletion,
  AbruptCompletion,
} from '../completion.mjs';

// #sec-runtime-semantics-classdefinitionevaluation
// ClassTail : ClassHeritage `{` ClassBody `}`
// TODO(devsnek): This should be shared with ClassDeclaration
function* ClassDefinitionEvaluation({ ClassHeritage, ClassBody }, className) {
  const lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const classScope = NewDeclarativeEnvironment(lex);
  const classScopeEnvRec = classScope.EnvironmentRecord;
  if (Type(className) !== 'Undefined') {
    classScopeEnvRec.CreateImmutableBinding(className, new Value(true));
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
      protoParent = new Value(null);
      constructorParent = surroundingAgent.intrinsic('%FunctionPrototype%');
    } else if (IsConstructor(superclass).isFalse()) {
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
      constructor = acorn.parse('(class { constructor(... args){ super (...args);} })').body[0].expression.body.body[0];
    } else {
      // Set constructor to the result of parsing the source text `constructor() {}`
      constructor = acorn.parse('(class { constructor() {} })').body[0].expression.body.body[0];
    }
  }
  surroundingAgent.runningExecutionContext.LexicalEnvironment = classScope;
  const constructorInfo = yield* DefineMethod(constructor, proto, constructorParent);
  Assert(!(constructorInfo instanceof AbruptCompletion));
  const F = constructorInfo.Closure;
  if (ClassHeritage) {
    F.ConstructorKind = 'derived';
  }
  MakeConstructor(F, new Value(false), proto);
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
// ClassExpression : `class` BindingIdentifier ClassTail
export function* Evaluate_ClassExpression({
  id: BindingIdentifier,
  body,
  superClass,
}) {
  const ClassTail = {
    ClassHeritage: superClass,
    ClassBody: body.body,
  };

  let className;
  if (!BindingIdentifier) {
    className = new Value(undefined);
  } else {
    className = new Value(BindingIdentifier.name);
  }
  const value = yield* ClassDefinitionEvaluation(ClassTail, className);
  ReturnIfAbrupt(value);
  if (Type(className) !== 'Undefined') {
    const hasNameProperty = Q(HasOwnProperty(value, new Value('name')));
    if (hasNameProperty.isFalse()) {
      SetFunctionName(value, className);
    }
  }
  return new NormalCompletion(value);
}
