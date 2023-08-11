import { isArray } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import type { JSStringValue } from '../value.mjs';
import { StringValue } from './all.mjs';

/** https://tc39.es/ecma262/#sec-static-semantics-privateboundidentifiers */
export function PrivateBoundIdentifiers(node: ParseNode | readonly ParseNode[]): JSStringValue[] {
  if (isArray(node)) {
    return node.flatMap((n) => PrivateBoundIdentifiers(n));
  }
  switch (node.type) {
    case 'PrivateIdentifier':
      return [StringValue(node)];
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'AsyncMethod':
    case 'AsyncGeneratorMethod':
    case 'FieldDefinition':
      return PrivateBoundIdentifiers(node.ClassElementName);
    default:
      return [];
  }
}
