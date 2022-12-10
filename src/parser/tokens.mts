type Token = [string, string | null, (number | null)?];
// TODO(TS): change to enum
export type TokenType = number & { __brand: 'TokenType' };
const MaybeAssignTokens: Token[] = [
  // Logical
  ['NULLISH', '??', 3],
  ['OR', '||', 4],
  ['AND', '&&', 5],

  // Binop
  ['BIT_OR', '|', 6],
  ['BIT_XOR', '^', 7],
  ['BIT_AND', '&', 8],
  ['SHL', '<<', 11],
  ['SAR', '>>', 11],
  ['SHR', '>>>', 11],
  ['MUL', '*', 13],
  ['DIV', '/', 13],
  ['MOD', '%', 13],
  ['EXP', '**', 14],

  // Unop
  ['ADD', '+', 12],
  ['SUB', '-', 12],
];

export const RawTokens: Token[] = [
  // BEGIN PropertyOrCall
  // BEGIN Member
  // BEGIN Template
  ['TEMPLATE', '`'],
  // END Template

  // BEGIN Property
  ['PERIOD', '.'],
  ['LBRACK', '['],
  // END Property
  // END Member
  ['OPTIONAL', '?.'],
  ['LPAREN', '('],
  // END PropertyOrCall
  ['RPAREN', ')'],
  ['RBRACK', ']'],
  ['LBRACE', '{'],
  ['COLON', ':'],
  ['ELLIPSIS', '...'],
  ['CONDITIONAL', '?'],
  // BEGIN AutoSemicolon
  ['SEMICOLON', ';'],
  ['RBRACE', '}'],

  ['EOS', 'EOS'],
  // END AutoSemicolon

  // BEGIN ArrowOrAssign
  ['ARROW', '=>'],
  // BEGIN Assign
  ['ASSIGN', '=', 2],
  ...MaybeAssignTokens.map((t): Token => [`ASSIGN_${t[0]}`, `${t[1]}=`, 2]),
  // END Assign
  // END ArrowOrAssign

  // Binary operators by precidence
  ['COMMA', ',', 1],

  ...MaybeAssignTokens,

  ['NOT', '!'],
  ['BIT_NOT', '~'],
  ['DELETE', 'delete'],
  ['TYPEOF', 'typeof'],
  ['VOID', 'void'],

  // BEGIN IsCountOp
  ['INC', '++'],
  ['DEC', '--'],
  // END IsCountOp
  // END IsUnaryOrCountOp

  ['EQ', '==', 9],
  ['EQ_STRICT', '===', 9],
  ['NE', '!=', 9],
  ['NE_STRICT', '!==', 9],
  ['LT', '<', 10],
  ['GT', '>', 10],
  ['LTE', '<=', 10],
  ['GTE', '>=', 10],
  ['INSTANCEOF', 'instanceof', 10],
  ['IN', 'in', 10],

  ['BREAK', 'break'],
  ['CASE', 'case'],
  ['CATCH', 'catch'],
  ['CONTINUE', 'continue'],
  ['DEBUGGER', 'debugger'],
  ['DEFAULT', 'default'],
  // DELETE
  ['DO', 'do'],
  ['ELSE', 'else'],
  ['FINALLY', 'finally'],
  ['FOR', 'for'],
  ['FUNCTION', 'function'],
  ['IF', 'if'],
  // IN
  // INSTANCEOF
  ['NEW', 'new'],
  ['RETURN', 'return'],
  ['SWITCH', 'switch'],
  ['THROW', 'throw'],
  ['TRY', 'try'],
  // TYPEOF
  ['VAR', 'var'],
  // VOID
  ['WHILE', 'while'],
  ['WITH', 'with'],
  ['THIS', 'this'],

  ['NULL', 'null'],
  ['TRUE', 'true'],
  ['FALSE', 'false'],
  ['NUMBER', null],
  ['STRING', null],
  ['BIGINT', null],

  // BEGIN Callable
  ['SUPER', 'super'],
  // BEGIN AnyIdentifier
  ['IDENTIFIER', null],
  ['AWAIT', 'await'],
  ['YIELD', 'yield'],
  // END AnyIdentifier
  // END Callable
  ['CLASS', 'class'],
  ['CONST', 'const'],
  ['EXPORT', 'export'],
  ['EXTENDS', 'extends'],
  ['IMPORT', 'import'],
  ['PRIVATE_IDENTIFIER', null],

  ['ENUM', 'enum'],

  ['ESCAPED_KEYWORD', null],
];

export const Token = RawTokens
  .reduce((obj, [name], i) => {
    obj[name] = i as TokenType;
    return obj;
  }, Object.create(null) as Record<string, TokenType>);

export const TokenNames = RawTokens.map((r) => r[0]);

export const TokenValues = RawTokens.map((r) => r[1]);

export const TokenPrecedence = RawTokens.map((r) => (r[2] || 0));

const Keywords = RawTokens
  .filter(([name, raw]) => name.toLowerCase() === raw)
  .map(([, raw]) => raw!);

export const KeywordLookup = Keywords
  .reduce((obj, kw) => {
    obj[kw] = Token[kw.toUpperCase()];
    return obj;
  }, Object.create(null) as Record<string, TokenType>);

const KeywordTokens = new Set(Object.values(KeywordLookup));

const isInRange = (t: number, l: number, h: number) => t >= l && t <= h;
export const isAutomaticSemicolon = (t: number) => isInRange(t, Token.SEMICOLON, Token.EOS);
export const isMember = (t: number) => isInRange(t, Token.TEMPLATE, Token.LBRACK);
export const isPropertyOrCall = (t: number) => isInRange(t, Token.TEMPLATE, Token.LPAREN);
export const isKeyword = (t: TokenType) => KeywordTokens.has(t);
export const isKeywordRaw = (s: string) => Keywords.includes(s);

const ReservedWordsStrict = [
  'implements', 'interface', 'let',
  'package', 'private', 'protected',
  'public', 'static', 'yield',
];

export const isReservedWordStrict = (s: string) => ReservedWordsStrict.includes(s);
