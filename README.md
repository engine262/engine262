# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection

Non-Goals
- Speed

Join us on [#engine262 on freenode][].

### Why this exists

While helping develop new features for JavaScript, I've found that one of the
most useful methods of finding what works and what doesn't is being able to
actually run code using the new feature. [Babel][] is fantastic for this, but
sometimes features just can't be nicely represented with it.

The feature I wanted to test, and the reason I started building this engine,
was [do expressions][]. At TC39, we were discussing the behaviour of keywords
such as `return` and `break` inside do expressions, which was concerning
because you could end up with code like
`while (1) { while (do { break; }) {} }`, which was a very confusing situation
to be in. V8 had an initial implementation of do expression, but it segfaulted
when given this code, as `break` wasn't expected to occur while evaluating the
initializer of the loop. It would not be simple to figure out all the intricate
behaviours, at which point it would be quite annoying if something were to be
changed.

Similarly, the do expression transform for Babel didn't allow keywords such as
`return`, `continue`, and `break`, so the behaviour we were investigating was
unable to be tested with it.

Cut to several months later, when this engine was finally mature enough to run
some code. The diff for adding do expressions, complete with all their proposed
behaviour, was as follows:

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

`$ node repl.js`

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
