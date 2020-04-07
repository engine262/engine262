import {
  Token, TokenPrecedence, isPropertyOrCall, isMember,
  isKeywordRaw, isReservedWord, isReservedWordStrict,
} from './tokens.mjs';
import { FunctionParser } from './FunctionParser.mjs';

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
    if (this.isYieldScope && token.type === Token.YIELD) {
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

  checkAssignmentTarget(node) {
    switch (node.type) {
      case 'Identifier':
        if (this.state.strict) {
          if (isKeywordRaw(node.name)) {
            this.error('Invalid assignment to keyword in strict mode');
          }
          if (isReservedWordStrict(node.name)) {
            this.error('Invalid assignment to reserved word in strict mode');
          }
        } else if (isReservedWord(node.name)) {
          this.error('Invalid assignment to reserved word');
        }
        break;
      case 'MemberExpression':
        break;
      case 'ParenthesizedExpression':
        this.checkAssignmentTarget(node.expression);
        break;
      default:
        this.error('Invalid left-hand side in assignment');
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
    if (peek.type === Token.AWAIT && this.isAwaitScope) {
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
            node.IdentifierName = this.parseIdentifier(true);
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
        this.next();
        if (!this.isSuperScope) {
          this.error('Unexpected token: SUPER');
        }
        return this.finishNode(node, 'Super');
      case Token.THIS:
        this.next();
        return this.finishNode(node, 'ThisExpression');
      case Token.IDENTIFIER:
        this.next();
        node.name = token.value;
        return this.finishNode(node, 'Identifier');
      case Token.YIELD:
        this.next();
        node.name = 'yield';
        return this.finishNode(node, 'Identifier');
      case Token.AWAIT:
        this.next();
        node.name = 'await';
        return this.finishNode(node, 'Identifier');
      case Token.NUMBER:
        this.next();
        node.value = token.value;
        node.raw = token.value.toString();
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
        return this.parseFunctionExpression(ExpressionParser.FunctionKind.NORMAL);
      case Token.CLASS:
        return this.parseClassExpression();
      case Token.ASYNC:
        return this.parseFunctionExpression(ExpressionParser.FunctionKind.ASYNC);
      case Token.TEMPLATE_SPAN:
        return this.parseTemplateLiteral();
      case Token.LPAREN:
        return this.parseParenthesizedExpressionAndArrowParameterList();
      default:
        return this.error(`Unexpected token: ${token.name}`);
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
      node.PropertyDefinitionList.push(this.parseProperty());
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'ObjectLiteral');
  }

  parseProperty() {
    const node = this.startNode();
    node.method = false;
    node.shorthand = false;
    if (this.eat(Token.ELLIPSIS)) {
      node.argument = this.parseAssignmentExpression();
      return this.finishNode(node, 'SpreadElement');
    }
    const isGenerator = this.eat(Token.MUL);
    let isAsync = false;
    let id;
    if (!isGenerator && this.eat(Token.ASYNC)) {
      const peek = this.peek();
      if (peek.type === Token.LPAREN || peek.type === Token.COLON) {
        id = this.finishNode({ name: 'async' }, 'Identifier');
      } else {
        isAsync = true;
      }
    }
    if (!id) {
      if (this.eat(Token.LBRACK)) {
        node.computed = true;
        node.key = this.parseAssignmentExpression();
        this.expect(Token.RBRACK);
      } else {
        node.computed = false;
        const peek = this.peek();
        if (peek.type === Token.STRING || peek.type === Token.NUMBER) {
          node.key = this.parsePrimaryExpression();
        } else {
          node.key = this.parseIdentifier(true);
        }
      }
    }
    if (this.eat(Token.COLON)) {
      if (isGenerator || isAsync) {
        this.error('Unexpected token: COLON');
      }
      node.value = this.parseAssignmentExpression();
      node.kind = 'init';
      return this.finishNode(node, 'Property');
    }
    if (!isGenerator && !isAsync && node.key.type === 'Identifier') {
      node.shorthand = true;
      node.value = node.key;
      node.kind = 'init';
      return this.finishNode(node, 'Property');
    }
    throw new Error();
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

  parseClass(isExpression) {
    const node = this.startNode();
    this.expect(Token.CLASS);
    const savedStrict = this.state.strict;
    this.state.strict = true;
    const savedScopeBits = this.state.scopeBits;
    this.state.scopeBits |= ExpressionParser.ScopeBits.SUPER;
    if (this.test(Token.IDENTIFIER)) {
      node.id = this.parseBindingIdentifier();
    } else if (isExpression === false) {
      this.error('Expected class name');
    } else {
      node.id = null;
    }
    if (this.eat(Token.EXTENDS)) {
      node.superClass = this.parseLeftHandSideExpression();
    } else {
      node.superClass = null;
    }
    this.expect(Token.LBRACE);
    node.body = this.parseClassBody();
    this.state.strict = savedStrict;
    this.state.scopeBits = savedScopeBits;
    return this.finishNode(node, isExpression ? 'ClassExpression' : 'ClassDeclaration');
  }

  parseClassBody() {
    const node = this.startNode();
    node.body = [];
    let sawConstructor = false;
    while (!this.eat(Token.RBRACE)) {
      const m = this.parseMethodDefinition();
      if (m.kind === 'constructor') {
        if (sawConstructor) {
          this.error('Duplicate constructor in class definition');
        }
        sawConstructor = true;
      }
      node.body.push(m);
    }
    return this.finishNode(node, 'ClassBody');
  }

  parseMethodDefinition() {
    const method = this.startNode();
    const node = this.startNode();
    method.static = this.eat(Token.STATIC);
    method.kind = 'method';
    const peek = this.peek();
    node.async = false;
    switch (peek.type) {
      case Token.GET:
        this.next();
        method.kind = 'get';
        break;
      case Token.SET:
        this.next();
        method.kind = 'set';
        break;
      case Token.ASYNC:
        this.next();
        node.async = true;
        break;
      default:
        break;
    }
    if (method.kind === 'method') {
      node.generator = this.eat(Token.MUL);
    } else {
      node.generator = false;
    }
    if (this.eat(Token.LBRACK)) {
      method.computed = true;
      method.key = this.parseExpression();
      this.expect(Token.RBRACK);
    } else if (this.test(Token.STRING)) {
      method.computed = false;
      method.key = this.parseExpression();
      if (method.key.value === 'constructor') {
        method.kind = 'constructor';
      }
    } else {
      method.computed = false;
      method.key = this.parseIdentifier(true);
      if (method.key.name === 'constructor') {
        method.kind = 'constructor';
      }
    }
    node.params = this.parseFormalParameters();
    node.body = this.parseFunctionBody(node.async, node.generatr);
    node.id = null;
    node.expression = false;
    method.value = this.finishNode(node, 'FunctionExpression');
    return this.finishNode(method, 'MethodDefinition');
  }

  parseClassExpression() {
    return this.parseClass(true);
  }

  parseTemplateLiteral() {
    const next = this.next();
    if (next.type !== Token.TEMPLATE_SPAN) {
      this.error(`Unexpected token: ${next.name}`);
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
}
