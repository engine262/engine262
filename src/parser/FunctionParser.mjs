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

  parseArrowFunction(node, parameters, isAsync) {
    this.expect(Token.ARROW);
    node.ArrowParameters = parameters.map((p) => {
      switch (p.type) {
        case 'IdentifierReference': {
          p.type = 'BindingIdentifier';
          const container = this.startNode();
          container.BindingIdentifier = p;
          container.Initializer = null;
          return this.finishNode(container, 'SingleNameBinding');
        }
        case 'BindingRestElement':
          return p;
        default:
          return this.unexpected(p);
      }
    });
    const body = this.parseConciseBody(isAsync);
    node[`${isAsync ? 'Async' : ''}ConciseBody`] = body;
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ArrowFunction`);
  }

  parseConciseBody(isAsync) {
    if (this.test(Token.LBRACE)) {
      return this.parseFunctionBody(isAsync, false, true);
    }
    const node = this.startNode();
    node.ExpressionBody = this.parseAssignmentExpression();
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ConciseBody`);
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
