import { Lexer } from './Lexer.mjs';
import type { ParseNode } from './ParseNode.mjs';
import type { Scope } from './Scope.mjs';

export abstract class BaseParser extends Lexer {
  abstract scope: Scope;
  abstract startNode(inheritStart?: ParseNode): ParseNode;
  abstract startNode<T extends ParseNode>(inheritStart?: ParseNode): ParseNode.Unfinished<T>;
  abstract finishNode<T extends ParseNode.Unfinished<ParseNode>, K extends T['type']>(node: T, type: K): ParseNode.Finished<T, K>;
  abstract finishNode<T extends ParseNode>(node: T, type: string): T;

  /**
   * Repurpose a ParseNode of one type as a ParseNode of another type.
   */
  protected repurpose<K extends string>(node: ParseNode, type: K): ParseNode & { type: K } {
    node.type = type;
    return node as ParseNode & { type: K };
  }
}
