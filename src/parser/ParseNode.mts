import type { ArrowInfo } from './Scope.mjs';

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface Location {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly start: Position;
  readonly end: Position;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ParseNode {
  export interface BaseParseNode {
    // NOTE: while we could use `string` here, by limiting `type` to only those types defined in the `ParseNode`
    //       union we can ensure that new subtypes of `BaseParseNode` are correctly added to the union.
    readonly type: ParseNode['type'];
    readonly location: Location;
    readonly strict: boolean;
    readonly sourceText: () => string;
  }

  // A.1 Lexical Grammar
  // https://tc39.es/ecma262/#sec-lexical-grammar

  // PrivateIdentifier ::
  //   `#` IdentifierName
  export interface PrivateIdentifier extends BaseParseNode {
    readonly type: 'PrivateIdentifier';
    readonly name: string;
  }

  // IdentifierName ::
  //   IdentifierStart
  //   IdentifierName IdentifierPart
  export interface IdentifierName extends BaseParseNode {
    readonly type: 'IdentifierName';
    readonly name: string;
  }

  // NullLiteral ::
  //   `null`
  export interface NullLiteral extends BaseParseNode {
    readonly type: 'NullLiteral';
  }

  // BooleanLiteral ::
  //   `true`
  //   `false`
  export interface BooleanLiteral extends BaseParseNode {
    readonly type: 'BooleanLiteral';
    readonly value: boolean;
  }

  // NumericLiteral ::
  //   DecimalLiteral
  //   DecimalBigIntegerLiteral
  //   NonDecimalIntegerLiteral
  //   NonDecimalIntegerLiteral BigIntLiteralSuffix
  //   LegacyOctalIntegerLiteral
  export interface NumericLiteral extends BaseParseNode {
    readonly type: 'NumericLiteral';
    readonly value: number | bigint;
  }

  // StringLiteral ::
  //   `"` DoubleStringCharacters? `"`
  //   `'` SingleStringCharacters? `'`
  export interface StringLiteral extends BaseParseNode {
    readonly type: 'StringLiteral';
    readonly value: string;
  }

  // RegularExpressionLiteral ::
  //   `/` RegularExpressionBody `/` RegularExpressionFlags
  export interface RegularExpressionLiteral extends BaseParseNode {
    readonly type: 'RegularExpressionLiteral';
    readonly RegularExpressionBody: string;
    readonly RegularExpressionFlags: string;
  }

  // A.2 Expressions
  // https://tc39.es/ecma262/#sec-expressions

  // IdentifierReference :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  //
  // Identifier :
  //   IdentifierName but not ReservedWord
  export interface IdentifierReference extends BaseParseNode {
    readonly type: 'IdentifierReference';
    readonly escaped: boolean;
    readonly name: string;
  }

  // BindingIdentifier :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  //
  // Identifier :
  //   IdentifierName but not ReservedWord
  export interface BindingIdentifier extends BaseParseNode {
    readonly type: 'BindingIdentifier';
    readonly name: string;
  }

  // LabelIdentifier :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  //
  // Identifier :
  //   IdentifierName but not ReservedWord
  export interface LabelIdentifier extends BaseParseNode {
    readonly type: 'LabelIdentifier';
    readonly name: string;
  }

  // PrimaryExpression :
  //   `this`
  //   IdentifierReference
  //   Literal
  //   ArrayLiteral
  //   ObjectLiteral
  //   FunctionExpression
  //   ClassExpression
  //   GeneratorExpression
  //   AsyncFunctionExpression
  //   AsyncGeneratorExpression
  //   RegularExpressionLiteral
  //   TemplateLiteral
  //   CoverParenthesizedExpressionAndArrowParameterList
  export type PrimaryExpression =
    | ThisExpression
    | IdentifierReference
    | Literal
    | ArrayLiteral
    | ObjectLiteral
    | FunctionExpression
    | ClassExpression
    | GeneratorExpression
    | AsyncFunctionExpression
    | AsyncGeneratorExpression
    | RegularExpressionLiteral
    | TemplateLiteral
    | CoverParenthesizedExpressionAndArrowParameterList
    | ParenthesizedExpression;

  // PrimaryExpression (partial) :
  //   `this`
  export interface ThisExpression extends BaseParseNode {
    readonly type: 'ThisExpression';
  }

  // CoverParenthesizedExpressionAndArrowParameterList :
  //   `(` Expression `)`
  //   `(` Expression `,` `)`
  //   `(` `)`
  //   `(` `...` BindingIdentifier `)`
  //   `(` `...` BindingPattern `)`
  //   `(` Expression `,` `...` BindingIdentifier `)`
  //   `(` Expression `.` `...` BindingPattern `)`
  export interface CoverParenthesizedExpressionAndArrowParameterList extends BaseParseNode {
    readonly type: 'CoverParenthesizedExpressionAndArrowParameterList';
    readonly Arguments: readonly (ArgumentListElement | BindingRestElement)[];
    readonly arrowInfo?: ArrowInfo;
  }

  // CoverParenthesizedExpressionAndArrowParameterList (partial) :
  //   `(` Expression `)`
  //
  // ParenthesizedExpression (refined) :
  //   `(` Expression `)`
  export interface ParenthesizedExpression extends BaseParseNode {
    readonly type: 'ParenthesizedExpression';
    readonly Expression: Expression;
  }

  // Literal :
  //   NullLiteral
  //   BooleanLiteral
  //   NumericLiteral
  //   StringLiteral
  export type Literal =
    | NullLiteral
    | BooleanLiteral
    | NumericLiteral
    | StringLiteral;

  // ArrayLiteral :
  //   `[` `]`
  //   `[` Elision `]`
  //   `[` ElementList `]`
  //   `[` ElementList `,` `]`
  //   `[` ElementList `,` Elision `]`
  export interface ArrayLiteral extends BaseParseNode {
    readonly type: 'ArrayLiteral';
    readonly ElementList: ElementList;
    readonly hasTrailingComma: boolean;
  }

  // ElementList :
  //   Elision? AssignmentExpression
  //   Elision? SpreadElement
  //   ElementList `,` Elision? AssignmentExpression
  //   ElementList `,` Elision? SpreadElement
  export type ElementList = readonly ElementListElement[];

  // NON-SPEC
  export type ElementListElement =
    | AssignmentExpressionOrHigher
    | SpreadElement
    | Elision;

  // Elision :
  //   `,`
  //   Elision `,`
  export interface Elision extends BaseParseNode {
    readonly type: 'Elision';
  }

  // SpreadElement :
  // `...` AssignmentExpression
  export interface SpreadElement extends BaseParseNode {
    readonly type: 'SpreadElement';
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // ObjectLiteral :
  //   `{` `}`
  //   `{` PropertyDefinitionList `}`
  //   `{` PropertyDefinitionList `,` `}`
  export interface ObjectLiteral extends BaseParseNode {
    readonly type: 'ObjectLiteral';
    readonly PropertyDefinitionList: PropertyDefinitionList;
  }

  // PropertyDefinitionList :
  //   PropertyDefinition
  //   PropertyDefinitionList `,` PropertyDefinition
  export type PropertyDefinitionList = readonly PropertyDefinitionLike[];

  // PropertyDefinition :
  //   IdentifierReference
  //   CoverInitializedName
  //   PropertyName `:` AssignmentExpression
  //   MethodDefinition
  //   `...` AssignmentExpression
  export type PropertyDefinitionLike =
    | IdentifierReference
    | CoverInitializedName
    | PropertyDefinition
    | MethodDefinitionLike;

  // PropertyDefinition (partial) :
  //   PropertyName `:` AssignmentExpression
  //   `...` AssignmentExpression
  export interface PropertyDefinition extends BaseParseNode {
    readonly type: 'PropertyDefinition';
    readonly PropertyName: PropertyNameLike | null;
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // PropertyName :
  //   LiteralPropertyName
  //   ComputedPropertyName
  //
  // LiteralPropertyName :
  //   IdentifierName
  //   StringLiteral
  //   NumericLiteral
  //
  // ComputedPropertyName :
  //   `[` AssignmentExpression `]`
  export type PropertyNameLike =
    | PropertyName
    | StringLiteral
    | NumericLiteral
    | IdentifierName;

  // PropertyName (partial) :
  //   ComputedPropertyName
  //
  // ComputedPropertyName :
  //   `[` AssignmentExpression `]`
  export interface PropertyName extends BaseParseNode {
    readonly type: 'PropertyName';
    readonly ComputedPropertyName: AssignmentExpressionOrHigher;
  }

  // CoverInitializedName :
  //   IdentifierReference Initializer
  export interface CoverInitializedName extends BaseParseNode {
    readonly type: 'CoverInitializedName';
    readonly IdentifierReference: IdentifierReference;
    readonly Initializer: Initializer | null;
  }

  // Initializer :
  //   `=` AssignmentExpression
  export type Initializer = AssignmentExpressionOrHigher;

  // TemplateLiteral :
  //   NoSubstitutionTemplate
  //   SubstitutionTemplate
  //
  // SubstitutionTemplate :
  //   TemplateHead Expression TemplateSpans
  //
  // TemplateSpans :
  //   TemplateTail
  //   TemplateMiddleList TemplateTail
  //
  // TemplateMiddleList :
  //   TemplateMiddle Expression
  //   TemplateMiddleList TemplateMiddle Expression
  export interface TemplateLiteral extends BaseParseNode {
    readonly type: 'TemplateLiteral';
    readonly TemplateSpanList: readonly string[];
    readonly ExpressionList: readonly Expression[];
  }

  // MemberExpression :
  //   PrimaryExpression
  //   MemberExpression `[` Expression `]`
  //   MemberExpression `.` IdentifierName
  //   MemberExpression TemplateLiteral
  //   SuperProperty
  //   MetaProperty
  //   `new` MemberExpression Arguments
  //   MemberExpression `.` PrivateIdentifier
  export type MemberExpressionOrHigher =
    | PrimaryExpression
    | MemberExpression
    | SuperProperty
    | MetaProperty
    | NewExpression;

  // MemberExpression :
  //   MemberExpression `[` Expression `]`
  //   MemberExpression `.` IdentifierName
  //   MemberExpression `.` PrivateIdentifier
  export interface MemberExpression extends BaseParseNode {
    readonly type: 'MemberExpression';

    /// MemberExpression : MemberExpression `[` Expression `]`
    // readonly MemberExpression: LeftHandSideExpression; // NOTE: Should be MemberExpressionOrHigher
    // readonly Expression: Expression | null;

    /// MemberExpression : MemberExpression `.` IdentifierName
    // readonly MemberExpression: LeftHandSideExpression; // NOTE: Should be MemberExpressionOrHigher
    // readonly IdentifierName: IdentifierName | null;

    /// MemberExpression : MemberExpression `.` PrivateIdentifier
    // readonly MemberExpression: LeftHandSideExpression; // NOTE: Should be MemberExpressionOrHigher
    // readonly PrivateIdentifier: PrivateIdentifier | null;

    readonly MemberExpression: LeftHandSideExpression; // NOTE: Should be MemberExpressionOrHigher
    readonly Expression: Expression | null;
    readonly IdentifierName: IdentifierName | null;
    readonly PrivateIdentifier: PrivateIdentifier | null;
  }

  // SuperProperty :
  //   super `[` Expression `]`
  //   super `.` IdentifierName
  export interface SuperProperty extends BaseParseNode {
    readonly type: 'SuperProperty';

    /// SuperProperty : super `[` Expression `]`
    // readonly Expression: Expression | null;

    /// SuperProperty : super `.` IdentifierName
    // readonly IdentifierName: IdentifierName | null;

    readonly Expression: Expression | null;
    readonly IdentifierName: IdentifierName | null;
  }

  // MetaProperty :
  //   NewTarget
  //   ImportMeta
  export type MetaProperty =
    | NewTarget
    | ImportMeta;

  // NewTarget :
  //   `new` `.` `target`
  export interface NewTarget extends BaseParseNode {
    readonly type: 'NewTarget';
  }

  // ImportMeta :
  //   `import` `.` `meta`
  export interface ImportMeta extends BaseParseNode {
    readonly type: 'ImportMeta';
  }

  // NewExpression :
  //   MemberExpression
  //   `new` NewExpression
  export type NewExpressionOrHigher =
    | MemberExpressionOrHigher
    | NewExpression;

  // NewExpression (partial) :
  //   `new` NewExpression
  //
  // MemberExpression (partial) :
  //   `new` MemberExpression Arguments
  export interface NewExpression extends BaseParseNode {
    readonly type: 'NewExpression';
    // NOTE: Should be NewExpressionOrHigher | MemberExpressionOrHigher
    readonly MemberExpression: LeftHandSideExpression;
    readonly Arguments: Arguments | null;
  }

  // CallExpression :
  //   CoverCallExpressionAndAsyncArrowHead
  //   SuperCall
  //   ImportCall
  //   CallExpression Arguments
  //   CallExpression `[` Expression `]`
  //   CallExpression `.` IdentifierName
  //   CallExpression TemplateLiteral
  //   CallExpression `.` PrivateIdentifier
  export type CallExpressionOrHigher =
    // CoverCallExpressionAndAsyncArrowHead
    | SuperCall
    | ImportCall
    | CallExpression
    | MemberExpression
    | TaggedTemplateExpression;

  // CallExpression (partial) :
  //   CoverCallExpressionAndAsyncArrowHead
  //   CallExpression Arguments
  //
  // CallMemberExpression (refined) :
  //   MemberExpression Arguments
  export interface CallExpression extends BaseParseNode {
    readonly type: 'CallExpression';
    readonly CallExpression: CallExpressionOrHigher | MemberExpressionOrHigher;
    readonly Arguments: Arguments;
    // NON-SPEC
    readonly arrowInfo?: ArrowInfo;
  }

  // CallExpression (partial) :
  //   CallExpression TemplateLiteral
  //
  // MemberExpression (partial) :
  //   MemberExpression TemplateLiteral
  export interface TaggedTemplateExpression extends BaseParseNode {
    readonly type: 'TaggedTemplateExpression';
    readonly MemberExpression: CallExpressionOrHigher | MemberExpressionOrHigher;
    readonly TemplateLiteral: TemplateLiteral;
    // NON-SPEC
    readonly arrowInfo?: ArrowInfo;
  }

  // SuperCall :
  //   `super` Arguments
  export interface SuperCall extends BaseParseNode {
    readonly type: 'SuperCall';
    readonly Arguments: Arguments;
  }

  // ImportCall :
  //   `import` `(` AssignmentExpression `)`
  export interface ImportCall extends BaseParseNode {
    readonly type: 'ImportCall';
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // Arguments :
  //   `(` `)`
  //   `(` ArgumentList `)`
  //   `(` ArgumentList `,` `)`
  //
  // ArgumentList :
  //   AssignmentExpression
  //   `...` AssignmentExpression
  //   ArgumentList `,` AssignmentExpression
  //   ArgumentList `,` `...` AssignmentExpression
  export type Arguments = readonly ArgumentListElement[];

  // NON-SPEC
  export type ArgumentListElement =
    | AssignmentExpressionOrHigher
    | AssignmentRestElement;

  // OptionalExpression :
  //   MemberExpression OptionalChain
  //   CallExpression OptionalChain
  //   OptionalExpression OptionalChain
  export interface OptionalExpression extends BaseParseNode {
    readonly type: 'OptionalExpression';
    // NOTE: The following doesn't match how this is handled in other nodes.
    readonly MemberExpression: MemberExpressionOrHigher | CallExpressionOrHigher | OptionalExpression;
    readonly OptionalChain: OptionalChain;
  }

  // OptionalChain :
  //   `?.` Arguments
  //   `?.` `[` Expression `]`
  //   `?.` IdentifierName
  //   `?.` PrivateIdentifier
  //   OptionalChain `?.` Arguments
  //   OptionalChain `?.` `[` Expression `]`
  //   OptionalChain `?.` IdentifierName
  //   OptionalChain `?.` PrivateIdentifier
  export interface OptionalChain extends BaseParseNode {
    readonly type: 'OptionalChain';

    /// OptionalChain : `?.` Arguments
    // readonly Arguments?: Arguments;

    /// OptionalChain : `?.` `[` Expression `]`
    // readonly Expression?: Expression;

    /// OptionalChain : `?.` IdentifierName
    // readonly IdentifierName?: IdentifierName;

    /// OptionalChain : `?.` PrivateIdentifier
    // readonly PrivateIdentifier?: PrivateIdentifier;

    /// OptionalChain : OptionalChain `?.` Arguments
    // readonly OptionalChain: OptionalChain | null;
    // readonly Arguments?: Arguments;

    /// OptionalChain : OptionalChain `?.` `[` Expression `]`
    // readonly OptionalChain: OptionalChain | null;
    // readonly Expression?: Expression;

    /// OptionalChain : OptionalChain `?.` IdentifierName
    // readonly OptionalChain: OptionalChain | null;
    // readonly IdentifierName?: IdentifierName;

    /// OptionalChain : OptionalChain `?.` PrivateIdentifier
    // readonly OptionalChain: OptionalChain | null;
    // readonly PrivateIdentifier?: PrivateIdentifier;

    readonly OptionalChain: OptionalChain | null;
    readonly Arguments?: Arguments;
    readonly Expression?: Expression;
    readonly IdentifierName?: IdentifierName;
    readonly PrivateIdentifier?: PrivateIdentifier;
  }

  // LeftHandSideExpression :
  //   NewExpression
  //   CallExpression
  //   OptionalExpression
  export type LeftHandSideExpression =
    | NewExpressionOrHigher
    | CallExpressionOrHigher
    | OptionalExpression;

  // UpdateExpression :
  //   LeftHandSideExpression
  //   LeftHandSideExpression [no LineTerminator here] `++`
  //   LeftHandSideExpression [no LineTerminator here] `--`
  //   `++` UnaryExpression
  //   `--` UnaryExpression
  export type UpdateExpressionOrHigher =
    | LeftHandSideExpression
    | UpdateExpression;

  // UpdateExpression (partial) :
  //   LeftHandSideExpression [no LineTerminator here] `++`
  //   LeftHandSideExpression [no LineTerminator here] `--`
  //   `++` UnaryExpression
  //   `--` UnaryExpression
  export interface UpdateExpression extends BaseParseNode {
    readonly type: 'UpdateExpression';

    /// UpdateExpression :
    ///   LeftHandSideExpression [no LineTerminator here] `++`
    ///   LeftHandSideExpression [no LineTerminator here] `--`
    // readonly LeftHandSideExpression: LeftHandSideExpression | null;
    // readonly operator: '++' | '--';

    /// UpdateExpression :
    ///   `++` UnaryExpression
    ///   `--` UnaryExpression
    // readonly operator: '++' | '--';
    // readonly UnaryExpression: UnaryExpressionOrHigher | null;

    readonly operator: '++' | '--';
    readonly LeftHandSideExpression: LeftHandSideExpression | null;
    readonly UnaryExpression: UnaryExpressionOrHigher | null;
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
  export type UnaryExpressionOrHigher =
    | UpdateExpressionOrHigher
    | UnaryExpression
    | AwaitExpression;

  // UnaryExpression (partial) :
  //   `delete` UnaryExpression
  //   `void` UnaryExpression
  //   `typeof` UnaryExpression
  //   `+` UnaryExpression
  //   `-` UnaryExpression
  //   `~` UnaryExpression
  //   `!` UnaryExpression
  export interface UnaryExpression extends BaseParseNode {
    readonly type: 'UnaryExpression';
    readonly operator: 'delete' | 'void' | 'typeof' | '+' | '-' | '~' | '!';
    readonly UnaryExpression: UnaryExpressionOrHigher;
  }

  // ExponentiationExpression :
  //   UnaryExpression
  //   UpdateExpresion `**` ExponentiationExpression
  export type ExponentiationExpressionOrHigher =
    | UnaryExpressionOrHigher
    | ExponentiationExpression;

  // ExponentiationExpression (partial) :
  //   UpdateExpresion `**` ExponentiationExpression
  export interface ExponentiationExpression extends BaseParseNode {
    readonly type: 'ExponentiationExpression';
    readonly UpdateExpression: UpdateExpressionOrHigher;
    readonly ExponentiationExpression: ExponentiationExpressionOrHigher;
  }

  // MultiplicativeExpression :
  //   ExponentiationExpression
  //   MultiplicativeExpression MultiplicativeOperator ExponentiationExpression
  export type MultiplicativeExpressionOrHigher =
    | ExponentiationExpressionOrHigher
    | MultiplicativeExpression;

  // MultiplicativeExpression (partial) :
  //   MultiplicativeExpression MultiplicativeOperator ExponentiationExpression
  export interface MultiplicativeExpression extends BaseParseNode {
    readonly type: 'MultiplicativeExpression';
    readonly MultiplicativeExpression: MultiplicativeExpressionOrHigher;
    readonly MultiplicativeOperator: MultiplicativeOperator;
    readonly ExponentiationExpression: ExponentiationExpressionOrHigher;
  }

  // MultiplicativeOperator : one of
  //   `*`  `/`  `%`;
  export type MultiplicativeOperator = '*' | '/' | '%';

  // AdditiveExpression :
  //   MultiplicativeExpression
  //   AdditiveExpression `+` MultiplicativeExpression
  //   AdditiveExpression `-` MultiplicativeExpression
  export type AdditiveExpressionOrHigher =
    | MultiplicativeExpressionOrHigher
    | AdditiveExpression;

  // AdditiveExpression (partial) :
  //   AdditiveExpression `+` MultiplicativeExpression
  //   AdditiveExpression `-` MultiplicativeExpression
  export interface AdditiveExpression extends BaseParseNode {
    readonly type: 'AdditiveExpression';
    readonly operator: '+' | '-';
    readonly AdditiveExpression: AdditiveExpressionOrHigher;
    readonly MultiplicativeExpression: MultiplicativeExpressionOrHigher;
  }

  // ShiftExpression :
  //   AdditiveExpression
  //   ShiftExpression `<<` AdditiveExpression
  //   ShiftExpression `>>` AdditiveExpression
  //   ShiftExpression `>>>` AdditiveExpression
  export type ShiftExpressionOrHigher =
    | AdditiveExpressionOrHigher
    | ShiftExpression;

  // ShiftExpression (partial) :
  //   ShiftExpression `<<` AdditiveExpression
  //   ShiftExpression `>>` AdditiveExpression
  //   ShiftExpression `>>>` AdditiveExpression
  export interface ShiftExpression extends BaseParseNode {
    readonly type: 'ShiftExpression';
    readonly operator: '<<' | '>>' | '>>>';
    readonly ShiftExpression: ShiftExpressionOrHigher;
    readonly AdditiveExpression: AdditiveExpressionOrHigher;
  }

  // RelationalExpression :
  //   ShiftExpression
  //   RelationalExpression `<` ShiftExpression
  //   RelationalExpression `>` ShiftExpression
  //   RelationalExpression `<=` ShiftExpression
  //   RelationalExpression `>=` ShiftExpression
  //   RelationalExpression `instanceof` ShiftExpression
  //   RelationalExpression `in` ShiftExpression
  export type RelationalExpressionOrHigher =
    | ShiftExpressionOrHigher
    | RelationalExpression;

  // RelationalExpression (partial) :
  //   RelationalExpression `<` ShiftExpression
  //   RelationalExpression `>` ShiftExpression
  //   RelationalExpression `<=` ShiftExpression
  //   RelationalExpression `>=` ShiftExpression
  //   RelationalExpression `instanceof` ShiftExpression
  //   RelationalExpression `in` ShiftExpression
  //   PrivateIdentifier `in` ShiftExpression
  export interface RelationalExpression extends BaseParseNode {
    readonly type: 'RelationalExpression';
    readonly operator: '<' | '>' | '<=' | '>=' | 'instanceof' | 'in';
    readonly PrivateIdentifier?: PrivateIdentifier;
    readonly RelationalExpression?: RelationalExpressionOrHigher;
    readonly ShiftExpression: ShiftExpressionOrHigher;
  }

  // EqualityExpression :
  //   RelationalExpression
  //   EqualityExpression == RelationalExpression
  //   EqualityExpression != RelationalExpression
  //   EqualityExpression === RelationalExpression
  //   EqualityExpression !== RelationalExpression
  export type EqualityExpressionOrHigher =
    | RelationalExpressionOrHigher
    | EqualityExpression;

  // EqualityExpression (partial) :
  //   EqualityExpression == RelationalExpression
  //   EqualityExpression != RelationalExpression
  //   EqualityExpression === RelationalExpression
  //   EqualityExpression !== RelationalExpression
  export interface EqualityExpression extends BaseParseNode {
    readonly type: 'EqualityExpression';
    readonly operator: '==' | '!=' | '===' | '!==';
    readonly EqualityExpression: EqualityExpressionOrHigher;
    readonly RelationalExpression: RelationalExpressionOrHigher;
  }

  // BitwiseANDExpression :
  //   EqualityExpression
  //   BitwiseANDExpression `^&` EqualityExpression
  export type BitwiseANDExpressionOrHigher =
    | EqualityExpressionOrHigher
    | BitwiseANDExpression;

  // BitwiseANDExpression (partial) :
  //   BitwiseANDExpression `^&` EqualityExpression
  export interface BitwiseANDExpression extends BaseParseNode {
    readonly type: 'BitwiseANDExpression';
    readonly operator: '&';
    readonly A: BitwiseANDExpressionOrHigher;
    readonly B: EqualityExpressionOrHigher;
  }

  // BitwiseXORExpression :
  //   BitwiseANDExpression
  //   BitwiseXORExpression `^` BitwiseANDExpression
  export type BitwiseXORExpressionOrHigher =
    | BitwiseANDExpressionOrHigher
    | BitwiseXORExpression;

  // BitwiseXORExpression (partial) :
  //   BitwiseXORExpression `^` BitwiseANDExpression
  export interface BitwiseXORExpression extends BaseParseNode {
    readonly type: 'BitwiseXORExpression';
    readonly operator: '^';
    readonly A: BitwiseXORExpressionOrHigher;
    readonly B: BitwiseANDExpressionOrHigher;
  }

  // BitwiseORExpression :
  //   BitwiseXORExpression
  //   BitwiseORExpression `|` BitwiseXORExpression
  export type BitwiseORExpressionOrHigher =
    | BitwiseXORExpressionOrHigher
    | BitwiseORExpression;

  // BitwiseORExpression (partial) :
  //   BitwiseORExpression `|` BitwiseXORExpression
  export interface BitwiseORExpression extends BaseParseNode {
    readonly type: 'BitwiseORExpression';
    readonly operator: '|';
    readonly A: BitwiseORExpressionOrHigher;
    readonly B: BitwiseXORExpressionOrHigher;
  }

  // LogicalANDExpression :
  //   BitwiseORExpression
  //   LogicalANDExpression `&&` BitwiseORExpression
  export type LogicalANDExpressionOrHigher =
    | BitwiseORExpressionOrHigher
    | LogicalANDExpression;

  // LogicalANDExpression (partial) :
  //   LogicalANDExpression `&&` BitwiseORExpression
  export interface LogicalANDExpression extends BaseParseNode {
    readonly type: 'LogicalANDExpression';
    readonly LogicalANDExpression: LogicalANDExpressionOrHigher;
    readonly BitwiseORExpression: BitwiseORExpressionOrHigher;
  }

  // LogicalORExpression :
  //   LogicalANDExpression
  //   LogicalORExpression `||` LogicalANDExpression
  export type LogicalORExpressionOrHigher =
    | LogicalANDExpressionOrHigher
    | LogicalORExpression;

  // LogicalORExpression (partial) :
  //   LogicalORExpression `||` LogicalANDExpression
  export interface LogicalORExpression extends BaseParseNode {
    readonly type: 'LogicalORExpression';
    readonly LogicalORExpression: LogicalORExpressionOrHigher;
    readonly LogicalANDExpression: LogicalANDExpressionOrHigher;
  }

  // CoalesceExpression :
  //   CoalesceExpressionHead `??` BitwiseORExpression
  export interface CoalesceExpression extends BaseParseNode {
    readonly type: 'CoalesceExpression';
    readonly CoalesceExpressionHead: CoalesceExpressionHead;
    readonly BitwiseORExpression: BitwiseORExpressionOrHigher;
  }

  // CoalesceExpressionHead :
  //   CoalesceExpression
  //   BitwiseORExpression
  export type CoalesceExpressionHead =
    | BitwiseORExpressionOrHigher
    | CoalesceExpression;

  // ShortCircuitExpression :
  //   LogicalORExpression
  //   CoalesceExpression
  export type ShortCircuitExpressionOrHigher =
    | LogicalORExpressionOrHigher
    | CoalesceExpression;

  // ConditionalExpression :
  //   ShortCircuitExpression
  //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
  export type ConditionalExpressionOrHigher =
    | ShortCircuitExpressionOrHigher
    | ConditionalExpression;

  // ConditionalExpression (partial) :
  //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
  export interface ConditionalExpression extends BaseParseNode {
    readonly type: 'ConditionalExpression';
    readonly ShortCircuitExpression: ShortCircuitExpressionOrHigher;
    readonly AssignmentExpression_a: AssignmentExpressionOrHigher;
    readonly AssignmentExpression_b: AssignmentExpressionOrHigher;
  }

  // AssignmentExpression :
  //   ConditionalExpression
  //   [+Yield] YieldExpression
  //   ArrowFunction
  //   AsyncArrowFunction
  //   LeftHandSideExpression `=` AssignmentExpression
  //   LeftHandSideExpression AssignmentOperator AssignmentExpression
  //   LeftHandSideExpression LogicalAssignmentOperator AssignmentExpression
  export type AssignmentExpressionOrHigher =
    | ConditionalExpressionOrHigher
    | YieldExpression
    | ArrowFunction
    | AsyncArrowFunction
    | AssignmentExpression;

  // AssignmentExpression (partial) :
  //   LeftHandSideExpression `=` AssignmentExpression
  //   LeftHandSideExpression AssignmentOperator AssignmentExpression
  //   LeftHandSideExpression LogicalAssignmentOperator AssignmentExpression
  //
  export interface AssignmentExpression extends BaseParseNode {
    readonly type: 'AssignmentExpression';
    // NOTE: Should be LeftHandSideExpression, but some invalid nodes are allowed as they report early errors
    readonly LeftHandSideExpression: AssignmentExpressionOrHigher;
    readonly AssignmentOperator: '=' | AssignmentOperator | '&&=' | '||=' | '??=';
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // AssignmentOperator : one of
  //   `*=`  `/=`  `%=`  `+=`  `-=`  `<<=`  `>>=`  `>>>=`  `&=`  `^=`  `|=`  `**=`
  export type AssignmentOperator = '*=' | '/=' | '%=' | '+=' | '-=' | '<<=' | '>>=' | '>>>=' | '&=' | '^=' | '|=' | '**=';

  // AssignmentRestElement :
  //   `...` DestructuringAssignmentTarget
  //
  // ArgumentList (partial) :
  //   `...` AssignmentExpression
  //   ArgumentList `,` `...` AssignmentExpression
  export interface AssignmentRestElement extends BaseParseNode {
    readonly type: 'AssignmentRestElement';
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // NON-SPEC
  export type BinaryExpressionOrHigher =
    | BinaryExpression
    | UnaryExpressionOrHigher;

  // NON-SPEC
  export type BinaryExpression =
    | AssignmentExpression
    | LogicalORExpression
    | LogicalANDExpression
    | BitwiseORExpression
    | BitwiseXORExpression
    | BitwiseANDExpression
    | RelationalExpression
    | EqualityExpression
    | ShiftExpression
    | AdditiveExpression
    | MultiplicativeExpression
    | ExponentiationExpression;

  // Expression :
  //   AssignmentExpression
  //   Expression `,` AssignmentExpression
  export type Expression =
    | CommaOperator
    | AssignmentExpressionOrHigher;

  // Expression (partial) :
  //   Expression `,` AssignmentExpression
  export interface CommaOperator extends BaseParseNode {
    readonly type: 'CommaOperator';
    readonly ExpressionList: readonly AssignmentExpressionOrHigher[];
  }

  // A.3 Statements
  // https://tc39.es/ecma262/#sec-statements

  // Statement :
  //   BlockStatement
  //   VariableStatement
  //   EmptyStatement
  //   ExpressionStatement
  //   IfStatement
  //   BreakableStatement
  //   ContinueStatement
  //   BreakStatement
  //   [+Return] ReturnStatement
  //   WithStatement
  //   LabelledStatement
  //   ThrowStatement
  //   TryStatement
  //   DebuggerStatement
  export type Statement =
    | BlockStatement
    | VariableStatement
    | EmptyStatement
    | ExpressionStatement
    | IfStatement
    | BreakableStatement
    | ContinueStatement
    | BreakStatement
    | ReturnStatement
    | WithStatement
    | LabelledStatement
    | ThrowStatement
    | TryStatement
    | DebuggerStatement;

  // Declaration :
  //   HoistableDeclaration
  //   ClassDeclaration
  //   LexicalDeclarationLike
  export type Declaration =
    | HoistableDeclaration
    | ClassDeclaration
    | LexicalDeclarationLike;

  // HoistableDeclaration
  //   FunctionDeclaration
  //   GeneratorDeclaration
  //   AsyncFunctionDeclaration
  //   AsyncGeneratorDeclaration
  export type HoistableDeclaration =
    | FunctionDeclaration
    | GeneratorDeclaration
    | AsyncFunctionDeclaration
    | AsyncGeneratorDeclaration;

  // BreakableStatement :
  //   IterationStatement
  //   SwitchStatement
  export type BreakableStatement =
    | IterationStatement
    | SwitchStatement;

  // BlockStatement :
  //   Block
  export type BlockStatement =
    | Block;

  // Block :
  //   `{` StatementList `}`
  export interface Block extends BaseParseNode {
    readonly type: 'Block';
    readonly StatementList: StatementList;
  }

  // StatementList :
  //   StatementListItem
  //   StatementList StatementListItem
  export type StatementList = readonly StatementListItem[];

  // StatementListItem :
  //   Statement
  //   Declaration
  export type StatementListItem =
    | Statement
    | Declaration;

  // LexicalDeclaration :
  //   LetOrConst BindingList `;`
  export type LexicalDeclarationLike =
    | LexicalDeclaration;

  // LexicalDeclaration :
  //   LetOrConst BindingList `;`
  export interface LexicalDeclaration extends BaseParseNode {
    readonly type: 'LexicalDeclaration';
    readonly LetOrConst: LetOrConst;
    readonly BindingList: BindingList;
  }

  // LetOrConst :
  //   `let`
  //   `const`
  export type LetOrConst =
    | 'let'
    | 'const';

  // BindingList :
  //   LexicalBinding
  //   BindingList `,` LexicalBinding
  export type BindingList = readonly LexicalBinding[];

  // LexicalBinding :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  export interface LexicalBinding extends BaseParseNode {
    readonly type: 'LexicalBinding';

    // LexicalBinding : BindingIdentifier Initializer?
    readonly BindingIdentifier?: BindingIdentifier;

    // LexicalBinding : BindingPattern Initializer
    readonly BindingPattern?: BindingPattern;

    readonly Initializer: Initializer | null;
  }

  // VariableStatement :
  //   `var` VariableDeclarationList `;`
  export interface VariableStatement extends BaseParseNode {
    readonly type: 'VariableStatement';
    readonly VariableDeclarationList: VariableDeclarationList;
  }

  // VariableDeclarationList :
  //   VariableDeclaration
  //   VariableDeclarationList `,` VariableDeclaration
  export type VariableDeclarationList = readonly VariableDeclaration[];

  // VariableDeclaration :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  export interface VariableDeclaration extends BaseParseNode {
    readonly type: 'VariableDeclaration';
    readonly BindingPattern?: BindingPattern;
    readonly BindingIdentifier?: BindingIdentifier;
    readonly Initializer: Initializer | null;
  }

  // BindingPattern :
  //   ObjectBindingPattern
  //   ArrayBindingPattern
  export type BindingPattern =
    | ObjectBindingPattern
    | ArrayBindingPattern;

  // ObjectBindingPattern :
  //   `{` `}`
  //   `{` BindingRestProperty `}`
  //   `{` BindingPropertyList `}`
  //   `{` BindingPropertyList `,` BindingRestProperty? `}`
  export interface ObjectBindingPattern extends BaseParseNode {
    readonly type: 'ObjectBindingPattern';
    readonly BindingPropertyList: BindingPropertyList;
    readonly BindingRestProperty?: BindingRestProperty;
  }

  // ArrayBindingPattern :
  //   `[` Elision? BindingRestElement `]`
  //   `[` BindingElementList `]`
  //   `[` BindingElementList `,` Elision? BindingRestElement `]`
  export interface ArrayBindingPattern extends BaseParseNode {
    readonly type: 'ArrayBindingPattern';
    readonly BindingElementList: BindingElementList;
    readonly BindingRestElement: BindingRestElement;
  }

  // BindingRestProperty :
  //  `...` BindingIdentifier
  export interface BindingRestProperty extends BaseParseNode {
    readonly type: 'BindingRestProperty';
    readonly BindingIdentifier: BindingIdentifier;
  }

  // BindingPropertyList :
  //   BindingProperty
  //   BindingPropertyList BindingProperty
  export type BindingPropertyList = readonly BindingPropertyLike[];

  // BindingElementList :
  //   BindingElisionElement
  //   BindingElementList `,` BindingElisionElement
  export type BindingElementList = readonly BindingElisionElement[];

  // BindingElisionElement :
  //   Elision? BindingElement
  export type BindingElisionElement =
    | BindingElementLike
    | Elision;

  // BindingProperty :
  //   SingleNameBinding
  //   PropertyName `:` BindingElement
  export type BindingPropertyLike =
    | BindingProperty
    | SingleNameBinding;

  // BindingProperty :
  //   PropertyName `:` BindingElement
  export interface BindingProperty extends BaseParseNode {
    readonly type: 'BindingProperty';
    readonly PropertyName: PropertyNameLike;
    readonly BindingElement: BindingElementLike;
  }

  // BindingElement :
  //   SingleNameBinding
  //   BindingPattern Initializer?
  export type BindingElementLike =
    | BindingElement
    | SingleNameBinding;

  // BindingElement (partial) :
  //   BindingPattern Initializer?
  export interface BindingElement extends BaseParseNode {
    readonly type: 'BindingElement';
    readonly BindingPattern: BindingPattern;
    readonly Initializer: Initializer | null;
  }

  // SingleNameBinding :
  //   BindingIdentifier Initializer?
  export interface SingleNameBinding extends BaseParseNode {
    readonly type: 'SingleNameBinding';
    readonly BindingIdentifier: BindingIdentifier;
    readonly Initializer: Initializer | null;
  }

  // BindingRestElement :
  //   `...` BindingIdentifier
  //   `...` BindingPattern
  export interface BindingRestElement extends BaseParseNode {
    readonly type: 'BindingRestElement';
    readonly BindingIdentifier?: BindingIdentifier;
    readonly BindingPattern?: BindingPattern;
  }

  // EmptyStatement :
  //   `;`
  export interface EmptyStatement extends BaseParseNode {
    readonly type: 'EmptyStatement';
  }

  // ExpressionStatement :
  //   [lookahead != `{`, `function`, `async` [no LineTerminator here] `function`, `class`, `let` `[` ] Expression `;`
  export interface ExpressionStatement extends BaseParseNode {
    readonly type: 'ExpressionStatement';
    readonly Expression: Expression;
  }

  // IfStatement :
  //   `if` `(` Expression `)` Statement `else` Statement
  //   `if` `(` Expression `)` Statement [lookahead ≠ `else`]
  export interface IfStatement extends BaseParseNode {
    readonly type: 'IfStatement';
    readonly Expression: Expression;
    readonly Statement_a: Statement;
    readonly Statement_b: Statement;
  }

  // IterationStatement :
  //   DoWhileStatement
  //   WhileStatement
  //   ForStatement
  //   ForInOfStatement
  export type IterationStatement =
    | DoWhileStatement
    | WhileStatement
    | ForStatement
    | ForInOfStatement;

  // DoWhileStatement :
  //   `do` Statement `while` `(` Expression `)` `;`
  export interface DoWhileStatement extends BaseParseNode {
    readonly type: 'DoWhileStatement';
    readonly Statement: Statement;
    readonly Expression: Expression;
  }

  // WhileStatement :
  //   `while` `(` Expression `)` Statement
  export interface WhileStatement extends BaseParseNode {
    readonly type: 'WhileStatement';
    readonly Expression: Expression;
    readonly Statement: Statement;
  }

  // ForStatement :
  //   `for` `(` [lookahead != `let` `[`] Expression? `;` Expression? `;` Expression? `)` Statement
  //   `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
  //   `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
  export interface ForStatement extends BaseParseNode {
    readonly type: 'ForStatement';

    /// ForStatement : `for` `(` [lookahead != `let` `[`] Expression? `;` Expression? `;` Expression? `)` Statement
    // Expression_a?: Expression;
    // Expression_b?: Expression;
    // Expression_c?: Expression;
    // Statement: Statement;

    /// ForStatement : `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
    // VariableDeclarationList: VariableDeclarationList;
    // Expression_a?: Expression;
    // Expression_b?: Expression;
    // Statement: Statement;

    /// ForStatement : `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
    // LexicalDeclaration?: LexicalDeclarationLike;
    // Expression_a?: Expression;
    // Expression_b?: Expression;
    // Statement: Statement;

    readonly VariableDeclarationList: VariableDeclarationList;
    readonly LexicalDeclaration?: LexicalDeclarationLike;
    readonly Expression_a?: Expression;
    readonly Expression_b?: Expression;
    readonly Expression_c?: Expression;
    readonly Statement: Statement;
  }

  // ForInOfStatement :
  //   `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
  //   `for` `(` `var` ForBinding `in` Expression `)` Statement
  //   `for` `(` ForDeclaration `in` Expression `)` Statement
  //   `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  export type ForInOfStatement =
    | ForInStatement
    | ForOfStatement
    | ForAwaitStatement;

  // ForInOfStatement (partial) :
  //   `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
  //   `for` `(` `var` ForBinding `in` Expression `)` Statement
  //   `for` `(` ForDeclaration `in` Expression `)` Statement
  export interface ForInStatement extends BaseParseNode {
    readonly type: 'ForInStatement';

    /// ForInStatement : `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
    // LeftHandSideExpression?: LeftHandSideExpression;
    // Expression: Expression;
    // Statement: Statement;

    /// ForInStatement : `for` `(` `var` ForBinding `in` Expression `)` Statement
    // ForBinding?: ForBinding;
    // Expression: Expression;
    // Statement: Statement;

    /// ForInStatement : `for` `(` ForDeclaration `in` Expression `)` Statement
    // ForDeclaration?: ForDeclarationLike;
    // Expression: Expression;
    // Statement: Statement;

    readonly LeftHandSideExpression?: LeftHandSideExpression;
    readonly ForBinding?: ForBinding;
    readonly ForDeclaration?: ForDeclarationLike;
    readonly Expression: Expression;
    readonly Statement: Statement;
  }

  // ForInOfStatement (partial) :
  //   `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  export interface ForOfStatement extends BaseParseNode {
    readonly type: 'ForOfStatement';

    /// ForOfStatement : `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    // LeftHandSideExpression?: LeftHandSideExpression;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// ForOfStatement : `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // ForBinding?: ForBinding;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// ForOfStatement : `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    // ForDeclaration?: ForDeclarationLike;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    readonly LeftHandSideExpression?: LeftHandSideExpression;
    readonly ForDeclaration?: ForDeclarationLike;
    readonly ForBinding?: ForBinding;
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
    readonly Statement: Statement;
  }

  // ForInOfStatement (partial) :
  //   `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  export interface ForAwaitStatement extends BaseParseNode {
    readonly type: 'ForAwaitStatement';

    /// ForOfStatement : `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    // LeftHandSideExpression?: LeftHandSideExpression;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// ForOfStatement : `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // ForBinding?: ForBinding;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// ForOfStatement : `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    // ForDeclaration?: ForDeclarationLike;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    readonly LeftHandSideExpression?: LeftHandSideExpression;
    readonly ForDeclaration?: ForDeclarationLike;
    readonly ForBinding?: ForBinding;
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
    readonly Statement: Statement;
  }

  // ForDeclaration :
  //   LetOrConst ForBinding
  export type ForDeclarationLike =
    | ForDeclaration;

  // ForDeclaration :
  //   LetOrConst ForBinding
  export interface ForDeclaration extends BaseParseNode {
    readonly type: 'ForDeclaration';
    readonly LetOrConst: LetOrConst;
    readonly ForBinding: ForBinding;
  }

  // ForBinding :
  //   BindingPattern
  //   BindingIdentifier
  export interface ForBinding extends BaseParseNode {
    readonly type: 'ForBinding';
    readonly BindingIdentifier?: BindingIdentifier;
    readonly BindingPattern?: BindingPattern;
  }

  // ContinueStatement :
  //   `continue` `;`
  //   `continue` [no LineTerminator here] LabelIdentifier `;`
  export interface ContinueStatement extends BaseParseNode {
    readonly type: 'ContinueStatement';
    readonly LabelIdentifier: LabelIdentifier | null;
  }

  // BreakStatement :
  //   `break` `;`
  //   `break` [no LineTerminator here] LabelIdentifier `;`
  export interface BreakStatement extends BaseParseNode {
    readonly type: 'BreakStatement';
    readonly LabelIdentifier: LabelIdentifier | null;
  }

  // ReturnStatement :
  //   `return` `;`
  //   `return` [no LineTerminator here] Expression `;`
  export interface ReturnStatement extends BaseParseNode {
    readonly type: 'ReturnStatement';
    readonly Expression: Expression | null;
  }

  // WithStatement :
  //   `with` `(` Expression `)` Statement
  export interface WithStatement extends BaseParseNode {
    readonly type: 'WithStatement';
    readonly Expression: Expression;
    readonly Statement: Statement;
  }

  // SwitchStatement :
  //   `switch` `(` Expression `)` CaseBlock
  export interface SwitchStatement extends BaseParseNode {
    readonly type: 'SwitchStatement';
    readonly Expression: Expression;
    readonly CaseBlock: CaseBlock;
  }

  // CaseBlock :
  //   `{` CaseClauses? `}`
  //   `{` CaseClauses? DefaultClause CaseClauses? `}`
  export interface CaseBlock extends BaseParseNode {
    readonly type: 'CaseBlock';
    readonly CaseClauses_a?: CaseClauses;
    readonly DefaultClause?: DefaultClause;
    readonly CaseClauses_b?: CaseClauses;
  }

  // CaseClauses :
  //   CaseClause
  //   CaseClauses CauseClause
  export type CaseClauses = readonly CaseClause[];

  // CaseClause :
  //   `case` Expression `:` StatementList?
  export interface CaseClause extends BaseParseNode {
    readonly type: 'CaseClause';
    readonly Expression: Expression;
    readonly StatementList: StatementList;
  }

  // DefaultClause :
  //   `default` `:` StatementList?
  export interface DefaultClause extends BaseParseNode {
    readonly type: 'DefaultClause';
    readonly StatementList: StatementList;
  }

  // LabelledStatement :
  //   LabelIdentifier `:` LabelledItem
  export interface LabelledStatement extends BaseParseNode {
    readonly type: 'LabelledStatement';
    readonly LabelIdentifier: LabelIdentifier;
    readonly LabelledItem: LabelledItem;
  }

  // LabelledItem :
  //   Statement
  //   FunctionDeclaration
  export type LabelledItem =
    | Statement
    | FunctionDeclaration; // SPEC QUESTION: why only |FunctionDeclaration| and not generators or async functions?

  // ThrowStatement :
  //   `throw` [no LineTerminator here] Expression `;`
  export interface ThrowStatement extends BaseParseNode {
    readonly type: 'ThrowStatement';
    readonly Expression: Expression;
  }

  // TryStatement :
  //   `try` Block Catch
  //   `try` Block Finally
  //   `try` Block Catch Finally
  export interface TryStatement extends BaseParseNode {
    readonly type: 'TryStatement';
    readonly Block: Block;
    readonly Catch: Catch | null;
    readonly Finally: Finally | null;
  }

  // Catch :
  //   `catch` `(` CatchParameter `)` Block
  //   `catch` Block
  //
  // CatchParameter :
  //   BindingIdentifier
  //   BindingPattern
  export interface Catch extends BaseParseNode {
    readonly type: 'Catch';
    readonly CatchParameter: CatchParameter | null;
    readonly Block: Block;
  }

  // Finally :
  //   `finally` Block
  export type Finally =
    | Block;

  // CatchParameter :
  //   BindingPattern
  //   BindingIdentifier
  export type CatchParameter =
    | BindingPattern
    | BindingIdentifier;

  // DebuggerStatement :
  //   `debugger` `;`
  export interface DebuggerStatement extends BaseParseNode {
    readonly type: 'DebuggerStatement';
  }

  // A.4 Functions and Classes
  // https://tc39.es/ecma262/#sec-functions-and-classes

  // UniqueFormalParameters :
  //   FormalParameters
  export type UniqueFormalParameters =
    | FormalParameters;

  // FormalParameters :
  //   [empty]
  //   FunctionRestParameter
  //   FormalParameterList
  //   FormalParameterList `,`
  //   FormalParameterList `,` FunctionRestParameter
  export type FormalParameters = readonly FormalParametersElement[];

  // NON-SPEC
  export type FormalParametersElement = FormalParameterList[number] | FunctionRestParameter;

  // FormalParameterList :
  //   FormalParameter
  //   FormalParameterList `,` FormalParameterList
  export type FormalParameterList = readonly FormalParameter[];

  // FunctionRestParameter :
  //   BindingRestElement
  export type FunctionRestParameter =
    | BindingRestElement;

  // FormalParameter :
  //   BindingElement
  export type FormalParameter =
    | BindingElementLike;

  // NON-SPEC
  export type FunctionLike =
    | FunctionDeclarationLike
    | FunctionExpressionLike;

  // NON-SPEC
  export type FunctionDeclarationLike =
    | FunctionDeclaration
    | GeneratorDeclaration
    | AsyncFunctionDeclaration
    | AsyncGeneratorDeclaration;

  // NON-SPEC
  export type FunctionExpressionLike =
    | FunctionExpression
    | GeneratorExpression
    | AsyncFunctionExpression
    | AsyncGeneratorExpression;

  // NON-SPEC
  export type FunctionBodyLike =
    | FunctionBody
    | GeneratorBody
    | AsyncBody
    | AsyncGeneratorBody;

  // FunctionDeclaration :
  //   `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //   [+Default] `function` `(` FormalParameters `)` `{` FunctionBody `}`
  export interface FunctionDeclaration extends BaseParseNode {
    readonly type: 'FunctionDeclaration';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly FunctionBody: FunctionBody;
  }

  // FunctionExpression :
  //   `function` BindingIdentifier? `(` FormalParameters `)` `{` FunctionBody `}`
  export interface FunctionExpression extends BaseParseNode {
    readonly type: 'FunctionExpression';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly FunctionBody: FunctionBody;
  }

  // FunctionBody :
  //   FunctionStatementList
  export interface FunctionBody extends BaseParseNode {
    readonly type: 'FunctionBody';
    readonly directives: string[];
    readonly strict: boolean;
    readonly FunctionStatementList: FunctionStatementList;
  }

  // FunctionStatementList :
  //   StatementList
  export type FunctionStatementList = StatementList;

  // ArrowFunction :
  //  ArrowParameters [no LineTerminator here] `=>` ConciseBody
  export interface ArrowFunction extends BaseParseNode {
    readonly type: 'ArrowFunction';
    readonly ArrowParameters: ArrowParameters;
    readonly ConciseBody: ConciseBodyLike;
  }

  // ArrowParameters :
  //   BindingIdentifier
  //   CoverParenthesizedExpressionAndArrowParameterList
  //
  // CoverParenthesizedExpressionAndArrowParameterList refined as:
  //   ArrowFormalParameters (refined) :
  //    `(` UniqueFormalParameters `)`
  export type ArrowParameters = ArrowFormalParameters;

  // ConciseBody :
  //   ExpressionBody
  //   `{` FunctionBody `}`
  export type ConciseBodyLike =
    | FunctionBody
    | ConciseBody;

  // ConciseBody (partial) :
  //   ExpressionBody
  export interface ConciseBody extends BaseParseNode {
    readonly type: 'ConciseBody';
    readonly directives?: undefined;
    readonly ExpressionBody: ExpressionBody;
  }

  // ExpressionBody :
  //   AssignmentExpression
  export interface ExpressionBody extends BaseParseNode {
    readonly type: 'ExpressionBody';
    readonly AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // CoverParenthesizedExpressionAndArrowParameterList refined as:
  //   ArrowFormalParameters :
  //    `(` UniqueFormalParameters `)`
  export type ArrowFormalParameters =
    | UniqueFormalParameters;

  // AsyncArrowFunction :
  //   `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
  //   CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
  //
  // CoverCallExpressionAndAsyncArrowHead :
  //   MemberExpression Arguments
  //
  // AsyncArrowHead (refined) :
  //   `async` ArrowFormalParameters
  export interface AsyncArrowFunction extends BaseParseNode {
    readonly type: 'AsyncArrowFunction';
    readonly ArrowParameters: ArrowParameters;
    readonly AsyncConciseBody: AsyncConciseBodyLike;
  }

  // AsyncConciseBody :
  //   ExpressionBody
  //   `{` AsyncBody `}`
  export type AsyncConciseBodyLike =
    | AsyncConciseBody
    | AsyncBody;

  // AsyncConciseBody (partial) :
  //   ExpressionBody
  export interface AsyncConciseBody extends BaseParseNode {
    readonly type: 'AsyncConciseBody';
    readonly directives?: undefined;
    readonly ExpressionBody: ExpressionBody;
  }

  // MethodDefinition :
  //   ClassElementName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   GeneratorMethod
  //   AsyncMethod
  //   AsyncGeneratorMethod
  //   `get` ClassElementName `(` `)` `{` FunctionBody `}`
  //   `set` ClassElementName `(` PropertySetParameterList `)` `{` FunctionBody `}`
  export type MethodDefinitionLike =
    | MethodDefinition
    | GeneratorMethod
    | AsyncMethod
    | AsyncGeneratorMethod;

  // MethodDefinition (partial) :
  //   ClassElementName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   `get` ClassElementName `(` `)` `{` FunctionBody `}`
  //   `set` ClassElementName `(` PropertySetParameterList `)` `{` FunctionBody `}`
  export interface MethodDefinition extends BaseParseNode {
    readonly type: 'MethodDefinition';
    readonly static?: boolean;
    readonly ClassElementName: ClassElementName;
    readonly PropertySetParameterList: PropertySetParameterList | null;
    readonly UniqueFormalParameters: UniqueFormalParameters | null;
    readonly FunctionBody: FunctionBody;
  }

  // PropertySetParameterList :
  //   FormalParameter
  export type PropertySetParameterList = [FormalParameter];

  // GeneratorDeclaration :
  //   `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
  //   [+Default] `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
  export interface GeneratorDeclaration extends BaseParseNode {
    readonly type: 'GeneratorDeclaration';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly GeneratorBody: GeneratorBody;
  }

  // GeneratorExpression :
  //   `function` `*` BindingIdentifier? `(` FormalParameters `)` `{` GeneratorBody `}`
  export interface GeneratorExpression extends BaseParseNode {
    readonly type: 'GeneratorExpression';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly GeneratorBody: GeneratorBody;
  }

  // GeneratorMethod :
  //   `*` ClassElementName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
  export interface GeneratorMethod extends BaseParseNode {
    readonly type: 'GeneratorMethod';
    readonly static?: boolean;
    readonly ClassElementName: ClassElementName;
    readonly PropertySetParameterList: null;
    readonly UniqueFormalParameters: UniqueFormalParameters;
    readonly GeneratorBody: GeneratorBody;
  }

  // GeneratorBody :
  //   FunctionBody
  export interface GeneratorBody extends BaseParseNode {
    readonly type: 'GeneratorBody';
    readonly directives: string[];
    readonly strict: boolean;
    readonly FunctionStatementList: FunctionStatementList;
  }

  // YieldExpression :
  //   `yield`
  //   `yield` [no LineTerminator here] AssignmentExpression
  //   `yield` [no LineTerminator here] `*` AssignmentExpression
  export interface YieldExpression extends BaseParseNode {
    readonly type: 'YieldExpression';
    readonly hasStar: boolean;
    readonly AssignmentExpression: AssignmentExpressionOrHigher | null;
  }

  // AsyncGeneratorDeclaration :
  //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  export interface AsyncGeneratorDeclaration extends BaseParseNode {
    readonly type: 'AsyncGeneratorDeclaration';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly AsyncGeneratorBody: AsyncGeneratorBody;
  }

  // AsyncGeneratorExpression :
  //   `async` `function` `*` BindingIdentifier? `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  export interface AsyncGeneratorExpression extends BaseParseNode {
    readonly type: 'AsyncGeneratorExpression';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly AsyncGeneratorBody: AsyncGeneratorBody;
  }

  // AsyncGeneratorMethod :
  //   `async` `*` ClassElementName `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`
  export interface AsyncGeneratorMethod extends BaseParseNode {
    readonly type: 'AsyncGeneratorMethod';
    readonly static?: boolean;
    readonly ClassElementName: ClassElementName;
    readonly PropertySetParameterList: null;
    readonly UniqueFormalParameters: UniqueFormalParameters;
    readonly AsyncGeneratorBody: AsyncGeneratorBody;
  }

  // AsyncGeneratorBody :
  //   FunctionBody
  export interface AsyncGeneratorBody extends BaseParseNode {
    readonly type: 'AsyncGeneratorBody';
    readonly directives: string[];
    readonly strict: boolean;
    readonly FunctionStatementList: FunctionStatementList;
  }

  // AsyncFunctionDeclaration :
  //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncBody `}`
  //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncBody `}`
  export interface AsyncFunctionDeclaration extends BaseParseNode {
    readonly type: 'AsyncFunctionDeclaration';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly AsyncBody: AsyncBody;
  }

  // AsyncFunctionExpression :
  //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncBody `}`
  export interface AsyncFunctionExpression extends BaseParseNode {
    readonly type: 'AsyncFunctionExpression';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly FormalParameters: FormalParameters;
    readonly AsyncBody: AsyncBody;
  }

  // AsyncMethod :
  //   `async` ClassElementName `(` UniqueFormalParameters `)` `{` AsyncBody `}`
  export interface AsyncMethod extends BaseParseNode {
    readonly type: 'AsyncMethod';
    readonly static?: boolean;
    readonly ClassElementName: ClassElementName;
    readonly PropertySetParameterList: null;
    readonly UniqueFormalParameters: UniqueFormalParameters;
    readonly AsyncBody: AsyncBody;
  }

  // AsyncBody :
  //   FunctionBody
  export interface AsyncBody extends BaseParseNode {
    readonly type: 'AsyncBody';
    readonly directives: string[];
    readonly strict: boolean;
    readonly FunctionStatementList: FunctionStatementList;
  }

  // AwaitExpression : `await` UnaryExpression
  export interface AwaitExpression extends BaseParseNode {
    readonly type: 'AwaitExpression';
    readonly UnaryExpression: UnaryExpressionOrHigher;
  }

  // pending

  // NON-SPEC
  export type ClassLike =
    | ClassDeclaration
    | ClassExpression;

  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  export interface ClassDeclaration extends BaseParseNode {
    readonly type: 'ClassDeclaration';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly ClassTail: ClassTail;
  }

  // ClassExpression :
  //   `class` BindingIdentifier? ClassTail
  export interface ClassExpression extends BaseParseNode {
    readonly type: 'ClassExpression';
    readonly BindingIdentifier: BindingIdentifier | null;
    readonly ClassTail: ClassTail;
  }

  // ClassTail :
  //   ClassHeritage? `{` ClassBody? `}`
  export interface ClassTail extends BaseParseNode {
    readonly type: 'ClassTail';
    readonly ClassHeritage: ClassHeritage | null;
    readonly ClassBody: ClassBody | null;
  }

  // ClassHeritage :
  //   `extends` LeftHandSideExpression
  export type ClassHeritage =
    | LeftHandSideExpression;

  // ClassBody :
  //   ClassElementList
  export type ClassBody =
    | ClassElementList;

  // ClassElementList :
  //   ClassElement
  //   ClassElementList ClassElement
  export type ClassElementList = readonly ClassElement[];

  // ClassElement :
  //   MethodDefinition
  //   `static` MethodDefinition
  //   FieldDefinition `;`
  //   `static` FieldDefinition `;`
  //   ClassStaticBlock
  //   `;`
  export type ClassElement =
    | MethodDefinitionLike
    | FieldDefinition
    | ClassStaticBlock;

  // FieldDefinition :
  //   ClassElementName Initializer?
  export interface FieldDefinition extends BaseParseNode {
    readonly type: 'FieldDefinition';
    readonly static?: boolean;
    readonly ClassElementName: ClassElementName;
    readonly Initializer: Initializer | null;
  }

  // ClassElementName :
  //   PropertyName
  //   PrivateIdentifier
  export type ClassElementName =
    | PropertyNameLike
    | PrivateIdentifier;

  // ClassStaticBlock :
  //   `static` `{` ClassStaticBlockBody `}`
  export interface ClassStaticBlock extends BaseParseNode {
    readonly type: 'ClassStaticBlock';
    readonly static: true;
    readonly ClassStaticBlockBody: ClassStaticBlockBody;
  }

  // ClassStaticBlockBody :
  //   ClassStaticBlockStatementList
  export interface ClassStaticBlockBody extends BaseParseNode {
    readonly type: 'ClassStaticBlockBody';
    readonly ClassStaticBlockStatementList: ClassStaticBlockStatementList;
  }

  // ClassStaticBlockStatementList :
  //   StatementList?
  export type ClassStaticBlockStatementList =
    | StatementList;


  // A.5 Scripts and Modules
  // https://tc39.es/ecma262/#sec-scripts-and-modules

  // Script :
  //   ScriptBody?
  export interface Script extends BaseParseNode {
    readonly type: 'Script';
    readonly ScriptBody: ScriptBody | null;
  }

  // ScriptBody :
  //   StatementList
  export interface ScriptBody extends BaseParseNode {
    readonly type: 'ScriptBody';
    readonly StatementList: StatementList;
  }

  // Module :
  //   ModuleBody?
  export interface Module extends BaseParseNode {
    readonly type: 'Module';
    readonly ModuleBody: ModuleBody | null;
    readonly hasTopLevelAwait: boolean;
  }

  // ModuleBody :
  //   ModuleItemList
  export interface ModuleBody extends BaseParseNode {
    readonly type: 'ModuleBody';
    readonly ModuleItemList: ModuleItemList;
  }

  // ModuleItemList :
  //   ModuleItem
  //   ModuleItemList ModuleItem
  export type ModuleItemList = readonly ModuleItem[];

  // ModuleItem :
  //   ImportDeclaration
  //   ExportDeclaration
  //   StatementListItem
  export type ModuleItem =
    | ImportDeclaration
    | ExportDeclaration
    | StatementListItem;

  // ModuleExportName :
  //   IdentifierName
  //   StringLiteral
  export type ModuleExportName =
    | IdentifierName
    | StringLiteral;

  // ImportDeclaration :
  //   `import` ImportClause FromClause `;`
  //   `import` ModuleSpecifier `;`
  export interface ImportDeclaration extends BaseParseNode {
    readonly type: 'ImportDeclaration';
    readonly ModuleSpecifier?: PrimaryExpression;
    readonly ImportClause?: ImportClause;
    readonly FromClause?: FromClause;
  }

  // ImportClause :
  //   ImportedDefaultBinding
  //   NameSpaceImport
  //   NamedImports
  //   ImportedDefaultBinding `,` NameSpaceImport
  //   ImportedDefaultBinding `,` NamedImports
  export interface ImportClause extends BaseParseNode {
    readonly type: 'ImportClause';
    readonly ImportedDefaultBinding?: ImportedDefaultBinding;
    readonly NameSpaceImport?: NameSpaceImport;
    readonly NamedImports?: NamedImports;
  }

  // ImportedDefaultBinding :
  //   ImportedBinding
  export interface ImportedDefaultBinding extends BaseParseNode {
    readonly type: 'ImportedDefaultBinding';
    readonly ImportedBinding: ImportedBinding;
  }

  // NameSpaceImport :
  //   `*` `as` ImportedBinding
  export interface NameSpaceImport extends BaseParseNode {
    readonly type: 'NameSpaceImport';
    readonly ImportedBinding: ImportedBinding;
  }

  // NamedImports :
  //   `{` `}`
  //   `{` ImportsList `}`
  //   `{` ImportsList `,` `}`
  export interface NamedImports extends BaseParseNode {
    readonly type: 'NamedImports';
    readonly ImportsList: ImportsList;
  }

  // FromClause :
  //   `from` ModuleSpecifier
  export type FromClause =
    | ModuleSpecifier;

  // ImportsList :
  //   ImportSpecifier
  //   ImportsList `,` ImportSpecifier
  export type ImportsList = readonly ImportSpecifier[];

  // ImportSpecifier :
  //   ImportedBinding
  //   ModuleExportName `as` ImportedBinding
  export interface ImportSpecifier extends BaseParseNode {
    readonly type: 'ImportSpecifier';
    readonly ModuleExportName?: ModuleExportName;
    readonly ImportedBinding: ImportedBinding;
  }

  // ModuleSpecifier :
  //   StringLiteral
  export type ModuleSpecifier =
    | StringLiteral;

  // ImportedBinding :
  //   BindingIdentifier
  export type ImportedBinding =
    | BindingIdentifier;

  // ExportDeclaration :
  //   `export` ExportFromClause FromClause `;`
  //   `export` NamedExports `;`
  //   `export` VariableStatement
  //   `export` Declaration
  //   `export` `default` HoistableDeclaration
  //   `export` `default` ClassDeclaration
  //   `export` `default` AssignmentExpression `;`
  export interface ExportDeclaration extends BaseParseNode {
    readonly type: 'ExportDeclaration';
    readonly default: boolean;
    readonly HoistableDeclaration?: HoistableDeclaration;
    readonly ClassDeclaration?: ClassDeclaration;
    readonly AssignmentExpression?: AssignmentExpressionOrHigher;
    readonly Declaration?: Declaration;
    readonly VariableStatement?: VariableStatement;
    readonly ExportFromClause?: ExportFromClauseLike;
    readonly FromClause?: FromClause;
    readonly NamedExports?: NamedExports;
  }

  // ExportFromClause :
  //   `*`
  //   `*` as ModuleExportName
  //   NamedExports
  export type ExportFromClauseLike =
    | NamedExports
    | ExportFromClause;

  // ExportFromClause (partial) :
  //   `*`
  //   `*` as ModuleExportName
  export interface ExportFromClause extends BaseParseNode {
    readonly type: 'ExportFromClause';
    readonly ModuleExportName?: ModuleExportName;
  }

  // NamedExports :
  //   `{` `}`
  //   `{` ExportsList `}`
  //   `{` ExportsList `,` `}`
  export interface NamedExports extends BaseParseNode {
    readonly type: 'NamedExports';
    readonly ExportsList: ExportsList;
  }

  // ExportsList :
  //   ExportSpecifier
  //   ExportsList `,` ExportSpecifier
  export type ExportsList = readonly ExportSpecifier[];

  // ExportSpecifier :
  //   ModuleExportName
  //   ModuleExportName `as` ModuleExportName
  export interface ExportSpecifier extends BaseParseNode {
    readonly type: 'ExportSpecifier';
    readonly localName: ModuleExportName;
    readonly exportName: ModuleExportName;
  }

  // Helpers
  // NON-SPEC

  // Gets all keys of all constituents of a union
  type AllKeysOf<T> = T extends unknown ? keyof T : never;

  // Gets all values for a given key for all constituents of a union
  type AllValuesOf<T, K extends AllKeysOf<T>> = T extends unknown ? K extends keyof T ? T[K] : never : never;

  // NON-SPEC
  /**
   * Used internally to describe a node that is still in the process of being parsed. Unfinished nodes may not yet be
   * fully defined.
   */
  export type Unfinished<T extends ParseNode = ParseNode> = (
    // An unfinished node...

    // ...includes all properties of BaseParseNode
    & {
      type?: T['type'] & ParseNode['type'];
      location: {
        startIndex: number;
        endIndex: number;
        start: { line: number, column: number };
        end: { line: number, column: number };
      };
      strict: boolean;
      sourceText: () => string;
    }

    // ...includes all properties of all potential types, with each property marked as optional
    & {
      -readonly [K in Exclude<AllKeysOf<T>, 'location' | 'strict' | 'sourceText'>]?: AllValuesOf<T, K>;
    }
  );

  // NON-SPEC
  /**
   * Used internally to indicate a node that has finished parsing.
   */
  export type Finished<T extends BaseParseNode | Unfinished<ParseNode>, K extends T['type'] & ParseNode['type']> =
    T extends Unfinished<ParseNode> ? Extract<ParseNodesByType[K], T> :
    T;
}

/** https://tc39.es/ecma262/multipage/text-processing.html#sec-patterns */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ParseNode.RegExp {
  // NON-SPEC
  export type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
  }
  export interface Pattern {
    readonly type: 'Pattern';
    readonly Disjunction: Disjunction;
    readonly groupSpecifiers: ReadonlyMap<string, number>;
    readonly capturingGroups: readonly Atom_Group[];
  }
  export interface Disjunction {
    readonly type: 'Disjunction';
    readonly Alternative: Alternative;
    readonly Disjunction: Disjunction | undefined;
  }
  export interface Alternative {
    readonly type: 'Alternative';
    readonly Term: Term | undefined;
    readonly Alternative: Alternative | undefined;
  }
  export type Term = Assertion | Term_Atom;
  export interface Term_Atom {
    readonly type: 'Term';
    readonly Atom: Atom;
    readonly Quantifier: Quantifier | undefined;
    readonly capturingParenthesesBefore: number;
  }
  export interface Assertion {
    readonly type: 'Assertion';
    readonly subtype: '^' | '$' | 'b' | 'B' | '?=' | '?!' | '?<=' | '?<!';
    readonly Disjunction?: Disjunction | undefined;
  }
  export interface Quantifier {
    readonly type: 'Quantifier';
    readonly QuantifierPrefix: '*' | '+' | '?' | QuantifierCount | undefined;
    readonly greedy: boolean;
  }
  export interface QuantifierCount {
    readonly DecimalDigits_a: number;
    readonly DecimalDigits_b: number | undefined;
  }
  export type Atom = Atom_Dot | AtomEscape | Atom_Group | Atom_Rest;
  export interface Atom_Dot {
    readonly type: 'Atom';
    readonly subtype: '.';
    readonly enclosedCapturingParentheses: number;
  }
  export interface Atom_Group {
    readonly type: 'Atom';
    readonly capturingParenthesesBefore: number;
    readonly enclosedCapturingParentheses: number;
    readonly capturing: boolean;
    readonly GroupSpecifier: string | undefined;
    readonly Disjunction: Disjunction | undefined;
  }
  export interface Atom_Rest {
    readonly type: 'Atom';
    readonly CharacterClass?: CharacterClass | undefined;
    readonly PatternCharacter?: string | undefined;
  }
  export interface AtomEscape {
    readonly type: 'AtomEscape';
    readonly position?: number | undefined;
    readonly GroupName?: string | undefined;
    readonly CharacterClassEscape?: CharacterClassEscape | undefined;
    readonly DecimalEscape?: DecimalEscape | undefined;
    readonly CharacterEscape?: CharacterEscape | undefined;
  }
  export interface CharacterEscape {
    readonly type: 'CharacterEscape';
    readonly subtype?: string | undefined;
    readonly ControlEscape?: string | undefined;
    readonly IdentityEscape?: string | undefined;
    readonly ControlLetter?: string | undefined;
    readonly HexEscapeSequence?: HexEscapeSequence | undefined;
    readonly RegExpUnicodeEscapeSequence?: RegExpUnicodeEscapeSequence | undefined;
  }
  export interface DecimalEscape {
    readonly type: 'DecimalEscape';
    readonly position: number;
    readonly value: number;
  }
  export interface CharacterClassEscape {
    readonly type: 'CharacterClassEscape';
    readonly value: string;
    readonly UnicodePropertyValueExpression?: UnicodePropertyValueExpression | undefined;
  }
  export interface UnicodePropertyValueExpression {
    readonly type: 'UnicodePropertyValueExpression';
    readonly LoneUnicodePropertyNameOrValue?: string | undefined;
    readonly UnicodePropertyName?: string | undefined;
    readonly UnicodePropertyValue?: string | undefined;
  }
  export interface CharacterClass {
    readonly type: 'CharacterClass';
    readonly invert: boolean;
    readonly ClassRanges: readonly ClassRange[];
  }
  export type ClassRange = ClassAtom | [ClassAtom, ClassAtom];
  export type ClassAtom = ClassAtom_SourceCharacter | ClassEscape | CharacterClassEscape;
  export interface ClassAtom_SourceCharacter {
    readonly type: 'ClassAtom';
    readonly SourceCharacter?: string | undefined;
    readonly value?: '-' | undefined;
  }
  export interface ClassEscape {
    readonly type: 'ClassEscape';
    readonly value?: 'b' | '-' | undefined;
    readonly CharacterEscape?: CharacterEscape | undefined;
  }
  export interface RegExpUnicodeEscapeSequence {
    readonly type: 'RegExpUnicodeEscapeSequence';
    readonly CodePoint?: number;
    readonly HexLeadSurrogate?: number | undefined;
    readonly HexTrailSurrogate?: number | undefined;
    readonly Hex4Digits?: number | undefined;
  }
  export interface HexEscapeSequence {
    readonly type: 'HexEscapeSequence';
    readonly HexDigit_a: string;
    readonly HexDigit_b: string;
  }
  export type RegExpParseNode =
    | Pattern
    | Disjunction
    | Alternative
    | Term_Atom
    | Assertion
    | Quantifier
    | Atom_Dot
    | AtomEscape
    | Atom_Group
    | Atom_Rest
    | CharacterClass
    | ClassAtom_SourceCharacter
    | ClassEscape
    | RegExpUnicodeEscapeSequence
    | HexEscapeSequence
    | CharacterEscape
    | DecimalEscape
    | CharacterClassEscape
    | UnicodePropertyValueExpression;
}

export type ParseNode =
  | ParseNode.PrivateIdentifier
  | ParseNode.IdentifierName
  | ParseNode.IdentifierReference
  | ParseNode.BindingIdentifier
  | ParseNode.LabelIdentifier
  | ParseNode.PropertyName
  | ParseNode.ThisExpression
  | ParseNode.NullLiteral
  | ParseNode.BooleanLiteral
  | ParseNode.NumericLiteral
  | ParseNode.StringLiteral
  | ParseNode.Elision
  | ParseNode.ArrayLiteral
  | ParseNode.SpreadElement
  | ParseNode.ObjectLiteral
  | ParseNode.PropertyDefinition
  | ParseNode.CoverInitializedName
  | ParseNode.MethodDefinition
  | ParseNode.FunctionDeclaration
  | ParseNode.FunctionExpression
  | ParseNode.FunctionBody
  | ParseNode.ArrowFunction
  | ParseNode.ExpressionBody
  | ParseNode.ConciseBody
  | ParseNode.GeneratorDeclaration
  | ParseNode.GeneratorExpression
  | ParseNode.GeneratorMethod
  | ParseNode.GeneratorBody
  | ParseNode.YieldExpression
  | ParseNode.AsyncGeneratorDeclaration
  | ParseNode.AsyncGeneratorExpression
  | ParseNode.AsyncGeneratorMethod
  | ParseNode.AsyncGeneratorBody
  | ParseNode.ClassDeclaration
  | ParseNode.ClassExpression
  | ParseNode.ClassTail
  | ParseNode.FieldDefinition
  | ParseNode.ClassStaticBlock
  | ParseNode.ClassStaticBlockBody
  | ParseNode.AsyncFunctionDeclaration
  | ParseNode.AsyncFunctionExpression
  | ParseNode.AsyncMethod
  | ParseNode.AsyncBody
  | ParseNode.AsyncArrowFunction
  | ParseNode.AsyncConciseBody
  | ParseNode.RegularExpressionLiteral
  | ParseNode.CoverParenthesizedExpressionAndArrowParameterList
  | ParseNode.ParenthesizedExpression
  | ParseNode.SuperProperty
  | ParseNode.SuperProperty
  | ParseNode.NewTarget
  | ParseNode.ImportMeta
  | ParseNode.MemberExpression
  | ParseNode.NewExpression
  | ParseNode.SuperCall
  | ParseNode.ImportCall
  | ParseNode.CallExpression
  | ParseNode.TemplateLiteral
  | ParseNode.TaggedTemplateExpression
  | ParseNode.OptionalExpression
  | ParseNode.OptionalChain
  | ParseNode.AssignmentRestElement
  | ParseNode.UpdateExpression
  | ParseNode.AwaitExpression
  | ParseNode.UnaryExpression
  | ParseNode.ExponentiationExpression
  | ParseNode.MultiplicativeExpression
  | ParseNode.AdditiveExpression
  | ParseNode.ShiftExpression
  | ParseNode.RelationalExpression
  | ParseNode.EqualityExpression
  | ParseNode.BitwiseANDExpression
  | ParseNode.BitwiseXORExpression
  | ParseNode.BitwiseORExpression
  | ParseNode.LogicalANDExpression
  | ParseNode.LogicalORExpression
  | ParseNode.CoalesceExpression
  | ParseNode.ConditionalExpression
  | ParseNode.AssignmentExpression
  | ParseNode.CommaOperator
  | ParseNode.LexicalDeclaration
  | ParseNode.LexicalBinding
  | ParseNode.ObjectBindingPattern
  | ParseNode.ArrayBindingPattern
  | ParseNode.BindingRestProperty
  | ParseNode.BindingProperty
  | ParseNode.BindingRestElement
  | ParseNode.BindingElement
  | ParseNode.SingleNameBinding
  | ParseNode.Block
  | ParseNode.VariableStatement
  | ParseNode.VariableDeclaration
  | ParseNode.EmptyStatement
  | ParseNode.ExpressionStatement
  | ParseNode.IfStatement
  | ParseNode.DoWhileStatement
  | ParseNode.WhileStatement
  | ParseNode.ForStatement
  | ParseNode.ForInStatement
  | ParseNode.ForOfStatement
  | ParseNode.ForDeclaration
  | ParseNode.ForBinding
  | ParseNode.ForAwaitStatement
  | ParseNode.SwitchStatement
  | ParseNode.CaseBlock
  | ParseNode.CaseClause
  | ParseNode.DefaultClause
  | ParseNode.ContinueStatement
  | ParseNode.BreakStatement
  | ParseNode.ReturnStatement
  | ParseNode.WithStatement
  | ParseNode.LabelledStatement
  | ParseNode.ThrowStatement
  | ParseNode.TryStatement
  | ParseNode.Catch
  | ParseNode.DebuggerStatement
  | ParseNode.ImportDeclaration
  | ParseNode.ImportClause
  | ParseNode.ImportedDefaultBinding
  | ParseNode.NameSpaceImport
  | ParseNode.NamedImports
  | ParseNode.ImportSpecifier
  | ParseNode.ExportDeclaration
  | ParseNode.ExportFromClause
  | ParseNode.NamedExports
  | ParseNode.ExportSpecifier
  | ParseNode.Script
  | ParseNode.ScriptBody
  | ParseNode.Module
  | ParseNode.ModuleBody;

/**
 * A type that contains a mapping of {@link ParseNode} type names to their corresponding {@link ParseNode} type.
 *
 * You can use `ParseNodesByType[T]` instead of a conditional type like `Extract<ParseNode, { type: T }>` which is often
 * more expensive and can complicate assignability checks.
 */
export type ParseNodesByType = {
  [N in ParseNode as N['type']]: N;
};
