import acorn from 'acorn';
import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Get,
  GetValue,
  HasOwnProperty,
  IsConstructor,
  ObjectCreate,
  SetFunctionName,
  MakeConstructor,
  MakeClassConstructor,
  MakeMethod,
  CreateMethodProperty,
  FunctionCreate,
  DefinePropertyOrThrow,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Evaluate_PropertyName } from './all.mjs';
import { Value, Type } from '../value.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { IsStatic } from '../static-semantics/all.mjs';
import {
  Q,
  Completion,
  ReturnIfAbrupt,
  NormalCompletion,
  AbruptCompletion,
} from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-runtime-semantics-definemethod
// MethodDefinition : PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
function* DefineMethod(MethodDefinition, object, functionPrototype) {
  const PropertyName = MethodDefinition.key;
  const UniqueFormalParameters = MethodDefinition.value.params;

  const propKey = yield* Evaluate_PropertyName(PropertyName);
  ReturnIfAbrupt(propKey);
  // If the function code for this MethodDefinition is strict mode code, let strict be true. Otherwise let strict be false.
  const strict = true;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  let kind;
  let prototype;
  if (functionPrototype !== undefined) {
    kind = 'Normal';
    prototype = functionPrototype;
  } else {
    kind = 'Method';
    prototype = surroundingAgent.intrinsic('%FunctionPrototype%');
  }
  const closure = FunctionCreate(kind, UniqueFormalParameters, MethodDefinition.value, scope, strict, prototype);
  MakeMethod(closure, object);
  return {
    Key: propKey,
    Closure: closure,
  };
}

// #sec-method-definitions-runtime-semantics-propertydefinitionevaluation
// MethodDefinition :
//   PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
//   `get` PropertyName `(` `)` `{` FunctionBody `}`
//   `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`
function* PropertyDefinitionEvaluation(MethodDefinition, object, enumerable) {
  if (MethodDefinition.kind === 'method' || MethodDefinition.kind === 'constructor') {
    const methodDef = yield* DefineMethod(MethodDefinition, object);
    ReturnIfAbrupt(methodDef);
    SetFunctionName(methodDef.Closure, methodDef.Key);
    const desc = {
      Value: methodDef.Closure,
      Writable: true,
      Enumerable: enumerable,
      Configurable: true,
    };
    return Q(DefinePropertyOrThrow(object, methodDef.Key, desc));
  } else if (MethodDefinition.kind === 'get') {
    const PropertyName = MethodDefinition.key;

    const propKey = yield* Evaluate_PropertyName(PropertyName);
    ReturnIfAbrupt(propKey);
    // If the function code for this MethodDefinition is strict mode code, let strict be true. Otherwise let strict be false.
    const strict = true;
    const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    const formalParameterList = [];
    const closure = FunctionCreate('Method', formalParameterList, MethodDefinition.value, scope, strict);
    SetFunctionName(closure, propKey, new Value('get'));
    const desc = {
      Get: closure,
      Enumerable: enumerable,
      Configurable: true,
    };
    return Q(DefinePropertyOrThrow(object, propKey, desc));
  } else if (MethodDefinition.kind === 'set') {
    const PropertyName = MethodDefinition.key;
    const PropertySetParameterList = MethodDefinition.value.params;

    const propKey = yield* Evaluate_PropertyName(PropertyName);
    ReturnIfAbrupt(propKey);
    // If the function code for this MethodDefinition is strict mode code, let strict be true. Otherwise let strict be false.
    const strict = true;
    const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    const closure = FunctionCreate('Method', PropertySetParameterList, MethodDefinition.value, scope, strict);
    MakeMethod(closure, object);
    SetFunctionName(closure, propKey, new Value('set'));
    const desc = {
      Set: closure,
      Enumerable: enumerable,
      Configurable: true,
    };
    return Q(DefinePropertyOrThrow(object, propKey, desc));
  } else {
    throw outOfRange('PropertyDefinitionEvaluation', MethodDefinition.kind);
  }
}

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
    constructor = ClassBody.find((c) => c.kind === 'constructor');
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
    methods = ClassBody;
  }
  for (const m of methods) {
    let status;
    if (IsStatic(m) === false) {
      status = yield* PropertyDefinitionEvaluation(m, proto, false);
    } else {
      status = yield* PropertyDefinitionEvaluation(m, F, false);
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
