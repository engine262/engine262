import { Token, isKeyword } from './tokens.mjs';
import { BaseParser } from './BaseParser.mjs';

export class IdentifierParser extends BaseParser {
  parseIdentifierInternal(allowKeywords) {
    const node = this.startNode();
    const token = this.next();
    if (allowKeywords && isKeyword(token.type)) {
      if ((token.value === 'yield' || token.value === 'await') && this.isStrictMode()) {
        this.unexpected(token);
      }
      node.name = token.value;
    } else if (token.type !== Token.IDENTIFIER) {
      this.unexpected(token);
    } else {
      node.name = token.value;
    }
    return this.finishNode(node, allowKeywords ? 'IdentifierName' : 'Identifier');
  }

  parseIdentifier() {
    return this.parseIdentifierInternal(false);
  }

  parseIdentifierName() {
    return this.parseIdentifierInternal(true);
  }

  parseBindingIdentifier() {
    const node = this.startNode();
    const token = this.next();
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.value;
        break;
      case Token.YIELD:
        if (this.isStrictMode()) {
          this.unexpected(token);
        }
        node.name = 'yield';
        break;
      case Token.AWAIT:
        if (this.isStrictMode()) {
          this.unexpected(token);
        }
        node.name = 'await';
        break;
      default:
        this.unexpected(token);
    }
    return this.finishNode(node, 'BindingIdentifier');
  }

  parseIdentifierReference() {
    const node = this.startNode();
    const token = this.next();
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.value;
        break;
      case Token.YIELD:
        if (this.isStrictMode()) {
          this.unexpected(token);
        }
        node.name = 'yield';
        break;
      case Token.AWAIT:
        if (this.isStrictMode()) {
          this.unexpected(token);
        }
        node.name = 'await';
        break;
      default:
        this.unexpected(token);
    }
    return this.finishNode(node, 'IdentifierReference');
  }
}
