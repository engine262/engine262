import {
  Assert,
  DefinePropertyOrThrow,
  GetPrototypeFromConstructor,
  MakeConstructor,
  OrdinaryFunctionCreate,
  OrdinaryObjectCreate,
  SetFunctionName,
  ToString,
  type FunctionObject,
  type Intrinsics,
} from '../abstract-ops/all.mts';
import { Q, ThrowCompletion, X } from '../completion.mts';
import {
  HostEnsureCanCompileStrings,
  surroundingAgent,
} from '../host-defined/engine.mts';
import { Parser, wrappedParse } from '../parse.mts';
import { Token } from '../parser/tokens.mts';
import {
  Descriptor, UndefinedValue, Value,
  type Arguments,
} from '../value.mts';
import { __ts_cast__, OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

export function* CreateDynamicFunction(constructor: FunctionObject, newTarget: FunctionObject | UndefinedValue, kind: 'normal' | 'generator' | 'async' | 'asyncGenerator', parameterArgs: Arguments, bodyArg: Value) {
  // 6. If newTarget is undefined, set newTarget to constructor.
  if (newTarget instanceof UndefinedValue) {
    newTarget = constructor;
  }
  // 7. If kind is normal, then
  let fallbackProto: keyof Intrinsics;
  let prefix;
  if (kind === 'normal') {
    prefix = 'function';
    // a. Let goal be the grammar symbol FunctionBody[~Yield, ~Await].
    // b. Let parameterGoal be the grammar symbol FormalParameters[~Yield, ~Await].
    // c. Let fallbackProto be "%Function.prototype%".
    fallbackProto = '%Function.prototype%';
  } else if (kind === 'generator') { // 8. Else if kind is generator, then
    prefix = 'function*';
    // a. Let goal be the grammar symbol GeneratorBody.
    // b. Let parameterGoal be the grammar symbol FormalParameters[+Yield, ~Await].
    // c. Let fallbackProto be "%GeneratorFunction.prototype%".
    fallbackProto = '%GeneratorFunction.prototype%';
  } else if (kind === 'async') { // 9. Else if kind is async, then
    prefix = 'async function';
    // a. Let goal be the grammar symbol AsyncBody.
    // b. Let parameterGoal be the grammar symbol FormalParameters[~Yield, +Await].
    // c. Let fallbackProto be "%AsyncFunction.prototype%".
    fallbackProto = '%AsyncFunction.prototype%';
  } else { // 10. Else,
    // a. Assert: kind is asyncGenerator.
    Assert(kind === 'asyncGenerator');
    prefix = 'async function*';
    // b. Let goal be the grammar symbol AsyncGeneratorBody.
    // c. Let parameterGoal be the grammar symbol FormalParameters[+Yield, +Await].
    // d. Let fallbackProto be "%AsyncGeneratorFunction.prototype%".
    fallbackProto = '%AsyncGeneratorFunction.prototype%';
  }
  // 11. Let argCount be the number of elements in args.
  const argCount = parameterArgs.length;
  const parameterStrings: string[] = [];
  for (const arg of parameterArgs) {
    parameterStrings.push(Q(yield* ToString(arg!)).stringValue());
  }
  const bodyString = Q(yield* ToString(bodyArg)).stringValue();
  const currentRealm = surroundingAgent.currentRealmRecord;
  Q(yield* HostEnsureCanCompileStrings(currentRealm, parameterStrings, bodyString, false));
  // 12. Let P be the empty String.
  let P = '';
  if (argCount > 0) {
    P = parameterStrings[0];
    // d. Let k be 1.
    let k = 1;
    // e. Repeat, while k < argCount - 1
    while (k < argCount) {
      const nextArgString = parameterStrings[k];
      // iii. Set P to the string-concatenation of the previous value of P, "," (a comma), and nextArgString.
      P = `${P},${nextArgString}`;
      // iv. Set k to k + 1.
      k += 1;
    }
  }
  const bodyParseString = `\u{000A}${bodyString}\u{000A}`;
  // 18. Let sourceString be the string-concatenation of prefix, " anonymous(", P, 0x000A (LINE FEED), ") {", bodyString, and "}".
  const sourceString = `${prefix} anonymous(${P}\u{000A}) {${bodyParseString}}`;
  // 19. Let sourceText be ! UTF16DecodeString(sourceString).
  const sourceText = sourceString;
  // 20. Perform the following substeps in an implementation-dependent order, possibly interleaving parsing and error detection:
  //   a. Let parameters be the result of parsing ! UTF16DecodeString(P), using parameterGoal as the goal symbol. Throw a SyntaxError exception if the parse fails.
  //   b. Let body be the result of parsing ! UTF16DecodeString(bodyString), using goal as the goal symbol. Throw a SyntaxError exception if the parse fails.
  //   c. Let strict be ContainsUseStrict of body.
  //   d. If any static semantics errors are detected for parameters or body, throw a SyntaxError exception. If strict is true, the Early Error rules for UniqueFormalParameters:FormalParameters are applied.
  //   e. If strict is true and IsSimpleParameterList of parameters is false, throw a SyntaxError exception.
  //   f. If any element of the BoundNames of parameters also occurs in the LexicallyDeclaredNames of body, throw a SyntaxError exception.
  //   g. If body Contains SuperCall is true, throw a SyntaxError exception.
  //   h. If parameters Contains SuperCall is true, throw a SyntaxError exception.
  //   i. If body Contains SuperProperty is true, throw a SyntaxError exception.
  //   j. If parameters Contains SuperProperty is true, throw a SyntaxError exception.
  //   k. If kind is generator or asyncGenerator, then
  //     i. If parameters Contains YieldExpression is true, throw a SyntaxError exception.
  //   l. If kind is async or asyncGenerator, then
  //     i. If parameters Contains AwaitExpression is true, throw a SyntaxError exception.
  //   m. If strict is true, then
  //     i. If BoundNames of parameters contains any duplicate elements, throw a SyntaxError exception.
  let parameters;
  let body;
  const scriptId = surroundingAgent.addDynamicParsedSource(surroundingAgent.currentRealmRecord, sourceString);
  {
    const f = wrappedParse({ source: sourceString }, (p) => {
      const r = p.parseExpression();
      p.expect(Token.EOS);
      return r;
    });
    if (Array.isArray(f)) {
      Parser.decorateSyntaxErrorWithScriptId(f[0], scriptId);
      return ThrowCompletion(f[0]);
    }
    __ts_cast__<ParseNode.FunctionExpression | ParseNode.GeneratorExpression | ParseNode.AsyncFunctionExpression | ParseNode.AsyncGeneratorExpression>(f);
    parameters = f.FormalParameters;
    switch (kind) {
      case 'normal':
        body = (f as ParseNode.FunctionExpression).FunctionBody;
        break;
      case 'generator':
        body = (f as ParseNode.GeneratorExpression).GeneratorBody;
        break;
      case 'async':
        body = (f as ParseNode.AsyncFunctionExpression).AsyncBody;
        break;
      case 'asyncGenerator':
        body = (f as ParseNode.AsyncGeneratorExpression).AsyncGeneratorBody;
        break;
      default:
        throw new OutOfRange('kind', kind);
    }
  }
  // 21. Let proto be ? GetPrototypeFromConstructor(newTarget, fallbackProto).
  const proto = Q(yield* GetPrototypeFromConstructor(newTarget, fallbackProto));
  // 23. Let scope be realmF.[[GlobalEnv]].
  const env = currentRealm.GlobalEnv;
  const privateEnv = Value.null;
  // 24. Let F be ! OrdinaryFunctionCreate(proto, sourceText, parameters, body, non-lexical-this, scope, privateEnv).
  const F = X(OrdinaryFunctionCreate(proto, sourceText, parameters, body, 'non-lexical-this', env, privateEnv));
  F.scriptId = scriptId;
  // 25. Perform SetFunctionName(F, "anonymous").
  SetFunctionName(F, Value('anonymous'));
  // 26. If kind is generator, then
  if (kind === 'generator') {
    // a. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
    const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%'));
    // b. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
    X(DefinePropertyOrThrow(F, Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  } else if (kind === 'asyncGenerator') { // 27. Else if kind is asyncGenerator, then
    // a. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
    const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));
    // b. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
    X(DefinePropertyOrThrow(F, Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  } else if (kind === 'normal') { // 28. Else if kind is normal, then perform MakeConstructor(F).
    MakeConstructor(F);
  }
  // 29. NOTE: Functions whose kind is async are not constructible and do not have a [[Construct]] internal method or a "prototype" property.
  // 20. Return F.
  return F;
}
