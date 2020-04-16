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

const { Agent, Realm } = require('engine262');

const agent = new Agent({
  // onDebugger() {},
  // ensureCanCompileStrings() {},
  // hasSourceTextAvailable() {},
  // onNodeEvaluation() {},
  // features: [],
});
agent.enter();

const realm = new Realm({
  // promiseRejectionTracker() {},
  // resolveImportedModule() {},
  // getImportMetaProperties() {},
  // finalizeImportMeta() {},
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
[nodejs/node#25221]: https://github.com/nodejs/node/issues/25221
[optional chaining]: https://github.com/tc39/proposal-optional-chaining
[pattern matching]: https://github.com/tc39/proposal-pattern-matching
[the pipeline operator]: https://github.com/tc39/proposal-pipeline-operator
[GitHub Packages]: https://github.com/engine262/engine262/packages

## Contributors

### Code Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/engine262/engine262/graphs/contributors"><img src="https://opencollective.com/engine262/contributors.svg?width=890&button=false" /></a>

### Financial Contributors

Become a financial contributor and help us sustain our community. [[Contribute](https://opencollective.com/engine262/contribute)]

#### Individuals

<a href="https://opencollective.com/engine262"><img src="https://opencollective.com/engine262/individuals.svg?width=890"></a>

#### Organizations

Support this project with your organization. Your logo will show up here with a link to your website. [[Contribute](https://opencollective.com/engine262/contribute)]

<a href="https://opencollective.com/engine262/organization/0/website"><img src="https://opencollective.com/engine262/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/1/website"><img src="https://opencollective.com/engine262/organization/1/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/2/website"><img src="https://opencollective.com/engine262/organization/2/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/3/website"><img src="https://opencollective.com/engine262/organization/3/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/4/website"><img src="https://opencollective.com/engine262/organization/4/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/5/website"><img src="https://opencollective.com/engine262/organization/5/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/6/website"><img src="https://opencollective.com/engine262/organization/6/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/7/website"><img src="https://opencollective.com/engine262/organization/7/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/8/website"><img src="https://opencollective.com/engine262/organization/8/avatar.svg"></a>
<a href="https://opencollective.com/engine262/organization/9/website"><img src="https://opencollective.com/engine262/organization/9/avatar.svg"></a>
