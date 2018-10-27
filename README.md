# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection

Non-Goals
- Speed

Join us on [#engine262 on freenode](https://webchat.freenode.net/?channels=engine262)

### Using engine262

`$ npm run build`

```js
'use strict';

const { Realm, initializeAgent } = require('engine262');

initializeAgent({
  // onDebugger() {},
  // ensureCanCompileStrings() {},
  // promiseRejectionTracker() {},
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
```

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

### Related Projects

- https://github.com/facebook/prepack
- https://github.com/mozilla/narcissus
- https://github.com/NeilFraser/JS-Interpreter
- https://github.com/metaes/metaes
- https://github.com/Siubaak/sval
