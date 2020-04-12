import {
  Token, TokenPrecedence, isPropertyOrCall, isMember,
  isKeywordRaw, isReservedWord, isReservedWordStrict,
} from './tokens.mjs';
import { FunctionParser, FunctionKind } from './FunctionParser.mjs';

export class ExpressionParser extends FunctionParser {
  // Expression :
  //   AssignmentExpression
  //   Expression `,` AssignmentExpression
  parseExpression() {
    const node = this.startNode();
    const AssignmentExpression = this.parseAssignmentExpression();
    if (this.eat(Token.COMMA)) {
      node.expressions = [AssignmentExpression];
      do {
        node.expressions.push(this.parseAssignmentExpression());
      } while (this.eat(Token.COMMA));
      return this.finishNode(node, 'SequenceExpression');
    }
    return AssignmentExpression;
  }

  // AssignmentExpression :
  //   ConditionalExpression
  //   [+Yield] YieldExpression
  //   ArrowFunction
  //   AsyncArrowFunction
  //   LeftHandSideExpression `=` AssignmentExpression
  //   LeftHandSideExpression AssignmentOperator AssignmentExpression
  //
  // AssignmentOperator : one of
  //   *= /= %= += -= <<= >>= >>>= &= ^= |= **=
  parseAssignmentExpression() {
    const token = this.peek();
    if (token.type === Token.YIELD && this.isYieldScope()) {
      return this.parseYieldExpression();
    }
    const node = this.startNode();
    const left = this.parseConditionalExpression();
    const peek = this.peek();
    switch (peek.type) {
      case Token.ASSIGN:
      case Token.ASSIGN_MUL:
      case Token.ASSIGN_DIV:
      case Token.ASSIGN_MOD:
      case Token.ASSIGN_ADD:
      case Token.ASSIGN_SUB:
      case Token.ASSIGN_SHL:
      case Token.ASSIGN_SAR:
      case Token.ASSIGN_SHR:
      case Token.ASSIGN_BIT_AND:
      case Token.ASSIGN_BIT_XOR:
      case Token.ASSIGN_BIT_OR:
      case Token.ASSIGN_EXP:
        this.checkAssignmentTarget(left);
        this.next();
        node.LeftHandSideExpression = left;
        node.AssignmentExpression = this.parseAssignmentExpression();
        node.AssignmentOperator = peek.value;
        return this.finishNode(node, 'AssignmentExpression');
      default:
        return left;
    }
  }

  // YieldExpression :
  //   `yield`
  //   `yield` [no LineTerminator here] AssignmentExpression
  //   `yield` [no LineTerminator here] `*` AssignmentExpression
  parseYieldExpression() {
    const node = this.startNode();
    this.expect(Token.YIELD);
    if (this.hasLineTerminatorBeforeNext()) {
      node.isGenerator = false;
      node.AssignmentExpression = null;
    } else {
      node.isGenerator = this.eat(Token.MUL);
      if (node.isGenerator) {
        node.AssignmentExpression = this.parseAssignmentExpression();
      } else {
        const peek = this.peek();
        switch (peek.type) {
          case Token.EOS:
          case Token.SEMICOLON:
          case Token.RBRACE:
          case Token.RBRACK:
          case Token.RPAREN:
          case Token.COLON:
          case Token.COMMA:
          case Token.IN:
            node.AssignmentExpression = null;
            break;
          default:
            node.AssignmentExpression = this.parseAssignmentExpression();
        }
      }
    }
    return this.finishNode(node, 'YieldExpression');
  }

  checkAssignmentTarget(node) {
    switch (node.type) {
      case 'Identifier':
        if (this.isStrictMode()) {
          if (isKeywordRaw(node.name) || isReservedWordStrict(node.name)) {
            this.report('AssignToReserved');
          }
        } else if (isReservedWord(node.name)) {
          this.report('AssignToReserved');
        }
        break;
      case 'MemberExpression':
        break;
      case 'ParenthesizedExpression':
        this.checkAssignmentTarget(node.expression);
        break;
      default:
        this.report('InvalidAssignmentTarget');
    }
  }

  // ConditionalExpression :
  //   ShortCircuitExpression
  //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
  parseConditionalExpression() {
    const node = this.startNode();
    const ShortCircuitExpression = this.parseShortCircuitExpression();
    if (this.eat(Token.CONDITIONAL)) {
      node.ShortCircuitExpression = ShortCircuitExpression;
      node.AssignmentExpression_a = this.parseAssignmentExpression();
      this.expect(Token.COLON);
      node.AssignmentExpression_b = this.parseAssignmentExpression();
      return this.finishNode(node, 'ConditionalExpression');
    }
    return ShortCircuitExpression;
  }

  // ShortCircuitExpression :
  //   LogicalORExpression
  //   CoalesceExpression
  // LogicalORExpression and CoalesceExpression start with BitwiseOR
  parseShortCircuitExpression() {
    return this.parseBinaryExpression(TokenPrecedence[Token.NULLISH]);
  }

  parseBinaryExpression(precedence) {
    let x = this.parseUnaryExpression();
    let p = TokenPrecedence[this.peek().type];
    if (p >= precedence) {
      do {
        while (TokenPrecedence[this.peek().type] === p) {
          const node = this.startNode();
          node.left = x;
          const op = this.next();
          node.operator = op.value;
          const nextP = op.type === Token.EXP ? p : p + 1;
          node.right = this.parseBinaryExpression(nextP);
          x = this.finishNode(node, op.type === Token.AND || op.type === Token.OR ? 'LogicalExpression' : 'BinaryExpression');
        }
        p -= 1;
      } while (p >= precedence);
    }
    return x;
  }

  // UnaryExpression :
  //   UpdateExpression
  //   `delete` UnaryExpression
  //   `void` UnaryExpression
  //   `typeof` UnaryExpression
  //   `+` UnaryExpression
  //   `-` UnaryExpression
  //   `~` UnaryExpression
  //   `!` UnaryExpression
  //   [+Await] AwaitExpression
  parseUnaryExpression() {
    const peek = this.peek();
    if (peek.type === Token.AWAIT && this.isAwaitScope()) {
      return this.parseAwaitExpression();
    }
    const node = this.startNode();
    switch (peek.type) {
      case Token.DELETE:
      case Token.VOID:
      case Token.TYPEOF:
      case Token.ADD:
      case Token.SUB:
      case Token.BIT_NOT:
      case Token.NOT:
        this.next();
        node.operator = peek.value;
        node.UnaryExpression = this.parseUnaryExpression();
        return this.finishNode(node, 'UnaryExpression');
      default:
        return this.parseUpdateExpression();
    }
  }

  // AwaitExpression : `await` UnaryExpression
  parseAwaitExpression() {
    const node = this.startNode();
    this.expect(Token.AWAIT);
    node.UnaryExpression = this.parseUnaryExpression();
    return this.finishNode(node, 'AwaitExpression');
  }

  // UpdateExpression :
  //   LeftHandSideExpression
  //   LeftHandSideExpression [no LineTerminator here] `++`
  //   LeftHandSideExpression [no LineTerminator here] `--`
  //   `++` UnaryExpression
  //   `--` UnaryExpression
  parseUpdateExpression() {
    const peek = this.peek();
    if (peek.type === Token.INC || peek.type === Token.DEC) {
      const node = this.startNode();
      this.next();
      node.operator = peek.value;
      node.UnaryExpression = this.parseUnaryExpression();
      return this.finishNode(node, 'UpdateExpression');
    }
    const argument = this.parseLeftHandSideExpression();
    if (!this.hasLineTerminatorBeforeNext()) {
      const p = this.peek();
      if (p.type === Token.INC || p.type === Token.DEC) {
        const node = this.startNode();
        this.next();
        node.operator = p.value;
        node.LeftHandSideExpression = argument;
        return this.finishNode(node, 'UpdateExpression');
      }
    }
    return argument;
  }

  // LeftHandSideExpression
  parseLeftHandSideExpression() {
    if (this.test(Token.NEW)) {
      return this.parseNewExpression();
    }
    return this.parseSubscripts(true);
  }

  // MemberExpression
  parseMemberExpression() {
    if (this.test(Token.NEW)) {
      return this.parseNewExpression();
    }
    return this.parseSubscripts(false);
  }

  // NewExpression
  parseNewExpression() {
    const node = this.startNode();
    this.expect(Token.NEW);
    node.MemberExpression = this.parseMemberExpression();
    if (this.test(Token.LPAREN)) {
      node.Arguments = this.parseArguments();
    } else {
      node.Arguments = [];
    }
    return this.finishNode(node, 'NewExpression');
  }

  parseSubscripts(allowCalls) {
    const PrimaryExpression = this.parsePrimaryExpression();
    const check = allowCalls ? isPropertyOrCall : isMember;
    if (check(this.peek().type)) {
      let result = PrimaryExpression;
      do {
        const node = this.startNode();
        switch (this.peek().type) {
          case Token.LBRACK: {
            this.next();
            node.MemberExpression = result;
            node.Expression = this.parseExpression();
            result = this.finishNode(node, 'MemberExpression');
            this.expect(Token.RBRACK);
            break;
          }
          case Token.PERIOD:
            this.next();
            node.MemberExpression = result;
            node.IdentifierName = this.parseIdentifierName();
            result = this.finishNode(node, 'MemberExpression');
            break;
          case Token.LPAREN:
            if (!allowCalls) {
              throw new Error('State failure');
            }
            node.CallExpression = result;
            node.Arguments = this.parseArguments();
            result = this.finishNode(node, 'CallExpression');
            break;
          default:
            node.MemberExpression = result;
            node.TemplateLiteral = this.parseTemplateLiteral();
            result = this.finishNode(node, 'TaggedTemplateExpression');
            break;
        }
      } while (check(this.peek().type));
      return result;
    }
    return PrimaryExpression;
  }

  // PrimaryExpression :
  //   ...
  parsePrimaryExpression() {
    const node = this.startNode();
    const token = this.peek();
    switch (token.type) {
      case Token.SUPER:
        if (!this.isSuperScope()) {
          this.unexpected();
        }
        this.next();
        return this.finishNode(node, 'Super');
      case Token.THIS:
        this.next();
        return this.finishNode(node, 'ThisExpression');
      case Token.IDENTIFIER:
      case Token.YIELD:
      case Token.AWAIT:
        return this.parseIdentifierReference();
      case Token.NUMBER:
      case Token.BIGINT:
        this.next();
        node.value = token.value;
        return this.finishNode(node, 'NumericLiteral');
      case Token.STRING:
        this.next();
        node.value = token.value;
        return this.finishNode(node, 'StringLiteral');
      case Token.NULL:
        this.next();
        return this.finishNode(node, 'NullLiteral');
      case Token.TRUE:
        this.next();
        node.value = true;
        return this.finishNode(node, 'BooleanLiteral');
      case Token.FALSE:
        this.next();
        node.value = false;
        return this.finishNode(node, 'BooleanLiteral');
      case Token.LBRACK:
        return this.parseArrayLiteral();
      case Token.LBRACE:
        return this.parseObjectLiteral();
      case Token.FUNCTION:
        return this.parseFunctionExpression(FunctionKind.NORMAL);
      case Token.CLASS:
        return this.parseClassExpression();
      case Token.ASYNC:
        return this.parseFunctionExpression(FunctionKind.ASYNC);
      case Token.TEMPLATE_SPAN:
        return this.parseTemplateLiteral();
      case Token.LPAREN:
        return this.parseParenthesizedExpressionAndArrowParameterList();
      default:
        return this.unexpected(token);
    }
  }

  // ArrayLiteral :
  //   `[` `]`
  //   `[` Elision `]`
  //   `[` ElementList `]`
  //   `[` ElementList `,` `]`
  //   `[` ElementList `,` Elision `]`
  parseArrayLiteral() {
    const node = this.startNode();
    this.expect(Token.LBRACK);
    node.elements = [];
    while (true) {
      while (this.eat(Token.COMMA)) {
        node.elements.push(null);
      }
      if (this.eat(Token.RBRACK)) {
        break;
      }
      const AssignmentExpression = this.parseAssignmentExpression();
      node.elements.push(AssignmentExpression);
      if (this.eat(Token.RBRACK)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'ArrayLiteral');
  }

  // ObjectLiteral :
  //   `{` `}`
  //   `{` PropertyDefinitionList `}`
  //   `{` PropertyDefinitionList `,` `}`
  parseObjectLiteral() {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    node.PropertyDefinitionList = [];
    while (true) {
      if (this.eat(Token.RBRACE)) {
        break;
      }
      node.PropertyDefinitionList.push(this.parsePropertyDefinition());
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'ObjectLiteral');
  }

  parsePropertyDefinition() {
    return this.parseBracketedDefinition('property');
  }

  parseFunctionExpression(kind) {
    return this.parseFunction(true, kind);
  }

  parseArguments() {
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return [];
    }
    const params = [];
    while (true) {
      const node = this.startNode();
      if (this.eat(Token.ELLIPSIS)) {
        node.argument = this.parseAssignmentExpression();
        params.push(this.finishNode(node, 'RestElement'));
        this.expect(Token.RPAREN);
        break;
      } else {
        params.push(this.parseAssignmentExpression());
      }
      if (this.eat(Token.RPAREN)) {
        break;
      }
      this.expect(Token.COMMA);
      if (this.eat(Token.RPAREN)) {
        break;
      }
    }
    return params;
  }

  // #sec-class-definitions
  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  //
  // ClassExpression :
  //   `class` BindingIdentifier? ClassTail
  parseClass(isExpression) {
    const node = this.startNode();

    this.expect(Token.CLASS);

    const savedStrict = this.state.strict;
    this.state.strict = true;

    if (this.test(Token.IDENTIFIER)) {
      node.BindingIdentifier = this.parseBindingIdentifier();
    } else if (isExpression === false) {
      this.unexpected();
    } else {
      node.BindingIdentifier = null;
    }
    node.ClassTail = this.parseClassTail();

    this.state.strict = savedStrict;

    return this.finishNode(node, isExpression ? 'ClassExpression' : 'ClassDeclaration');
  }

  // ClassTail : ClassHeritage? `{` ClassBody? `}`
  // ClassHeritage : `extends` LeftHandSideExpression
  // ClassBody : ClassElementList
  parseClassTail() {
    const node = this.startNode();

    if (this.eat(Token.EXTENDS)) {
      node.ClassHeritage = this.parseLeftHandSideExpression();
    } else {
      node.ClassHeritage = null;
    }

    this.scope({ super: node.ClassHeritage !== null }, () => {
      this.expect(Token.LBRACE);
      if (this.eat(Token.RBRACE)) {
        node.ClassBody = null;
      } else {
        node.ClassBody = [];
        while (!this.eat(Token.RBRACE)) {
          const m = this.parseClassElement();
          node.ClassBody.push(m);
        }
      }
    });

    return this.finishNode(node, 'ClassTail');
  }

  // ClassElement :
  //   `static` MethodDefinition
  //   MethodDefinition
  parseClassElement() {
    const node = this.startNode();
    node.static = this.eat(Token.STATIC);
    node.MethodDefinition = this.parseMethodDefinition();
    return this.finishNode(node, 'ClassElement');
  }

  parseMethodDefinition() {
    return this.parseBracketedDefinition('method');
  }

  parseClassExpression() {
    return this.parseClass(true);
  }

  parseTemplateLiteral() {
    const next = this.next();
    if (next.type !== Token.TEMPLATE_SPAN) {
      this.unexpected(next);
    }
    return next.value;
  }

  parseParenthesizedExpressionAndArrowParameterList() {
    const node = this.startNode();
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return this.parseArrowFunction(node, [], false);
    }
    const expression = this.parseExpression();
    this.expect(Token.RPAREN);
    if (this.test(Token.ARROW)) {
      const params = expression.type === 'SequenceExpression' ? expression.expressions : [expression];
      return this.parseArrowFunction(node, params, false);
    }
    // FIXME: fail on `...Binding`
    node.expression = expression;
    return this.finishNode(node, 'ParenthesizedExpression');
  }

  // PropertyDefinition :
  //   IdentifierReference
  //   CoverInitializedName
  //   PropertyName `:` AssignmentExpression
  //   MethodDefinition
  //   `...` AssignmentExpression
  // MethodDefinition :
  //   PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   GeneratorMethod
  //   AsyncMethod
  //   AsyncGeneratorMethod
  //   `get` PropertyName `(` `)` `{` FunctionBody `}`
  //   `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`
  // GeneratorMethod :
  //   `*` PropertyName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
  // AsyncMethod :
  //   `async` [no LineTerminator here] PropertyName `(` UniqueFormalParameters `)` `{` AsyncFunctionBody `}`
  // AsyncGeneratorMethod :
  //   `async` [no LineTerminator here] `*` Propertyname `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`
  parseBracketedDefinition(type) {
    const node = this.startNode();

    if (type === 'property' && this.eat(Token.ELLIPSIS)) {
      node.PropertyName = null;
      node.AssignmentExpression = this.parseAssignmentExpression();
      return this.finishNode(node, 'PropertyDefinition');
    }

    const leadingIdentifier = this.parsePropertyName();
    const isAsync = leadingIdentifier.name === 'async';
    const isGetter = leadingIdentifier.name === 'get';
    const isSetter = leadingIdentifier.name === 'set';
    const isGenerator = !isGetter && !isSetter && this.eat(Token.MUL);
    const isMethod = isAsync || isGetter || isSetter || isGenerator;

    if (!isGenerator && type === 'property') {
      if (this.eat(Token.COLON)) {
        node.PropertyName = leadingIdentifier;
        node.AssignmentExpression = this.parseAssignmentExpression();
        return this.finishNode(node, 'PropertyDefinition');
      }
      if (this.test(Token.ASSIGN)) {
        node.IdentifierReference = leadingIdentifier;
        node.Initializer = this.parseInitialized();
        return this.finishNode(node, 'CoverInitializedName');
      }
    }

    node.PropertyName = isMethod ? this.parsePropertyName() : leadingIdentifier;

    if (isGetter) {
      this.expect(Token.LPAREN);
      this.expect(Token.RPAREN);
      node.PropertySetParameterList = null;
      node.UniqueFormalParameters = null;
    } else if (isSetter) {
      node.PropertySetParameterList = this.parseFormalParameters();
      node.UniqueFormalParameters = null;
    } else {
      node.PropertySetParameterList = null;
      node.UniqueFormalParameters = this.parseUniqueFormalParameters();
    }

    node.FunctionBody = this.parseFunctionBody(isAsync, isGenerator);

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : ''}Method${isAsync || isGenerator ? '' : 'Definition'}`;
    return this.finishNode(node, name);
  }
}
