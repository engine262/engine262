# engine262

An implementation of ECMA-262 in JavaScript

Goals
- 100% Spec Compliance
- Introspection

Non-Goals
- Speed
- Security


### How Completions Work

We run a source transform:

```js
ReturnIfAbrupt(AbstractOp());

// Becomes...

(do {
  const hygenicTemp = a();
  if (hygenicTemp instanceof AbruptCompletion) {
    return _;
  }
  if (hygenicTemp instanceof Completion) {
    hygenicTemp.Value;
  } else {
    hygenicTemp;
  }
});
```

```js
// Let a be ! AbstractOp();
const a = X(AbstractOp());

// Becomes...

const a = do {
  const val = AbstractOp();
  if (val instanceof AbruptCompletion) {
    throw new TypeError();
  }
  if (val instanceof Completion) {
    val.Value;
  } else {
    val;
  }
};

```

