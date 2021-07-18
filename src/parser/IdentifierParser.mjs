import {
  Token,
  isKeyword,
  isReservedWordStrict,
  isKeywordRaw,
} from './tokens.mjs';
import { BaseParser } from './BaseParser.mjs';

export class IdentifierParser extends BaseParser {
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
        for (let i = 0; i < this.scope.arrowInfoStack.length; i += 1) {
          const arrowInfo = this.scope.arrowInfoStack[i];
          if (arrowInfo.isAsync) {
            arrowInfo.awaitIdentifiers.push(node);
            break;
          }
        }
        break;
      default:
        this.unexpected(token);
    }
    if (node.name === 'yield' && (this.scope.hasYield() || this.scope.isModule())) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (node.name === 'await' && (this.scope.hasAwait() || this.scope.isModule())) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (this.isStrictMode()) {
      if (isReservedWordStrict(node.name)) {
        this.raiseEarly('UnexpectedReservedWordStrict', token);
      }
      if (node.name === 'eval' || node.name === 'arguments') {
        this.raiseEarly('UnexpectedEvalOrArguments', token);
      }
    }
    if (node.name !== 'yield'
        && node.name !== 'await'
        && isKeywordRaw(node.name)) {
      this.raiseEarly('UnexpectedToken', token);
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
    node.escaped = token.escaped;
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
        for (let i = 0; i < this.scope.arrowInfoStack.length; i += 1) {
          const arrowInfo = this.scope.arrowInfoStack[i];
          if (arrowInfo.isAsync) {
            arrowInfo.awaitIdentifiers.push(node);
            break;
          }
        }
        node.name = 'await';
        break;
      default:
        this.unexpected(token);
    }
    this.validateIdentifierReference(node.name, token);
    return this.finishNode(node, 'IdentifierReference');
  }

  validateIdentifierReference(name, token) {
    if (name === 'yield' && (this.scope.hasYield() || this.scope.isModule())) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (name === 'await' && (this.scope.hasAwait() || this.scope.isModule())) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (this.isStrictMode() && isReservedWordStrict(name)) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (name !== 'yield' && name !== 'await' && isKeywordRaw(name)) {
      this.raiseEarly('UnexpectedToken', token);
    }
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

  // PrivateIdentifier ::
  //   `#` IdentifierName
  parsePrivateIdentifier() {
    const node = this.startNode();
    node.name = this.expect(Token.PRIVATE_IDENTIFIER).value;
    return this.finishNode(node, 'PrivateIdentifier');
  }
}
