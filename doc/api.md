# engine262 API Documentation

## Realm

### Constructor: new Realm([options])

* `options` {object}
  * `resolveImportedModule` {function}

```js
const realm = new Realm({
  resolveImportedModule(referringModule, specifier) {
    // return a module or return Throw()
  },
});
```

### realm.evaluateScript(sourceText)

* `sourceText` {string} The source text to evaluate.
* Returns: {Completion}

```js
const completion = realm.evaluateScript('1 + 1');

console.log(completion);
// Completion {
//   Type: 'normal',
//   Value: NumberValue { 2 }
// }
```

### realm.createSourceTextModule(specifier, sourceText)

* `specifier` {string} A unique specifier to identify the module.
* `sourceText` {string} The source text of the module.
* Returns: {AbruptCompletion|Module}

Creates a Source Text Module Record representation. If parsing the source text fails, it will return an Abrupt Completion instead of a Module.

```js
let completion = realm.createSourceTextModule('meme.mjs', `
import { a } from 'a.mjs';

print(a);
`);

if (!(completion instanceof AbruptCompletion)) {
  const module = completion;
  completion = module.Instantiate();

  // etc
}
```

### realm.scope(cb)

* `cb` {function}
* Returns: {\*}

Call `cb` with `realm` on the surrounding agent's execution context stack.

## Module

### module.Instantiate()

* Returns: {Completion}

Instantiates this module and the modules it depends on.

```js
const completion = module.Instantiate();

if (completion instanceof AbruptCompletion) {
  // module resolution issue, ambiguous star exports, etc
}
```

### module.Evaluate()

* Returns: {Completion}

```js
const completion = module.Evaluate();

console.log('result of evaluation: ', inspect(completion));
```

### module.GetNamespace()

* Returns: {AbruptCompletion|Object}

Get the namespace object for this module. This can only be called after `module.Instantiate`.

```js
const namespace = module.GetNamespace();
if (namespace instanceof AbruptCompletion) {
  // oops, you probably called it before module.Instantiate()
} else {
  console.log(namespace.OwnPropertyKeys());
}
```

## Value

### Constructor: new Value(value)

* `value` {string|number|function}

Create an engine representation of `value`.

```js
const five = new Value(5);
```

### Value.true

Engine representation of `true`.

### Value.false

Engine representation of `false`.

### Value.undefined

Engine representation of `undefined`.

### Value.null

Engine representation of `null`.

## Throw

`Throw` is a function to quickly create abrupt throw completions.

### Throw(realm, value)

* `realm` {Realm}
* `value` {Value} The value to wrap in a throw completion.

Create a throw completion with `value`.

```js
if (a < 5) {
  return Throw(realm, new Value('throwing strings is rude but here we are'));
}
```

### Throw(realm, constructorName[, message])

* `realm` {Relam}
* `constructorName` {string} The name of a well known error constructor. `Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, `URIError`.
* `message` {string} The message to pass to the error constructor.

Create a new throw completion from a well-known error constructor.

```js
if (a < 5) {
  return Throw(realm, 'TypeError', 'a must be greater than 5');
}
```

---

## inspect(value[, realm])

* `value` {Value|Completion} The value to be inspected.
* `realm` {Realm} If `inspect` is called outside of engine evaluation, a realm must be passed.

Create a string representation of a value for debugging.

```js
const value = realm.evaluateScript('const a = 1; ({ a });');

console.log('created this object: ', inspect(value, realm));
// Logs "created this object: { a: 1 }""
```
