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
// ReturnIfAbrupt(AbstractOp()).
ReturnIfAbrupt(AbstractOp());

// ... or equivalently ...

// Perform ? AbstractOp().
Q(AbstractOp());

// Becomes...

{
  const hygenicTemp = AbstractOp();
  if (hygenicTemp instanceof AbruptCompletion) {
    return hygenicTemp;
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

const result = do {
  const hygenicTemp = AbstractOp();
  if (hygenicTemp instanceof AbruptCompletion) {
    return hygenicTemp;
  }
  if (hygenicTemp instanceof Completion) {
    hygenicTemp.Value;
  } else {
    hygenicTemp;
  }
};
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
