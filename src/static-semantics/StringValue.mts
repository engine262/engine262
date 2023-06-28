import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

export function StringValue(node: ParseNode) {
  switch (node.type) {
    case 'IdentifierName':
    case 'BindingIdentifier':
    case 'IdentifierReference':
    case 'LabelIdentifier':
      return Value((node as ParseNode.IdentifierName | ParseNode.BindingIdentifier | ParseNode.IdentifierReference | ParseNode.LabelIdentifier).name);
    case 'PrivateIdentifier':
      return Value(`#${(node as ParseNode.PrivateIdentifier).name}`);
    case 'StringLiteral':
      return Value((node as ParseNode.StringLiteral).value);
    default:
      throw new OutOfRange('StringValue', node);
  }
}
