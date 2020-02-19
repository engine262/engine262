import { Token, isKeyword, isReservedWordStrict } from './tokens.mjs';
import { BaseParser } from './BaseParser.mjs';

export class IdentifierParser extends BaseParser {
  // IdentifierName but not ReservedWord
  parseIdentifier() {
    const node = this.startNode();
    node.name = this.expect(Token.IDENTIFIER).value;
    return this.finishNode(node, 'Identifier');
  }

  // IdentifierName
  parseIdentifierName() {
    const node = this.startNode();
    const p = this.peek();
    if (p.type === Token.IDENTIFIER
        || p.type === Token.ESCAPED_KEYWORD
        || isKeyword(p.type)) {
      node.name = this.next().value;
    } else {
      this.unexpected();
    }
    return this.finishNode(node, 'IdentifierName');
  }

  // BindingIdentifier :
  //   Identifier
  //   `yield`
  //   `await`
  parseBindingIdentifier() {
    const node = this.startNode();
    const token = this.next();
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.value;
        break;
      case Token.ESCAPED_KEYWORD:
        node.name = token.value;
        break;
      case Token.YIELD:
        node.name = 'yield';
        break;
      case Token.AWAIT:
        node.name = 'await';
        break;
      case Token.LET:
        node.name = 'let';
        break;
      default:
        this.unexpected(token);
    }
    if (node.name === 'yield' && this.scope.hasYield()) {
      this.raiseEarly('UnexpectedToken', token);
    }
    if (node.name === 'await' && this.scope.hasAwait()) {
      this.raiseEarly('UnexpectedToken', token);
    }
    if (this.isStrictMode()) {
      if (isReservedWordStrict(node.name)) {
        this.raiseEarly('UnexpectedToken', token);
      }
      if (node.name === 'eval' || node.name === 'arguments') {
        this.raiseEarly('UnexpectedToken', token);
      }
    }
    return this.finishNode(node, 'BindingIdentifier');
  }

  // IdentifierReference :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  parseIdentifierReference() {
    const node = this.startNode();
    const token = this.next();
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.value;
        break;
      case Token.ESCAPED_KEYWORD:
        node.name = token.value;
        break;
      case Token.YIELD:
        if (this.scope.hasYield()) {
          this.unexpected(token);
        }
        node.name = 'yield';
        break;
      case Token.AWAIT:
        if (this.scope.hasAwait()) {
          this.unexpected(token);
        }
        node.name = 'await';
        break;
      case Token.LET:
        node.name = 'let';
        break;
      default:
        this.unexpected(token);
    }
    if (node.name === 'yield' && this.scope.hasYield()) {
      this.raiseEarly('UnexpectedToken', token);
    }
    if (node.name === 'await' && this.scope.hasAwait()) {
      this.raiseEarly('UnexpectedToken', token);
    }
    if (this.isStrictMode() && isReservedWordStrict(node.name)) {
      this.raiseEarly('UnexpectedToken', token);
    }
    return this.finishNode(node, 'IdentifierReference');
  }

  // LabelIdentifier :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  parseLabelIdentifier() {
    const node = this.parseIdentifierReference();
    node.type = 'LabelIdentifier';
    return node;
  }
}
