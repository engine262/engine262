/** Coerces a property key into a numeric index */
type ToIndex<T extends PropertyKey> =
  T extends number ? ToIndex<`${T}`> :
  T extends `${bigint}` ? T extends `${infer I extends number}` ? I : never :
  never;

type ReplaceType<T, U, V> = T extends U ? V : T;

type TokenDefinition = readonly [name: string, value: string | null, precedence?: number];

type TokenArrayToAssignTokenArray<A extends readonly TokenDefinition[]> = {
  readonly [P in keyof A]: readonly [`ASSIGN_${A[P][0]}`, `${A[P][1]}`, A[P][2]];
};

type TokenArrayToEnumLike<A extends readonly TokenDefinition[]> = {
  readonly [I in ToIndex<keyof A> as A[I][0]]: I;
};

type TokenArrayToElementArray<A extends readonly TokenDefinition[], I extends 0 | 1 | 2, V = undefined> = {
  readonly [P in keyof A]: ReplaceType<A[P][I], undefined, V>;
};

type TokenArrayToKeywordsArray<A extends readonly TokenDefinition[]> = readonly {
  readonly [I in ToIndex<keyof A>]: A[I][1] extends Lowercase<A[I][0]> ? A[I][1] : never;
}[ToIndex<keyof A>][];

type KeywordsArrayToEnumLike<A extends readonly string[]> = {
  readonly [P in A[number]]: typeof Token[Uppercase<P> & keyof typeof Token];
};

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
] as const satisfies readonly TokenDefinition[];

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
  ...MaybeAssignTokens.map((t) => [`ASSIGN_${t[0]}`, `${t[1]}=`, 2]) as readonly TokenDefinition[] as TokenArrayToAssignTokenArray<typeof MaybeAssignTokens>,
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
  ['AT', '@'],

  ['ENUM', 'enum'],

  ['ESCAPED_KEYWORD', null],
] as const satisfies readonly TokenDefinition[];

export const Token = RawTokens
  .reduce((obj, [name], i) => {
    obj[name] = i;
    return obj;
  }, Object.create(null)) as TokenArrayToEnumLike<typeof RawTokens>;

export type Token = typeof Token[keyof typeof Token];

export const TokenNames = RawTokens.map((r) => r[0]) as readonly string[] as TokenArrayToElementArray<typeof RawTokens, 0>;

export const TokenValues = RawTokens.map((r) => r[1]) as readonly (string | null)[] as TokenArrayToElementArray<typeof RawTokens, 1>;

export const TokenPrecedence = RawTokens.map((r) => (r[2] || 0)) as readonly number[] as TokenArrayToElementArray<typeof RawTokens, 2, 0>;

const Keywords = RawTokens
  .filter(([name, raw]) => name.toLowerCase() === raw)
  .map(([, raw]) => raw!) as TokenArrayToKeywordsArray<typeof RawTokens>;

export const KeywordLookup = Keywords
  .reduce((obj, kw) => {
    obj[kw] = Token[kw.toUpperCase() as Uppercase<typeof kw>];
    return obj;
  }, Object.create(null)) as KeywordsArrayToEnumLike<typeof Keywords>;

const KeywordRaw: ReadonlySet<string> = new Set(Object.keys(KeywordLookup));
const KeywordTokens: ReadonlySet<number> = new Set(Object.values(KeywordLookup));

const isInRange = (t: number, l: number, h: number) => t >= l && t <= h;
export const isAutomaticSemicolon = (t: number) => isInRange(t, Token.SEMICOLON, Token.EOS);
export const isMember = (t: number) => isInRange(t, Token.TEMPLATE, Token.LBRACK);
export const isPropertyOrCall = (t: number) => isInRange(t, Token.TEMPLATE, Token.LPAREN);
export const isKeyword = (t: number): t is typeof KeywordLookup[keyof typeof KeywordLookup] => KeywordTokens.has(t);
export const isKeywordRaw = (s: string): s is keyof typeof KeywordLookup => KeywordRaw.has(s);

const ReservedWordsStrict: ReadonlySet<string> = new Set([
  'implements', 'interface', 'let',
  'package', 'private', 'protected',
  'public', 'static', 'yield',
]);

export const isReservedWordStrict = (s: string) => ReservedWordsStrict.has(s);
