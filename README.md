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

engine262 is a tool to allow JavaScript developers to have a playground where new
features can be quickly prototyped and explored. As an example, adding
[do expressions][] to this engine is as simple as the following diff:

```diff
--- a/src/evaluator.mts
+++ b/src/evaluator.mts
@@ -232,6 +232,8 @@ export function* Evaluate(node) {
     case 'GeneratorBody':
     case 'AsyncGeneratorBody':
       return yield* Evaluate_AnyFunctionBody(node);
+    case 'DoExpression':
+      return yield* Evaluate_Block(node.Block);
     default:
       throw new OutOfRange('Evaluate', node);
   }
--- a/src/parser/ExpressionParser.mts
+++ b/src/parser/ExpressionParser.mts
@@ -579,6 +579,12 @@ export class ExpressionParser extends FunctionParser {
         return this.parseRegularExpressionLiteral();
       case Token.LPAREN:
         return this.parseParenthesizedExpression();
+      case Token.DO: {
+        const node = this.startNode<ParseNode.DoExpression>();
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
(`test/test262/test262.mts`) require a recent version of Node.js.

## Using engine262

You can install it from npm.

```shell
npm install @engine262/engine262
yarn install @engine262/engine262
pnpm install @engine262/engine262
```

If you install it globally, you can use the CLI like so:

`$ engine262`

### engine262 playground

[Classic playground](https://engine262.js.org) and [Chrome Devtools style playground](https://engine262.js.org/devtools.html)

### engine262 CLI

#### --module/-m

Evaluate the file as a module.

#### --eval \<string> / -e \<string>

Evaluate the given string and exit.

#### --features=\<featureA,featureB> / --features=all

Run `engine262 --list-features` to see all ECMAScript features can be switched.

#### --no-test262

Do not expose `$` and `$262` global variable for test262 test suite.

#### --no-inspector

Do not start an inspector.

By default engine262 will start an inspector on `ws://localhost:9229/` (like Node.js with `--inspector`). See the [Node.js guide](https://nodejs.org/en/learn/getting-started/debugging#inspector-clients) for connecting.

#### --no-preview

Do not enable the preview feature in the inspector.

### engine262 API

See the [example](https://github.com/engine262/engine262/blob/main/lib-src/node/example.mts).

## Developing engine262

`npm run build` and `npm run watch` will build and watch the build.

`npm run test:test262` will run the [test262][] test suite. Run `npm run test:test262 -- --help` to see the test runner options.

`npm start` start the engine262 CLI.

`npm run inspector` start the website (debugging engine262 mainly happens here).

## Related Projects

Many people and organizations have attempted to write a JavaScript interpreter
in JavaScript much like engine262, with different goals. Some of them are
included here for reference, though engine262 is not based on any of them.

- <https://github.com/NeilFraser/JS-Interpreter>
- <https://github.com/metaes/metaes>
- <https://github.com/Siubaak/sval>

[Babel]: https://babeljs.io/
[COC]: https://github.com/engine262/engine262/blob/master/CODE_OF_CONDUCT.md
[do expressions]: https://github.com/tc39/proposal-do-expressions
[optional chaining]: https://github.com/tc39/proposal-optional-chaining
[pattern matching]: https://github.com/tc39/proposal-pattern-matching
[test262]: https://github.com/tc39/test262
[the pipeline operator]: https://github.com/tc39/proposal-pipeline-operator
[NPM]: https://npmjs.com/@engine262/engine262
