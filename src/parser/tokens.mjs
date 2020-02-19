const MaybeAssignTokens = [
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

export const RawTokens = [
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
  ['QUESTION_PERIOD', '?.'],
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

  // BEGIN ArrowOrAssignmentOp
  ['ARROW', '=>'],
  // BEGIN AssignmentOp
  ['INIT', '=init', 2],
  ['ASSIGN', '=', 2],
  ...MaybeAssignTokens.map((t) => [`ASSIGN_${t[0]}`, `${t[1]}=`, 2]),
  // END AssignmentOp
  // END ArrowOrAssignmentOp

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

  // BEGIN Callable
  ['SUPER', 'super'],
  // BEGIN AnyIdentifier
  ['IDENTIFIER', null],
  ['GET', 'get'],
  ['SET', 'set'],
  ['ASYNC', 'async'],
  ['AWAIT', 'await'],
  ['YIELD', 'yield'],
  ['LET', 'let'],
  ['STATIC', 'static'],
  // END AnyIdentifier
  // END Callable
  ['CLASS', 'class'],
  ['CONST', 'const'],
  ['EXPORT', 'export'],
  ['EXTENDS', 'extends'],
  ['IMPORT', 'import'],
];

export const Token = RawTokens
  .reduce((obj, [name], i) => {
    obj[name] = i;
    return obj;
  }, {});

export const TokenNames = RawTokens.map((r) => r[0]);

export const TokenPrecedence = RawTokens.map((r) => (r[2] || 0));

const Keywords = RawTokens
  .filter(([name, raw]) => name.toLowerCase() === raw)
  .map(([, raw]) => raw);

export const KeywordLookup = Keywords
  .reduce((obj, kw) => {
    obj[kw] = Token[kw.toUpperCase()];
    return obj;
  }, Object.create(null));

const KeywordTokens = new Set(Object.values(KeywordLookup));

const isInRange = (t, l, h) => (t - l) <= (h - l);
export const isAutomaticSemicolon = (t) => isInRange(t, Token.SEMICOLON, Token.EOS);
export const isMember = (t) => isInRange(t, Token.TEMPLATE, Token.LBRACK);
export const isPropertyOrCall = (t) => isInRange(t, Token.TEMPLATE, Token.LPAREN);
export const isKeyword = (t) => KeywordTokens.has(t);
export const isKeywordRaw = (s) => Keywords.includes(s);

const ReservedWords = [
  'enum', 'implements', 'interface',
  'package', 'private', 'protected',
  'public',
];

const ReservedWordsStrict = [...ReservedWords, 'eval', 'arguments'];

export const isReservedWord = (s) => ReservedWords.includes(s);
export const isReservedWordStrict = (s) => ReservedWordsStrict.includes(s);
