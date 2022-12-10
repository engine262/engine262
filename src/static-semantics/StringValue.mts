// @ts-nocheck
import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

export function StringValue(node) {
  switch (node.type) {
    case 'Identifier':
    case 'IdentifierName':
    case 'BindingIdentifier':
    case 'IdentifierReference':
    case 'LabelIdentifier':
      return Value.of(node.name);
    case 'PrivateIdentifier':
      return Value.of(`#${node.name}`);
    case 'StringLiteral':
      return Value.of(node.value);
    default:
      throw new OutOfRange('StringValue', node);
  }
}
