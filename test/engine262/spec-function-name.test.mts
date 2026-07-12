import { expect, test } from 'vitest';
import { specFunctionName } from '../../src/utils/spec-function-name.mts';

test.each([
  ['Some_val', 'Some.val'],
  ['SomeConstructor', 'Some'],
  ['SomeProto_method', 'Some.prototype.method'],
  ['SomeProto_val_getter', 'get Some.prototype.val'],
  ['SomeProto_val_setter', 'set Some.prototype.val'],
  ['AbstractModuleSourceProto_AtAt_toStringTag_getter', 'get AbstractModuleSource.prototype[Symbol.toStringTag]'],
  ['Some_AtAt_iterator', 'Some[Symbol.iterator]'],
])('%s is formatted as %s', (name, expected) => {
  expect(specFunctionName(name)).toBe(expected);
});
