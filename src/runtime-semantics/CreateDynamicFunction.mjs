import {
  Assert,
  DefinePropertyOrThrow,
  GetPrototypeFromConstructor,
  MakeConstructor,
  OrdinaryFunctionCreate,
  OrdinaryObjectCreate,
  SetFunctionName,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import {
  HostEnsureCanCompileStrings,
  surroundingAgent,
} from '../engine.mjs';
import { wrappedParse } from '../parse.mjs';
import { Token } from '../parser/tokens.mjs';
import { Descriptor, Type, Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// #table-dynamic-function-sourcetext-prefixes
const DynamicFunctionSourceTextPrefixes = {
  'normal': 'function',
  'generator': 'function*',
  'async': 'async function',
  'asyncGenerator': 'async function*',
};

export function CreateDynamicFunction(constructor, newTarget, kind, args) {
  // 1. Assert: The execution context stack has at least two elements.
  Assert(surroundingAgent.executionContextStack.length >= 2);
  // 2. Let callerContext be the second to top element of the execution context stack.
  const callerContext = surroundingAgent.executionContextStack[surroundingAgent.executionContextStack.length - 2];
  // 3. Let callerRealm be callerContext's Realm.
  const callerRealm = callerContext.Realm;
  // 4. Let calleeRealm be the current Realm Record.
  const calleeRealm = surroundingAgent.currentRealmRecord;
  // 5. Perform ? HostEnsureCanCompileStrings(callerRealm, calleeRealm).
  Q(HostEnsureCanCompileStrings(callerRealm, calleeRealm));
  // 6. If newTarget is undefined, set newTarget to constructor.
  if (Type(newTarget) === 'Undefined') {
    newTarget = constructor;
  }
  // 7. If kind is normal, then
  let fallbackProto;
  if (kind === 'normal') {
    // a. Let goal be the grammar symbol FunctionBody[~Yield, ~Await].
    // b. Let parameterGoal be the grammar symbol FormalParameters[~Yield, ~Await].
    // c. Let fallbackProto be "%Function.prototype%".
    fallbackProto = '%Function.prototype%';
  } else if (kind === 'generator') { // 8. Else if kind is generator, then
    // a. Let goal be the grammar symbol GeneratorBody.
    // b. Let parameterGoal be the grammar symbol FormalParameters[+Yield, ~Await].
    // c. Let fallbackProto be "%GeneratorFunction.prototype%".
    fallbackProto = '%GeneratorFunction.prototype%';
  } else if (kind === 'async') { // 9. Else if kind is async, then
    // a. Let goal be the grammar symbol AsyncFunctionBody.
    // b. Let parameterGoal be the grammar symbol FormalParameters[~Yield, +Await].
    // c. Let fallbackProto be "%AsyncFunction.prototype%".
    fallbackProto = '%AsyncFunction.prototype%';
  } else { // 10. Else,
    // a. Assert: kind is asyncGenerator.
    Assert(kind === 'asyncGenerator');
    // b. Let goal be the grammar symbol AsyncGeneratorBody.
    // c. Let parameterGoal be the grammar symbol FormalParameters[+Yield, +Await].
    // d. Let fallbackProto be "%AsyncGeneratorFunction.prototype%".
    fallbackProto = '%AsyncGeneratorFunction.prototype%';
  }
  // 11. Let argCount be the number of elements in args.
  const argCount = args.length;
  // 12. Let P be the empty String.
  let P = '';
  // 13. If argCount = 0, let bodyArg be the empty String.
  let bodyArg;
  if (argCount === 0) {
    bodyArg = new Value('');
  } else if (argCount === 1) { // 14. Else if argCount = 1, let bodyArg be args[0].
    bodyArg = args[0];
  } else { // 15. Else,
    // a. Assert: argCount > 1.
    Assert(argCount > 1);
    // b. Let firstArg be args[0].
    const firstArg = args[0];
    // c. Set P to ? ToString(firstArg).
    P = Q(ToString(firstArg)).stringValue();
    // d. Let k be 1.
    let k = 1;
    // e. Repeat, while k < argCount - 1
    while (k < argCount - 1) {
      // i. Let nextArg be args[k].
      const nextArg = args[k];
      // ii. Let nextArgString be ? ToString(nextArg).
      const nextArgString = Q(ToString(nextArg));
      // iii. Set P to the string-concatenation of the previous value of P, "," (a comma), and nextArgString.
      P = `${P},${nextArgString.stringValue()}`;
      // iv. Set k to k + 1.
      k += 1;
    }
    // f. Let bodyArg be args[k].
    bodyArg = args[k];
  }
  // 16. Let bodyString be the string-concatenation of 0x000A (LINE FEED), ? ToString(bodyArg), and 0x000A (LINE FEED).
  const bodyString = `\u{000A}${Q(ToString(bodyArg)).stringValue()}\u{000A}`;
  // 17. Let prefix be the prefix associated with kind in Table 48.
  const prefix = DynamicFunctionSourceTextPrefixes[kind];
  // 18. Let sourceString be the string-concatenation of prefix, " anonymous(", P, 0x000A (LINE FEED), ") {", bodyString, and "}".
  const sourceString = `${prefix} anonymous(${P}\u{000A}) {${bodyString}}`;
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
  {
    const f = wrappedParse({ source: sourceString }, (p) => {
      const r = p.parseExpression();
      p.expect(Token.EOS);
      return r;
    });
    if (Array.isArray(f)) {
      return surroundingAgent.Throw(f[0]);
    }
    parameters = f.FormalParameters;
    switch (kind) {
      case 'normal':
        body = f.FunctionBody;
        break;
      case 'generator':
        body = f.GeneratorBody;
        break;
      case 'async':
        body = f.AsyncFunctionBody;
        break;
      case 'asyncGenerator':
        body = f.AsyncGeneratorBody;
        break;
      default:
        throw new OutOfRange('kind', kind);
    }
  }
  // 21. Let proto be ? GetPrototypeFromConstructor(newTarget, fallbackProto).
  const proto = Q(GetPrototypeFromConstructor(newTarget, fallbackProto));
  // 22. Let realmF be the current Realm Record.
  const realmF = surroundingAgent.currentRealmRecord;
  // 23. Let scope be realmF.[[GlobalEnv]].
  const scope = realmF.GlobalEnv;
  // 24. Let F be ! OrdinaryFunctionCreate(proto, sourceText, parameters, body, non-lexical-this, scope, null).
  const F = X(OrdinaryFunctionCreate(proto, sourceText, parameters, body, 'non-lexical-this', scope, Value.null));
  // 25. Perform SetFunctionName(F, "anonymous").
  SetFunctionName(F, new Value('anonymous'));
  // 26. If kind is generator, then
  if (kind === 'generator') {
    // a. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
    const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%'));
    // b. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
    DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    }));
  } else if (kind === 'asyncGenerator') { // 27. Else if kind is asyncGenerator, then
    // a. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
    const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));
    // b. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
    DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    }));
  } else if (kind === 'normal') { // 28. Else if kind is normal, then perform MakeConstructor(F).
    MakeConstructor(F);
  }
  // 29. NOTE: Functions whose kind is async are not constructible and do not have a [[Construct]] internal method or a "prototype" property.
  // 20. Return F.
  return F;
}
