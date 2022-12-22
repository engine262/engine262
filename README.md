# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection
- Ease of modification

Non-Goals
- Speed at the expense of any of the goals

This project is bound by a [Code of Conduct][COC].

Join us in `#engine262:matrix.org`.

## Why this exists

While helping develop new features for JavaScript, I've found that one of the
most useful methods of finding what works and what doesn't is being able to
actually run code using the new feature. [Babel][] is fantastic for this, but
sometimes features just can't be nicely represented with it. Similarly,
implementing a feature in one of the engines is a large undertaking, involving
long compile times and annoying bugs with the optimizing compilers.

engine262 is a tool to allow JavaScript developers to have a sandbox where new
features can be quickly prototyped and explored. As an example, adding
[do expressions][] to this engine is as simple as the following diff:

```diff
--- a/src/evaluator.mjs
+++ b/src/evaluator.mjs
@@ -232,6 +232,8 @@ export function* Evaluate(node) {
     case 'GeneratorBody':
     case 'AsyncGeneratorBody':
       return yield* Evaluate_AnyFunctionBody(node);
+    case 'DoExpression':
+      return yield* Evaluate_Block(node.Block);
     default:
       throw new OutOfRange('Evaluate', node);
   }
--- a/src/parser/ExpressionParser.mjs
+++ b/src/parser/ExpressionParser.mjs
@@ -579,6 +579,12 @@ export class ExpressionParser extends FunctionParser {
         return this.parseRegularExpressionLiteral();
       case Token.LPAREN:
         return this.parseParenthesizedExpression();
+      case Token.DO: {
+        const node = this.startNode();
+        this.next();
+        node.Block = this.parseBlock();
+        return this.finishNode(node, 'DoExpression');
+      }
       default:
         return this.unexpected();
     }
```

This simplicity applies to many other proposals, such as [optional chaining][],
[pattern matching][], [the pipeline operator][], and more. This engine has also
been used to find bugs in ECMA-262 and [test262][], the test suite for
conforming JavaScript implementations.

## Requirements

To run engine262 itself, a engine with support for recent ECMAScript features
is needed. Additionally, the CLI (`bin/engine262.js`) and test262 runner
(`test/test262/test262.js`) require a recent version of Node.js.

## Using engine262

Use it online: https://engine262.js.org

You can install the latest engine262 build from [GitHub Packages][].

If you install it globally, you can use the CLI like so:

`$ engine262`

Or, you can install it locally and use the API:

```js
'use strict';

const {
  Agent,
  setSurroundingAgent,
  ManagedRealm,
  Value,

  CreateDataProperty,

  inspect,
} = require('engine262');

const agent = new Agent({
  // onDebugger() {},
  // ensureCanCompileStrings() {},
  // hasSourceTextAvailable() {},
  // loadImportedModule() {},
  // onNodeEvaluation() {},
  // features: [],
});
setSurroundingAgent(agent);

const realm = new ManagedRealm({
  // promiseRejectionTracker() {},
  // getImportMetaProperties() {},
  // finalizeImportMeta() {},
  // randomSeed() {},
});

realm.scope(() => {
  // Add print function from host
  const print = new Value((args) => {
    console.log(...args.map((tmp) => inspect(tmp)));
    return Value.undefined;
  });
  CreateDataProperty(realm.GlobalObject, new Value('print'), print);
});

realm.evaluateScript(`
'use strict';

async function* numbers() {
  let i = 0;
  while (true) {
    const n = await Promise.resolve(i++);
    yield n;
  }
}

(async () => {
  for await (const item of numbers()) {
    print(item);
  }
})();
`);

// a stream of numbers fills your console. it fills you with determination.
```

## Testing engine262

This project can be run against [test262][], which is particularly useful
for developing new features and/or tests:
```sh
$ # build engine262
$ npm build

$ # update local test262 in test/test262/test262
$ git submodule update --init --recursive

$ # update local test262 to a pull request
$ pushd test/test262/test262
$ git fetch origin refs/pull/$PR_NUMBER/head && git checkout FETCH_HEAD
$ popd

$ # run specific tests
$ npm run test:test262 built-ins/AsyncGenerator*

$ # run all tests
$ npm run test:test262
```
The output will indicate counts for total tests, passing tests, failing tests, and skipped tests.

## Related Projects

Many people and organizations have attempted to write a JavaScript interpreter
in JavaScript much like engine262, with different goals. Some of them are
included here for reference, though engine262 is not based on any of them.

- https://github.com/facebook/prepack
- https://github.com/mozilla/narcissus
- https://github.com/NeilFraser/JS-Interpreter
- https://github.com/metaes/metaes
- https://github.com/Siubaak/sval

[Babel]: https://babeljs.io/
[COC]: https://github.com/engine262/engine262/blob/master/CODE_OF_CONDUCT.md
[do expressions]: https://github.com/tc39/proposal-do-expressions
[optional chaining]: https://github.com/tc39/proposal-optional-chaining
[pattern matching]: https://github.com/tc39/proposal-pattern-matching
[test262]: https://github.com/tc39/test262
[the pipeline operator]: https://github.com/tc39/proposal-pipeline-operator
[GitHub Packages]: https://github.com/engine262/engine262/packages
