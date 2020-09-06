# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection
- Ease of modification

Non-Goals
- Speed at the expense of any of the goals

This project is bound by a [Code of Conduct][COC].

Join us on [#engine262 on freenode][irc] ([web][irc-webchat]).

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
been used to find bugs in ECMA-262 and test262, the test suite for
conforming JavaScript implementations.

## Requirements

To run engine262 itself, a engine with support for recent ECMAScript features
is needed. Additionally, the CLI (`bin/engine262.js`) and test262 runner
(`test/test262.js`) require a recent version of Node.js.

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
  // onNodeEvaluation() {},
  // features: [],
});
setSurroundingAgent(agent);

const realm = new ManagedRealm({
  // promiseRejectionTracker() {},
  // resolveImportedModule() {},
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
[irc]: ircs://chat.freenode.net:6697/engine262
[irc-webchat]: https://webchat.freenode.net/?channels=engine262
[optional chaining]: https://github.com/tc39/proposal-optional-chaining
[pattern matching]: https://github.com/tc39/proposal-pattern-matching
[the pipeline operator]: https://github.com/tc39/proposal-pipeline-operator
[GitHub Packages]: https://github.com/engine262/engine262/packages
