# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection
- Ease of modification

Non-Goals
- Speed

Join us on [#engine262 on freenode][].

### Why this exists

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
@@ -416,6 +416,9 @@ function* Inner_Evaluate_Expression(Expression) {
     case isExpressionWithComma(Expression):
       return yield* Evaluate_ExpressionWithComma(Expression);

+    case Expression.type === 'DoExpression':
+      return yield* Evaluate_BlockStatement(Expression.body);
+
     default:
       throw new OutOfRange('Evaluate_Expression', Expression);
   }
--- a/src/parse.mjs
+++ b/src/parse.mjs
@@ -11,6 +11,17 @@ const Parser = acorn.Parser.extend((P) => class Parse262 extends P {
     node.source = () => this.input.slice(node.start, node.end);
     return ret;
   }
+
+  parseExprAtom(refDestructuringErrors) {
+    if (this.value === 'do') {
+      // DoExpression : `do` Block
+      this.next();
+      const node = this.startNode();
+      node.body = this.parseBlock();
+      return this.finishNode(node, 'DoExpression');
+    }
+    return super.parseExprAtom(refDestructuringErrors);
+  }
 });
```

This simplicity applies to many other proposals, such as [optional chaining][],
[pattern matching][], [the pipeline operator][], and more. This engine has also
been used to find bugs in ECMA-262 and test262, the test suite for
conforming JavaScript implementations.

### Using engine262

`$ npm run build`

`$ node bin/engine262.js`

Or, use the API

```js
'use strict';

const { Realm, initializeAgent } = require('engine262');

initializeAgent({
  // onDebugger() {},
  // ensureCanCompileStrings() {},
  // promiseRejectionTracker() {},
  // hasSourceTextAvailable() {},
})

const realm = new Realm();

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

### Related Projects

- https://github.com/facebook/prepack
- https://github.com/mozilla/narcissus
- https://github.com/NeilFraser/JS-Interpreter
- https://github.com/metaes/metaes
- https://github.com/Siubaak/sval

[#engine262 on freenode]: https://webchat.freenode.net/?channels=engine262
[Babel]: https://babeljs.io/
[do expressions]: https://github.com/tc39/proposal-do-expressions
[optional chaining]: https://github.com/tc39/proposal-optional-chaining
[pattern matching]: https://github.com/tc39/proposal-pattern-matching
[the pipeline operator]: https://github.com/tc39/proposal-pipeline-operator
