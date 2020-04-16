import {
  Token, TokenPrecedence,
  isPropertyOrCall,
  isMember,
  isReservedWordStrict,
} from './tokens.mjs';
import { isNewline } from './Lexer.mjs';
import { FunctionParser, FunctionKind } from './FunctionParser.mjs';

export class ExpressionParser extends FunctionParser {
  // Expression :
  //   AssignmentExpression
  //   Expression `,` AssignmentExpression
  parseExpression() {
    const node = this.startNode();
    const AssignmentExpression = this.parseAssignmentExpression();
    if (this.eat(Token.COMMA)) {
      node.ExpressionList = [AssignmentExpression];
      do {
        node.ExpressionList.push(this.parseAssignmentExpression());
      } while (this.eat(Token.COMMA));
      return this.finishNode(node, 'CommaOperator');
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
  //   [*LogicalAssignment] LeftHandSideExpression LogicalAssignmentOperator AssignmentExpression
  //
  // AssignmentOperator : one of
  //   *= /= %= += -= <<= >>= >>>= &= ^= |= **=
  //
  // LogicalAssignmentOperator : one of
  //   &&= ||= ??=
  parseAssignmentExpression() {
    if (this.lookahead.type === Token.YIELD && this.isYieldScope()) {
      return this.parseYieldExpression();
    }
    const node = this.startNode();
    const left = this.parseConditionalExpression();
    if (!this.hasLineTerminatorBeforeNext() && this.test(Token.ARROW)) {
      return this.parseArrowFunction(node, [left], false);
    }
    switch (this.lookahead.type) {
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
      case Token.ASSIGN_AND:
      case Token.ASSIGN_OR:
      case Token.ASSIGN_NULLISH:
        node.LeftHandSideExpression = this.validateAssignmentTarget(left);
        node.AssignmentOperator = this.next().value;
        node.AssignmentExpression = this.parseAssignmentExpression();
        return this.finishNode(node, 'AssignmentExpression');
      default:
        return left;
    }
  }

  validateAssignmentTarget(node) {
    switch (node.type) {
      case 'IdentifierReference':
        if (this.isStrictMode() && isReservedWordStrict(node.name)) {
          break;
        }
        return node;
      case 'MemberExpression':
        return node;
      case 'ParenthesizedExpression':
        return this.validateAssignmentTarget(node.Expression);
      case 'ArrayLiteral':
        node.BindingElementList = node.ElementList.map((p) => this.validateAssignmentTarget(p));
        delete node.ElementList;
        node.type = 'ArrayBindingPattern';
        return node;
      case 'ObjectLiteral':
        node.BindingPropertyList = node.PropertyDefinitionList.map((p) => this.validateAssignmentTarget(p));
        delete node.PropertyDefinitionList;
        node.type = 'ObjectBindingPattern';
        return node;
      case 'PropertyDefinition':
        node.BindingElement = this.validateAssignmentTarget(node.AssignmentExpression);
        delete node.AssignmentExpression;
        node.type = 'BindingProperty';
        return node;
      default:
        break;
    }
    return this.report('InvalidAssignmentTarget', node);
  }

  // YieldExpression :
  //   `yield`
  //   `yield` [no LineTerminator here] AssignmentExpression
  //   `yield` [no LineTerminator here] `*` AssignmentExpression
  parseYieldExpression() {
    const node = this.startNode();
    this.expect(Token.YIELD);
    if (this.hasLineTerminatorBeforeNext()) {
      node.hasStar = false;
      node.AssignmentExpression = null;
    } else {
      node.hasStar = this.eat(Token.MUL);
      if (node.isGenerator) {
        node.AssignmentExpression = this.parseAssignmentExpression();
      } else {
        switch (this.lookahead.type) {
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
  parseShortCircuitExpression() {
    return this.parseBinaryExpression(TokenPrecedence[Token.NULLISH]);
  }

  parseBinaryExpression(precedence) {
    let x = this.parseUnaryExpression();
    let p = TokenPrecedence[this.lookahead.type];
    if (p >= precedence) {
      do {
        while (TokenPrecedence[this.lookahead.type] === p) {
          const node = this.startNode();
          const left = x;
          const op = this.next();
          const nextP = op.type === Token.EXP ? p : p + 1;
          const right = this.parseBinaryExpression(nextP);
          let name;
          switch (op.type) {
            case Token.EXP:
              name = 'ExponentiationExpression';
              node.UpdateExpression = left;
              node.ExponentiationExpression = right;
              break;
            case Token.MUL:
            case Token.DIV:
            case Token.MOD:
              name = 'MultiplicativeExpression';
              node.MultiplicativeExpression = left;
              node.MultiplicativeOperator = op.value;
              node.ExponentiationExpression = right;
              break;
            case Token.ADD:
            case Token.SUB:
              name = 'AdditiveExpression';
              node.AdditiveExpression = left;
              node.MultiplicativeExpression = right;
              node.operator = op.value;
              break;
            case Token.SHL:
            case Token.SAR:
            case Token.SHR:
              name = 'ShiftExpression';
              node.ShiftExpression = left;
              node.AdditiveExpression = right;
              node.operator = op.value;
              break;
            case Token.LT:
            case Token.GT:
            case Token.LE:
            case Token.GE:
            case Token.INSTANCEOF:
            case Token.IN:
              if (op.type === Token.IN && !this.isInScope()) {
                this.unexpected(op);
              }
              name = 'RelationalExpression';
              node.RelationalExpression = left;
              node.ShiftExpression = right;
              node.operator = op.value;
              break;
            case Token.EQ:
            case Token.NE:
            case Token.EQ_STRICT:
            case Token.NE_STRICT:
              name = 'EqualityExpression';
              node.EqualityExpression = left;
              node.RelationalExpression = right;
              node.operator = op.value;
              break;
            case Token.BIT_AND:
              name = 'BitwiseANDExpression';
              node.A = left;
              node.operator = op.value;
              node.B = right;
              break;
            case Token.BIT_XOR:
              name = 'BitwiseXORExpression';
              node.A = left;
              node.operator = op.value;
              node.B = right;
              break;
            case Token.BIT_OR:
              name = 'BitwiseORExpression';
              node.A = left;
              node.operator = op.value;
              node.B = right;
              break;
            case Token.AND:
              name = 'LogicalANDExpression';
              node.LogicalANDExpression = left;
              node.BitwiseORExpression = right;
              break;
            case Token.OR:
              name = 'LogicalORExpression';
              node.LogicalORExpression = left;
              node.LogicalANDExpression = right;
              break;
            default:
              this.unexpected(op);
          }
          x = this.finishNode(node, name);
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
    if (this.lookahead.type === Token.AWAIT && this.isAwaitScope()) {
      return this.parseAwaitExpression();
    }
    const node = this.startNode();
    switch (this.lookahead.type) {
      case Token.DELETE:
      case Token.VOID:
      case Token.TYPEOF:
      case Token.ADD:
      case Token.SUB:
      case Token.BIT_NOT:
      case Token.NOT:
        node.operator = this.next().value;
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
    if (this.lookahead.type === Token.INC
        || this.lookahead.type === Token.DEC) {
      const node = this.startNode();
      node.operator = this.next().value;
      node.LeftHandSideExpression = null;
      node.UnaryExpression = this.parseUnaryExpression();
      return this.finishNode(node, 'UpdateExpression');
    }
    const argument = this.parseLeftHandSideExpression();
    if (!this.hasLineTerminatorBeforeNext()) {
      if (this.lookahead.type === Token.INC
          || this.lookahead.type === Token.DEC) {
        const node = this.startNode();
        node.operator = this.next().value;
        node.LeftHandSideExpression = argument;
        node.UnaryExpression = null;
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
    if (this.test(Token.SUPER)) {
      const node = this.startNode();
      this.next();
      if (this.test(Token.LPAREN) && this.isSuperCallScope()) {
        node.Arguments = this.parseArguments();
        return this.finishNode(node, 'SuperCall');
      }
      if (!this.isSuperPropertyScope()) {
        this.unexpected();
      }
      if (this.eat(Token.LBRACK)) {
        node.Expression = this.parseExpression();
        this.expect(Token.RBRACK);
        node.IdentifierName = null;
      } else {
        this.expect(Token.DOT);
        node.Expression = null;
        node.IdentifierName = this.parseIdentifierName();
      }
      return this.finishNode(node, 'SuperProperty');
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
    if (this.isNewTargetScope() && this.eat(Token.PERIOD)) {
      if (this.lookahead.type !== Token.IDENTIFIER
          || this.lookahead.value !== 'target') {
        this.unexpected();
      }
      this.next();
      return this.finishNode(node, 'NewTarget');
    }
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
    if (check(this.lookahead.type)) {
      let result = PrimaryExpression;
      do {
        const node = this.startNode();
        switch (this.lookahead.type) {
          case Token.LBRACK: {
            this.next();
            node.MemberExpression = result;
            node.IdentifierName = null;
            node.Expression = this.parseExpression();
            result = this.finishNode(node, 'MemberExpression');
            this.expect(Token.RBRACK);
            break;
          }
          case Token.PERIOD:
            this.next();
            node.MemberExpression = result;
            node.IdentifierName = this.parseIdentifierName();
            node.Expression = null;
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
      } while (check(this.lookahead.type));
      return result;
    }
    return PrimaryExpression;
  }

  // PrimaryExpression :
  //   ...
  parsePrimaryExpression() {
    const node = this.startNode();
    switch (this.lookahead.type) {
      case Token.THIS:
        this.next();
        return this.finishNode(node, 'ThisExpression');
      case Token.IDENTIFIER:
      case Token.YIELD:
      case Token.AWAIT:
        return this.parseIdentifierReference();
      case Token.NUMBER:
      case Token.BIGINT:
        node.value = this.next().value;
        return this.finishNode(node, 'NumericLiteral');
      case Token.STRING:
        node.value = this.next().value;
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
      case Token.TEMPLATE:
        return this.parseTemplateLiteral();
      case Token.DIV:
      case Token.ASSIGN_DIV:
        return this.parseRegularExpressionLiteral();
      case Token.LPAREN:
        return this.parseParenthesizedExpressionAndArrowParameterList();
      default:
        return this.unexpected();
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
    node.ElementList = [];
    while (true) {
      while (this.eat(Token.COMMA)) {
        node.ElementList.push(this.finishNode(this.startNode(), 'Elision'));
      }
      if (this.eat(Token.RBRACK)) {
        break;
      }
      const AssignmentExpression = this.parseAssignmentExpression();
      node.ElementList.push(AssignmentExpression);
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
        node.AssignmentExpression = this.parseAssignmentExpression();
        params.push(this.finishNode(node, 'AssignmentRestElement'));
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

    this.scope({ strict: true }, () => {
      if (this.test(Token.IDENTIFIER)) {
        node.BindingIdentifier = this.parseBindingIdentifier();
      } else if (isExpression === false) {
        this.unexpected();
      } else {
        node.BindingIdentifier = null;
      }
      node.ClassTail = this.parseClassTail();
    });

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

    this.scope({
      superProperty: node.ClassHeritage !== null,
    }, () => {
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
    const node = this.startNode();
    node.TemplateSpanList = [];
    node.ExpressionList = [];
    let buffer = '';
    while (true) {
      if (this.position >= this.source.length) {
        this.report('UnterminatedTemplate', this.position);
      }
      const c = this.source[this.position];
      switch (c) {
        case '`':
          this.position += 1;
          node.TemplateSpanList.push(buffer);
          this.next();
          return this.finishNode(node, 'TemplateLiteral');
        case '$':
          this.position += 1;
          if (this.source[this.position] === '{') {
            this.position += 1;
            node.TemplateSpanList.push(buffer);
            buffer = '';
            this.next();
            node.ExpressionList.push(this.parseExpression());
            break;
          }
          buffer += c;
          break;
        default:
          this.position += 1;
          if (isNewline(c)) {
            if (c === '\r' && this.source[this.position] === '\n') {
              this.position += 1;
            }
            this.line += 1;
            this.columnOffset = this.position;
          }
          buffer += c;
          break;
      }
    }
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
      const params = expression.type === 'CommaOperator' ? expression.ExpressionList : [expression];
      return this.parseArrowFunction(node, params, false);
    }
    // FIXME: fail on `...Binding`
    node.Expression = expression;
    return this.finishNode(node, 'ParenthesizedExpression');
  }

  // BindingElement :
  //   SingleNameBinding
  //   BindingPattern Initializer?
  // SingleNameBinding :
  //   BindingIdentifier Initializer?
  parseBindingElement() {
    const node = this.startNode();
    node.BindingIdentifier = this.parseBindingIdentifier();
    if (this.test(Token.ASSIGN)) {
      node.Initializer = this.parseInitializer();
    } else {
      node.Initializer = null;
    }
    return this.finishNode(node, 'SingleNameBinding');
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
    const isSpecialMethod = isGenerator || ((isSetter || isGetter || isAsync) && !this.test(Token.LPAREN));

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

    if (type === 'property' && !isSpecialMethod && !this.test(Token.LPAREN)) {
      leadingIdentifier.type = 'IdentifierReference';
      return leadingIdentifier;
    }

    node.PropertyName = isSpecialMethod ? this.parsePropertyName() : leadingIdentifier;

    if (isSpecialMethod && isGetter) {
      this.expect(Token.LPAREN);
      this.expect(Token.RPAREN);
      node.PropertySetParameterList = null;
      node.UniqueFormalParameters = null;
    } else if (isSpecialMethod && isSetter) {
      node.PropertySetParameterList = [this.parseFormalParameter()];
      node.UniqueFormalParameters = null;
    } else {
      node.PropertySetParameterList = null;
      node.UniqueFormalParameters = this.parseUniqueFormalParameters();
    }

    node.FunctionBody = this.scope({
      superCall: !isSpecialMethod && (
        node.PropertyName.name === 'constructor'
        || node.PropertyName.value === 'constructor'
      ),
    }, () => this.parseFunctionBody(isAsync, isGenerator));

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : ''}Method${isAsync || isGenerator ? '' : 'Definition'}`;
    return this.finishNode(node, name);
  }
}
