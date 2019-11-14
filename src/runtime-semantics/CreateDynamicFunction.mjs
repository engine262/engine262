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
import {
  BoundNames_FormalParameters,
  ContainsUseStrict_FunctionBody,
  LexicallyDeclaredNames_FunctionBody,
} from '../static-semantics/all.mjs';
import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import { ValueSet } from '../helpers.mjs';

function hasIntersection(reference, check) {
  if (reference.length === 0 || check.length === 0) {
    return false;
  }
  const refSet = new ValueSet(reference);
  for (const el of check) {
    if (refSet.has(el)) {
      return el;
    }
  }
  return false;
}

// #table-dynamic-function-sourcetext-prefixes
const DynamicFunctionSourceTextPrefixes = {
  'normal': 'function',
  'generator': 'function*',
  'async': 'async function',
  'async generator': 'async function*',
};

// 19.2.1.1.1 #sec-createdynamicfunction
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
    fallbackProto = '%Function.prototype%';
  } else if (kind === 'generator') {
    bodyParser = ParseAsGeneratorBody;
    enableYield = true;
    enableAwait = false;
    fallbackProto = '%Generator%';
  } else if (kind === 'async') {
    bodyParser = ParseAsAsyncFunctionBody;
    enableYield = false;
    enableAwait = true;
    fallbackProto = '%AsyncFunction.prototype%';
  } else if (kind === 'async generator') {
    bodyParser = ParseAsAsyncGeneratorBody;
    enableYield = true;
    enableAwait = true;
    fallbackProto = '%AsyncGeneratorFunction.prototype%';
  }
  const argCount = args.length;
  let P = '';
  let bodyText;
  if (argCount === 0) {
    bodyText = new Value('');
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
  bodyText = `\u000A${Q(ToString(bodyText)).stringValue()}\u000A`;

  let body;
  try {
    body = bodyParser(bodyText);
  } catch (err) {
    return surroundingAgent.Throw('SyntaxError', 'Raw', err.message);
  }
  const strict = ContainsUseStrict_FunctionBody(body);
  let parameters;
  try {
    parameters = ParseAsFormalParameters(P, strict, enableAwait, enableYield);
  } catch (err) {
    return surroundingAgent.Throw('SyntaxError', 'Raw', err.message);
  }

  // These steps are included in ParseAsFormalParameters:
  // 20. If strict is true, the Early Error rules for UniqueFormalParameters : FormalParameters are applied.
  // 21. If strict is true and IsSimpleParameterList of parameters is false, throw a SyntaxError exception.
  // 24. If parameters Contains SuperCall is true, throw a SyntaxError exception.
  // 26. If parameters Contains SuperProperty is true, throw a SyntaxError exception.
  // 27. If kind is "generator" or "async generator", then
  //   a. If parameters Contains YieldExpression is true, throw a SyntaxError exception.
  // 28. If kind is "async" or "async generator", then
  //   a. If parameters Contains AwaitExpression is true, throw a SyntaxError exception.
  // 29. If strict is true, then
  //   a. If BoundNames of parameters contains any duplicate elements, throw a SyntaxError exception.

  // 22. If any element of the BoundNames of parameters also occurs in the LexicallyDeclaredNames of body, throw a SyntaxError exception.
  const intersected = hasIntersection(BoundNames_FormalParameters(parameters), LexicallyDeclaredNames_FunctionBody(body));
  if (intersected !== false) {
    return surroundingAgent.Throw('SyntaxError', 'AlreadyDeclared', intersected);
  }

  const fabricatedFunctionNode = {
    type: 'FunctionExpression',
    id: null,
    generator: enableYield,
    expression: false,
    async: enableAwait,
    params: parameters,
    strict,
    body: {
      type: 'BlockStatement',
      body,
      strict,
    },
  };

  const proto = Q(GetPrototypeFromConstructor(newTarget, fallbackProto));
  const F = FunctionAllocate(proto);
  const realmF = F.Realm;
  const scope = realmF.GlobalEnv;
  FunctionInitialize(F, 'Normal', parameters, fabricatedFunctionNode, scope);
  if (kind === 'generator') {
    const prototype = ObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%'));
    X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  } else if (kind === 'async generator') {
    const prototype = ObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%'));
    X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  } else if (kind === 'normal') {
    MakeConstructor(F);
  }
  SetFunctionName(F, new Value('anonymous'));
  const prefix = DynamicFunctionSourceTextPrefixes[kind];
  const sourceText = `${prefix} anonymous(${P}\u000A) {${bodyText}}`;
  F.SourceText = new Value(sourceText);
  return F;
}
