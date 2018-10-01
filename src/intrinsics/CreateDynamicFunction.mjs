import {
  Assert,
  DefinePropertyOrThrow,
  FunctionAllocate,
  FunctionInitialize,
  GetPrototypeFromConstructor,
  MakeConstructor,
  ObjectCreate,
  SetFunctionName,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
} from '../completion.mjs';
import {
  HostEnsureCanCompileStrings,
  surroundingAgent,
} from '../engine.mjs';
import {
  ParseAsAsyncFunctionBody,
  ParseAsAsyncGeneratorBody,
  ParseAsFormalParameters,
  ParseAsFunctionBody,
  ParseAsGeneratorBody,
} from '../parse.mjs';
import { ContainsUseStrict_FunctionBody } from '../static-semantics/all.mjs';
import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';

// #sec-createdynamicfunction
export function CreateDynamicFunction(constructor, newTarget, kind, args) {
  Assert(surroundingAgent.executionContextStack.length >= 2);
  const callerContext = surroundingAgent.executionContextStack[surroundingAgent.executionContextStack.length - 2];
  const callerRealm = callerContext.Realm;
  const calleeRealm = surroundingAgent.currentRealmRecord;
  Q(HostEnsureCanCompileStrings(callerRealm, calleeRealm));
  if (Type(newTarget) === 'Undefined') {
    newTarget = constructor;
  }
  let bodyParser;
  let enableYield;
  let enableAwait;
  let fallbackProto;
  if (kind === 'normal') {
    bodyParser = ParseAsFunctionBody;
    enableYield = false;
    enableAwait = false;
    fallbackProto = '%FunctionPrototype%';
  } else if (kind === 'generator') {
    bodyParser = ParseAsGeneratorBody;
    enableYield = true;
    enableAwait = false;
    fallbackProto = '%Generator%';
  } else if (kind === 'async') {
    bodyParser = ParseAsAsyncFunctionBody;
    enableYield = false;
    enableAwait = true;
    fallbackProto = '%AsyncFunctionPrototype%';
  } else if (kind === 'async generator') {
    bodyParser = ParseAsAsyncGeneratorBody;
    enableYield = true;
    enableAwait = true;
    fallbackProto = '%AsyncGenerator%';
  }
  const argCount = args.length;
  let P = '';
  let bodyText;
  if (argCount === 0) {
    bodyText = '';
  } else if (argCount === 1) {
    bodyText = args[0];
  } else {
    const firstArg = args[0];
    P = Q(ToString(firstArg)).stringValue();
    let k = 1;
    while (k < argCount - 1) {
      const nextArg = args[k];
      const nextArgString = Q(ToString(nextArg));
      P = `${P},${nextArgString.stringValue()}`;
      k += 1;
    }
    bodyText = args[k];
  }
  bodyText = Q(ToString(bodyText)).stringValue();

  let body;
  try {
    body = bodyParser(bodyText);
  } catch (err) {
    return surroundingAgent.Throw('SyntaxError', err.message);
  }
  const strict = ContainsUseStrict_FunctionBody(body);
  let parameters;
  try {
    parameters = ParseAsFormalParameters(P, strict, enableAwait, enableYield);
  } catch (err) {
    return surroundingAgent.Throw('SyntaxError', err.message);
  }

  // These steps should be included in bodyParser:
  // If body Contains SuperCall is true, throw a SyntaxError exception.
  // If body Contains SuperProperty is true, throw a SyntaxError exception.
  //
  // See https://github.com/acornjs/acorn/issues/740.

  // These steps are included in ParseAsFormalParameters:
  // If strict is true, the Early Error rules for UniqueFormalParameters:FormalParameters are applied.
  // If strict is true and IsSimpleParameterList of parameters is false, throw a SyntaxError exception.
  // If parameters Contains SuperCall is true, throw a SyntaxError exception.
  // If parameters Contains SuperProperty is true, throw a SyntaxError exception.
  // If kind is "generator" or "async generator", then
  //   If parameters Contains YieldExpression is true, throw a SyntaxError exception.
  // If kind is "async" or "async generator", then
  //   If parameters Contains AwaitExpression is true, throw a SyntaxError exception.
  // If strict is true, then
  //   If BoundNames of parameters contains any duplicate elements, throw a SyntaxError exception.

  // TODO(TimothyGu)
  // If any element of the BoundNames of parameters also occurs in the LexicallyDeclaredNames of body, throw a SyntaxError exception.

  const fabricatedFunctionNode = {
    type: 'FunctionExpression',
    id: null,
    generator: enableYield,
    expression: false,
    async: enableAwait,
    params: parameters,
    body: {
      type: 'BlockStatement',
      body,
    },
  };

  const proto = Q(GetPrototypeFromConstructor(newTarget, fallbackProto));
  const F = FunctionAllocate(proto, strict, kind);
  const realmF = F.Realm;
  const scope = realmF.GlobalEnv;
  FunctionInitialize(F, 'Normal', parameters, fabricatedFunctionNode, scope);
  if (kind === 'generator') {
    const prototype = ObjectCreate(surroundingAgent.intrinsic('%GeneratorPrototype%'));
    X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: new Value(true),
      Enumerable: new Value(false),
      Configurable: new Value(false),
    })));
  } else if (kind === 'async generator') {
    const prototype = ObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorPrototype%'));
    X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: new Value(true),
      Enumerable: new Value(false),
      Configurable: new Value(false),
    })));
  } else if (kind === 'normal') {
    MakeConstructor(F);
  }
  SetFunctionName(F, new Value('anonymous'));
  return F;
}
