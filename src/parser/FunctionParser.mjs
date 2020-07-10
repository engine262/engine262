import { BoundNames } from '../static-semantics/all.mjs';
import { Token, isReservedWordStrict } from './tokens.mjs';
import { IdentifierParser } from './IdentifierParser.mjs';

export const FunctionKind = {
  NORMAL: 0,
  ASYNC: 1,
};

export class FunctionParser extends IdentifierParser {
  // FunctionDeclaration :
  //   `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //   [+Default] `function` `(` FormalParameters `)` `{` FunctionBody `}`
  // FunctionExpression :
  //   `function` BindingIdentifier? `(` FormalParameters `)` `{` FunctionBody `}`
  // GeneratorDeclaration :
  //   `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
  //   [+Default] `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
  // GeneratorExpression :
  //   `function` BindingIdentifier? `(` FormalParameters `)` `{` GeneratorBody `}`
  // AsyncGeneratorDeclaration :
  //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  // AsyncGeneratorExpression :
  //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  // AsyncFunctionDeclaration :
  //   `async` `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //   [+Default] `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
  // Async`FunctionExpression :
  //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncFunctionBody `}`
  parseFunction(isExpression, kind) {
    const isAsync = kind === FunctionKind.ASYNC;
    const node = this.startNode();
    if (isAsync) {
      this.expect(Token.ASYNC);
    }
    this.expect(Token.FUNCTION);
    const isGenerator = this.eat(Token.MUL);
    if (this.test(Token.IDENTIFIER)) {
      node.BindingIdentifier = this.parseBindingIdentifier();
    } else if (isExpression === false && !this.isDefaultScope()) {
      this.unexpected();
    } else {
      node.BindingIdentifier = null;
    }

    this.scope({
      lexical: true,
      variable: true,
    }, () => {
      node.FormalParameters = this.parseFormalParameters();

      const body = this.parseFunctionBody(isAsync, isGenerator, false);

      this.validateFunctionParameters(node, node.FormalParameters, body.strict);

      node[body.type] = body;
    });

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}${isExpression ? 'Expression' : 'Declaration'}`;
    return this.finishNode(node, name);
  }

  validateFunctionParameters(f, parameters, strict) {
    if (!strict || !parameters) {
      return;
    }
    const seen = new Set();
    for (const sName of BoundNames(parameters)) {
      const name = sName.stringValue();
      if (seen.has(name)) {
        this.report('AlreadyDeclared', parameters, name);
      }
      seen.add(name);
      if (isReservedWordStrict(name) || name === 'arguments' || name === 'eval') {
        this.unexpected(f);
      }
    }
  }

  convertArrowParameter(node) {
    switch (node.type) {
      case 'IdentifierReference': {
        node.type = 'BindingIdentifier';
        const container = this.startNode();
        container.BindingIdentifier = node;
        container.Initializer = null;
        return this.finishNode(container, 'SingleNameBinding');
      }
      case 'BindingRestElement':
        return node;
      case 'ArrayLiteral': {
        const wrap = this.startNode();
        node.BindingElementList = node.ElementList.map((p) => this.convertArrowParameter(p));
        delete node.ElementList;
        node.type = 'ArrayBindingPattern';
        wrap.BindingPattern = node;
        wrap.Initializer = null;
        return this.finishNode(wrap, 'BindingElement');
      }
      case 'ObjectLiteral': {
        const wrap = this.startNode();
        node.BindingPropertyList = node.PropertyDefinitionList.map((p) => this.convertArrowParameter(p));
        delete node.PropertyDefinitionList;
        node.type = 'ObjectBindingPattern';
        wrap.BindingPattern = node;
        wrap.Initializer = null;
        return this.finishNode(wrap, 'BindingElement');
      }
      case 'AssignmentExpression': {
        const result = this.convertArrowParameter(node.LeftHandSideExpression);
        result.Initializer = node.AssignmentExpression;
        return result;
      }
      default:
        return this.unexpected(node);
    }
  }

  parseArrowFunction(node, parameters, kind) {
    const isAsync = kind === FunctionKind.ASYNC;
    this.expect(Token.ARROW);
    node.ArrowParameters = parameters.map((p) => this.convertArrowParameter(p));
    const body = this.parseConciseBody(isAsync);
    node[`${isAsync ? 'Async' : ''}ConciseBody`] = body;
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ArrowFunction`);
  }

  parseConciseBody(isAsync) {
    if (this.test(Token.LBRACE)) {
      return this.parseFunctionBody(isAsync, false, true);
    }
    const asyncBody = this.startNode();
    const exprBody = this.startNode();
    exprBody.AssignmentExpression = this.parseAssignmentExpression();
    asyncBody.ExpressionBody = this.finishNode(exprBody, 'ExpressionBody');
    return this.finishNode(asyncBody, `${isAsync ? 'Async' : ''}ConciseBody`);
  }

  // FormalParameter : BindingElement
  parseFormalParameter() {
    return this.parseBindingElement();
  }

  parseFormalParameters() {
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return [];
    }
    const params = [];
    this.scope({ parameters: true }, () => {
      while (true) {
        const node = this.startNode();
        if (this.eat(Token.ELLIPSIS)) {
          node.BindingIdentifier = this.parseBindingIdentifier();
          this.declare(node.BindingIdentifier, 'parameter');
          params.push(this.finishNode(node, 'BindingRestElement'));
          this.expect(Token.RPAREN);
          break;
        } else {
          const formal = this.parseFormalParameter();
          this.declare(formal, 'parameter');
          params.push(formal);
        }
        if (this.eat(Token.RPAREN)) {
          break;
        }
        this.expect(Token.COMMA);
        if (this.eat(Token.RPAREN)) {
          break;
        }
      }
    });
    return params;
  }

  parseUniqueFormalParameters() {
    const parameters = this.parseFormalParameters();
    const seen = new Set();
    for (const sName of BoundNames(parameters)) {
      const name = sName.stringValue();
      if (seen.has(name)) {
        this.report('AlreadyDeclared', parameters, name);
      }
      seen.add(name);
    }
    return parameters;
  }

  parseFunctionBody(isAsync, isGenerator, isArrow) {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    this.scope({
      newTarget: isArrow ? undefined : true,
      return: true,
      await: isAsync,
      yield: isGenerator,
    }, () => {
      const directives = [];
      node.FunctionStatementList = this.parseStatementList(Token.RBRACE, directives);
      node.strict = node.strict || directives.includes('use strict');
    });
    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body`;
    return this.finishNode(node, name);
  }
}
