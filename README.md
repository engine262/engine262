# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection

Non-Goals
- Speed
- Security

### Using engine262

`$ npm run build`

```js
import { Realm } from './lib/api.mjs';

const realm = new Realm({
  // onDebugger() {},
  // ensureCanCompileStrings() {},
});

realm.evaluateScript(`
'use strict';

print(1 + 1); // prints "2" to the console
`);
```

`$ node --experimental-modules yourfile.mjs`

### How Completions Work

We run a source transform:

```js
// ReturnIfAbrupt(AbstractOp()).
ReturnIfAbrupt(AbstractOp());

// ... or equivalently ...

// Perform ? AbstractOp().
Q(AbstractOp());

// Becomes...

{
  const hygienicTemp = AbstractOp();
  if (hygienicTemp instanceof AbruptCompletion) {
    return hygienicTemp;
  }
}
```

```js
// Let result be ReturnIfAbrupt(AbstractOp()).
const result = ReturnIfAbrupt(AbstractOp());

// ... or equivalently ...

// Let result be ? AbstractOp().
const result = Q(AbstractOp());

// Becomes...

let result = AbstractOp();
if (result instanceof AbruptCompletion) {
  return result;
}
if (result instanceof Completion) {
  result = result.Value;
}
```

```js
// Let a be ! AbstractOp();
const a = X(AbstractOp());

// Becomes...

let a = AbstractOp();
Assert(!(a instanceof AbruptCompletion));
if (a instanceof Completion) {
  a = a.Value;
}
```
