import { Token, isKeyword } from './tokens.mjs';
import { Lexer } from './Lexer.mjs';

export class IdentifierParser extends Lexer {
  parseIdentifier(allowKeywords) {
    const node = this.startNode();
    const token = this.next();
    if (allowKeywords && isKeyword(token.type)) {
      node.name = token.value;
    } else if (token.type !== Token.IDENTIFIER) {
      this.error(`Unexpected token: ${token.name}`);
    } else {
      node.name = token.value;
    }
    return this.finishNode(node, 'Identifier');
  }

  parseBindingIdentifier() {
    const node = this.startNode();
    const token = this.next();
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.value;
        break;
      case Token.YIELD:
        node.name = 'yield';
        break;
      case Token.AWAIT:
        node.name = 'await';
        break;
      default:
        this.error(`Expected BindingIdentifier, got ${token.name}`);
    }
    return this.finishNode(node, 'Identifier');
  }
}
