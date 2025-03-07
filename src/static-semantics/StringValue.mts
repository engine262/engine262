import { Value } from '../value.mts';
import { OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

export function StringValue(node: ParseNode) {
  switch (node.type) {
    case 'IdentifierName':
    case 'BindingIdentifier':
    case 'IdentifierReference':
    case 'LabelIdentifier':
      return Value(node.name);
    case 'PrivateIdentifier':
      return Value(`#${node.name}`);
    case 'StringLiteral':
      return Value(node.value);
    default:
      throw new OutOfRange('StringValue', node);
  }
}
