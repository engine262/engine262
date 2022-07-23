import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

export function StringValue(node) {
  switch (node.type) {
    case 'Identifier':
    case 'IdentifierName':
    case 'BindingIdentifier':
    case 'IdentifierReference':
    case 'LabelIdentifier':
      return new Value(node.name);
    case 'PrivateIdentifier':
      return new Value(`#${node.name}`);
    case 'StringLiteral':
      return new Value(node.value);
    default:
      throw new OutOfRange('StringValue', node);
  }
}
