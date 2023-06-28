import type { ArrowInfo } from './Scope.mjs';

export interface Position {
  line: number;
  column: number;
}

export interface Location {
  startIndex: number;
  endIndex: number;
  start: Position;
  end: Position;
}

export interface ParseNode {
  type: string;
  location: Location;
  strict: boolean;
  sourceText: () => string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ParseNode {
  export interface PrivateIdentifier extends ParseNode {
    type: 'PrivateIdentifier';
    name: string;
  }

  export interface IdentifierName extends ParseNode {
    type: 'IdentifierName';
    name: string;
  }

  export interface IdentifierReference extends ParseNode {
    type: 'IdentifierReference';
    escaped: boolean;
    name: string;
  }

  export interface BindingIdentifier extends ParseNode {
    type: 'BindingIdentifier';
    name: string;
  }

  export interface LabelIdentifier extends ParseNode {
    type: 'LabelIdentifier';
    name: string;
  }

  // PropertyName : ComputedPropertyName
  // ComputedPropertyName : `[` AssignmentExpression `]`
  export interface PropertyName extends ParseNode {
    type: 'PropertyName';
    ComputedPropertyName: AssignmentExpressionOrHigher;
  }

  // PropertyName :
  //   LiteralPropertyName
  //   ComputedPropertyName
  // LiteralPropertyName :
  //   IdentifierName
  //   StringLiteral
  //   NumericLiteral
  // ComputedPropertyName :
  //   `[` AssignmentExpression `]`
  export type PropertyNameLike =
    | PropertyName
    | StringLiteral
    | NumericLiteral
    | IdentifierName;

  // ClassElementName :
  //   PropertyName
  //   PrivateIdentifier
  export type ClassElementName =
    | PropertyNameLike
    | PrivateIdentifier;

  // PrimaryExpression (partial) :
  //   `this`
  export interface ThisExpression extends ParseNode {
    type: 'ThisExpression';
  }

  // NullLiteral :
  //   `null`
  export interface NullLiteral extends ParseNode {
    type: 'NullLiteral';
  }

  // BooleanLiteral :
  //   `true`
  //   `false`
  export interface BooleanLiteral extends ParseNode {
    type: 'BooleanLiteral';
    value: boolean;
  }

  export interface NumericLiteral extends ParseNode {
    type: 'NumericLiteral';
    value: number | bigint;
  }

  export interface StringLiteral extends ParseNode {
    type: 'StringLiteral';
    value: string;
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

  // Elision :
  //   `,`
  //   Elision `,`
  export interface Elision extends ParseNode {
    type: 'Elision';
  }

  // ArrayLiteral :
  //   `[` `]`
  //   `[` Elision `]`
  //   `[` ElementList `]`
  //   `[` ElementList `,` `]`
  //   `[` ElementList `,` Elision `]`
  export interface ArrayLiteral extends ParseNode {
    type: 'ArrayLiteral';
    ElementList: ElementList;
    hasTrailingComma: boolean;
  }

  // SpreadElement :
  // `...` AssignmentExpression
  export interface SpreadElement extends ParseNode {
    type: 'SpreadElement';
    AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // ElementList :
  //   Elision? AssignmentExpression
  //   Elision? SpreadElement
  //   ElementList `,` Elision? AssignmentExpression
  //   ElementList `,` Elision? SpreadElement
  export type ElementList = ElementListElement[];

  // ElementList :
  //   Elision? AssignmentExpression
  //   Elision? SpreadElement
  //   ElementList `,` Elision? AssignmentExpression
  //   ElementList `,` Elision? SpreadElement
  export type ElementListElement =
    | AssignmentExpressionOrHigher
    | SpreadElement
    | Elision;

  // ObjectLiteral :
  //   `{` `}`
  //   `{` PropertyDefinitionList `}`
  //   `{` PropertyDefinitionList `,` `}`
  export interface ObjectLiteral extends ParseNode {
    type: 'ObjectLiteral';
    PropertyDefinitionList: PropertyDefinitionList;
  }

  // PropertyDefinition (partial) :
  //   PropertyName `:` AssignmentExpression
  //   `...` AssignmentExpression
  export interface PropertyDefinition extends ParseNode {
    type: 'PropertyDefinition';
    PropertyName: PropertyNameLike | null;
    AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // CoverInitializedName :
  //   IdentifierReference Initializer
  export interface CoverInitializedName extends ParseNode {
    type: 'CoverInitializedName';
    IdentifierReference: IdentifierReference;
    Initializer: Initializer | null; // opt
  }

  // MethodDefinition (partial) :
  //   ClassElementName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   `get` ClassElementName `(` `)` `{` FunctionBody `}`
  //   `set` ClassElementName `(` PropertySetParameterList `)` `{` FunctionBody `}`
  export interface MethodDefinition extends ParseNode {
    type: 'MethodDefinition';
    static?: boolean;
    ClassElementName: ClassElementName;
    PropertySetParameterList: [FormalParameter] | null;
    UniqueFormalParameters: UniqueFormalParameters | null;
    FunctionBody: FunctionBody;
  }

  // NON-SPEC
  export type MethodLike =
    | MethodDefinition
    | AsyncMethod
    | GeneratorMethod
    | AsyncGeneratorMethod;

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
  export type FormalParameters = FormalParametersElement[];

  // NON-SPEC
  export type FormalParametersElement = FunctionRestParameter | FormalParameter;

  // FunctionRestParameter :
  //   BindingRestElement
  export type FunctionRestParameter =
    | BindingRestElement;

  // FormalParameter :
  //   BindingElement
  export type FormalParameter =
    | BindingElementOrHigher;

  // MethodDefinition :
  //   ClassElementName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   GeneratorMethod
  //   AsyncMethod
  //   AsyncGeneratorMethod
  //   `get` ClassElementName `(` `)` `{` FunctionBody `}`
  //   `set` ClassElementName `(` PropertySetParameterList `)` `{` FunctionBody `}`
  export type MethodDefinitionOrHigher =
    | MethodDefinition
    | GeneratorMethod
    | AsyncMethod
    | AsyncGeneratorMethod;

  // PropertyDefinitionList :
  //   PropertyDefinition
  //   PropertyDefinitionList `,` PropertyDefinition
  export type PropertyDefinitionList = PropertyDefinitionListElement[];

  // PropertyDefinition :
  //   IdentifierReference
  //   CoverInitializedName
  //   PropertyName `:` AssignmentExpression
  //   MethodDefinition
  //   `...` AssignmentExpression
  export type PropertyDefinitionListElement =
    | IdentifierReference
    | CoverInitializedName
    | PropertyDefinition
    | MethodDefinitionOrHigher;

  // FunctionDeclaration :
  //   `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //   [+Default] `function` `(` FormalParameters `)` `{` FunctionBody `}`
  export interface FunctionDeclaration extends ParseNode {
    type: 'FunctionDeclaration';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    FunctionBody: FunctionBody;
  }

  // FunctionExpression :
  //   `function` BindingIdentifier? `(` FormalParameters `)` `{` FunctionBody `}`
  export interface FunctionExpression extends ParseNode {
    type: 'FunctionExpression';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    FunctionBody: FunctionBody;
  }

  // FunctionBody :
  //   FunctionStatementList
  export interface FunctionBody extends ParseNode {
    type: 'FunctionBody';
    directives: string[];
    strict: boolean;
    FunctionStatementList: FunctionStatementList;
  }

  // FunctionStatementList :
  //   StatementList
  export type FunctionStatementList = StatementList;

  // ArrowFunction :
  //  ArrowParameters `=>` ConciseBody
  export interface ArrowFunction extends ParseNode {
    type: 'ArrowFunction';
    ArrowParameters: ArrowParameters;
    ConciseBody: ConciseBodyOrHigher;
  }

  // ArrowParameters :
  //   BindingIdentifier
  //   CoverParenthesizedExpressionAndArrowParameterList
  //
  //   ArrowFormalParameters (refined) :
  //    `(` UniqueFormalParameters `)`
  export type ArrowParameters = ArrowFormalParameters;

  //   ArrowFormalParameters :
  //    `(` UniqueFormalParameters `)`
  export type ArrowFormalParameters = UniqueFormalParameters;

  // ExpressionBody :
  //   AssignmentExpression
  export interface ExpressionBody extends ParseNode {
    type: 'ExpressionBody';
    AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // ConciseBody (partial) :
  //   ExpressionBody
  export interface ConciseBody extends ParseNode {
    type: 'ConciseBody';
    directives?: undefined;
    ExpressionBody: ExpressionBody;
  }

  // ConciseBody :
  //   ExpressionBody
  //   `{` FunctionBody `}`
  export type ConciseBodyOrHigher =
    | FunctionBody
    | ConciseBody;

  // GeneratorDeclaration :
  //   `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
  //   [+Default] `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
  export interface GeneratorDeclaration extends ParseNode {
    type: 'GeneratorDeclaration';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    GeneratorBody: GeneratorBody;
  }

  // GeneratorExpression :
  //   `function` `*` BindingIdentifier? `(` FormalParameters `)` `{` GeneratorBody `}`
  export interface GeneratorExpression extends ParseNode {
    type: 'GeneratorExpression';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    GeneratorBody: GeneratorBody;
  }

  // GeneratorMethod :
  //   `*` ClassElementName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
  export interface GeneratorMethod extends ParseNode {
    type: 'GeneratorMethod';
    static?: boolean;
    ClassElementName: ClassElementName;
    PropertySetParameterList: null;
    UniqueFormalParameters: UniqueFormalParameters;
    GeneratorBody: GeneratorBody;
  }

  // GeneratorBody :
  //   FunctionBody
  export interface GeneratorBody extends ParseNode {
    type: 'GeneratorBody';
    directives: string[];
    strict: boolean;
    FunctionStatementList: FunctionStatementList;
  }

  // YieldExpression :
  //   `yield`
  //   `yield` [no LineTerminator here] AssignmentExpression
  //   `yield` [no LineTerminator here] `*` AssignmentExpression
  export interface YieldExpression extends ParseNode {
    type: 'YieldExpression';
    hasStar: boolean;
    AssignmentExpression: AssignmentExpressionOrHigher | null;
  }

  // AsyncGeneratorDeclaration :
  //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  export interface AsyncGeneratorDeclaration extends ParseNode {
    type: 'AsyncGeneratorDeclaration';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    AsyncGeneratorBody: AsyncGeneratorBody;
  }

  // AsyncGeneratorExpression :
  //   `async` `function` `*` BindingIdentifier? `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  export interface AsyncGeneratorExpression extends ParseNode {
    type: 'AsyncGeneratorExpression';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    AsyncGeneratorBody: AsyncGeneratorBody;
  }

  // AsyncGeneratorMethod :
  //   `async` `*` ClassElementName `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`
  export interface AsyncGeneratorMethod extends ParseNode {
    type: 'AsyncGeneratorMethod';
    static?: boolean;
    ClassElementName: ClassElementName;
    PropertySetParameterList: null;
    UniqueFormalParameters: UniqueFormalParameters;
    AsyncGeneratorBody: AsyncGeneratorBody;
  }

  // AsyncGeneratorBody :
  //   FunctionBody
  export interface AsyncGeneratorBody extends ParseNode {
    type: 'AsyncGeneratorBody';
    directives: string[];
    strict: boolean;
    FunctionStatementList: FunctionStatementList;
  }

  // NON-SPEC
  export type FunctionLike =
    | FunctionDeclaration
    | GeneratorDeclaration
    | AsyncFunctionDeclaration
    | AsyncGeneratorDeclaration
    | FunctionExpression
    | GeneratorExpression
    | AsyncFunctionExpression
    | AsyncGeneratorExpression;

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
    | AsyncFunctionBody
    | AsyncGeneratorBody;

  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  export interface ClassDeclaration extends ParseNode {
    type: 'ClassDeclaration';
    BindingIdentifier: BindingIdentifier | null;
    ClassTail: ClassTail;
  }

  // ClassExpression :
  //   `class` BindingIdentifier? ClassTail
  export interface ClassExpression extends ParseNode {
    type: 'ClassExpression';
    BindingIdentifier: BindingIdentifier | null;
    ClassTail: ClassTail;
  }

  // NON-SPEC
  export type ClassLike =
    | ClassDeclaration
    | ClassExpression;

  // ClassTail :
  //   ClassHeritage? `{` ClassBody? `}`
  export interface ClassTail extends ParseNode {
    type: 'ClassTail';
    ClassHeritage: ClassHeritage | null;
    ClassBody: ClassBody | null;
  }

  // ClassHeritage :
  //   `extends` LeftHandSideExpression
  export type ClassHeritage = LeftHandSideExpression;

  // ClassBody :
  //   ClassElementList
  export type ClassBody = ClassElementList;

  // ClassElementList :
  //   ClassElement
  //   ClassElementList ClassElement
  export type ClassElementList = ClassElement[];

  // ClassElement :
  //   MethodDefinition
  //   `static` MethodDefinition
  //   FieldDefinition `;`
  //   `static` FieldDefinition `;`
  //   ClassStaticBlock
  //   `;`
  export type ClassElement =
    | MethodDefinitionOrHigher
    | FieldDefinition
    | ClassStaticBlock;

  // FieldDefinition :
  //   ClassElementName Initializer?
  export interface FieldDefinition extends ParseNode {
    type: 'FieldDefinition';
    static?: boolean;
    ClassElementName: ClassElementName;
    Initializer: Initializer | null; // opt
  }

  // ClassStaticBlock :
  //   `static` `{` ClassStaticBlockBody `}`
  export interface ClassStaticBlock extends ParseNode {
    type: 'ClassStaticBlock';
    static: true;
    ClassStaticBlockBody: ClassStaticBlockBody;
  }

  // ClassStaticBlockBody :
  //   ClassStaticBlockStatementList
  export interface ClassStaticBlockBody extends ParseNode {
    type: 'ClassStaticBlockBody';
    ClassStaticBlockStatementList: ClassStaticBlockStatementList;
  }

  // ClassStaticBlockStatementList :
  //   StatementList?
  export type ClassStaticBlockStatementList = StatementList;

  // AsyncFunctionDeclaration :
  //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncBody `}`
  //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncBody `}`
  export interface AsyncFunctionDeclaration extends ParseNode {
    type: 'AsyncFunctionDeclaration';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    AsyncBody: AsyncFunctionBody;
  }

  // AsyncFunctionExpression :
  //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncBody `}`
  export interface AsyncFunctionExpression extends ParseNode {
    type: 'AsyncFunctionExpression';
    BindingIdentifier: BindingIdentifier | null;
    FormalParameters: FormalParameters;
    AsyncBody: AsyncFunctionBody;
  }

  // AsyncMethod :
  //   `async` ClassElementName `(` UniqueFormalParameters `)` `{` AsyncBody `}`
  export interface AsyncMethod extends ParseNode {
    type: 'AsyncMethod';
    static?: boolean;
    ClassElementName: ClassElementName;
    PropertySetParameterList: null;
    UniqueFormalParameters: UniqueFormalParameters;
    AsyncBody: AsyncFunctionBody;
  }

  // AsyncBody :
  //   FunctionBody
  export interface AsyncFunctionBody extends ParseNode {
    type: 'AsyncFunctionBody';
    directives: string[];
    strict: boolean;
    FunctionStatementList: FunctionStatementList;
  }

  // AsyncArrowFunction :
  //   `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
  //   CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
  //
  // CoverCallExpressionAndAsyncArrowHead :
  //   MemberExpression Arguments
  //
  // AsyncArrowHead (refined) :
  //   `async` ArrowFormalParameters
  export interface AsyncArrowFunction extends ParseNode {
    type: 'AsyncArrowFunction';
    ArrowParameters: ArrowParameters;
    AsyncConciseBody: AsyncConciseBodyOrHigher;
  }

  // AsyncConciseBody (partial) :
  //   ExpressionBody
  export interface AsyncConciseBody extends ParseNode {
    type: 'AsyncConciseBody';
    directives?: undefined;
    ExpressionBody: ExpressionBody;
  }

  // AsyncConciseBody :
  //   ExpressionBody
  //   `{` AsyncFunctionBody `}`
  export type AsyncConciseBodyOrHigher =
    | AsyncFunctionBody
    | AsyncConciseBody;

  // NON-SPEC
  export type ArrowFunctionLike = ArrowFunction | AsyncArrowFunction;

  // NON-SPEC
  export type ConciseBodyLike = ConciseBody | AsyncConciseBody;

  // NON-SPEC
  export type ConciseBodyLikeOrHigher = ConciseBodyOrHigher | AsyncConciseBodyOrHigher;

  export interface RegularExpressionLiteral extends ParseNode {
    type: 'RegularExpressionLiteral';
    RegularExpressionBody: string;
    RegularExpressionFlags: string;
  }

  // CoverParenthesizedExpressionAndArrowParameterList :
  //   `(` Expression `)`
  //   `(` Expression `,` `)`
  //   `(` `)`
  //   `(` `...` BindingIdentifier `)`
  //   `(` `...` BindingPattern `)`
  //   `(` Expression `,` `...` BindingIdentifier `)`
  //   `(` Expression `.` `...` BindingPattern `)`
  export interface CoverParenthesizedExpressionAndArrowParameterList extends ParseNode {
    type: 'CoverParenthesizedExpressionAndArrowParameterList';
    Arguments: (ArgumentListElement | BindingRestElement)[];
    arrowInfo?: ArrowInfo;
  }

  // CoverParenthesizedExpressionAndArrowParameterList (partial) :
  //   `(` Expression `)`
  //
  // ParenthesizedExpression (refined) :
  //   `(` Expression `)`
  export interface ParenthesizedExpression extends ParseNode {
    type: 'ParenthesizedExpression';
    Expression: Expression;
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

  // SuperProperty (partial) :
  //   super `[` Expression `]`
  export interface SuperProperty extends ParseNode {
    type: 'SuperProperty';
    Expression: Expression | null;
  }

  // SuperProperty (partial) :
  //   super `.` IdentifierName
  export interface SuperProperty extends ParseNode {
    type: 'SuperProperty';
    IdentifierName: IdentifierName | null;
  }

  // NewTarget :
  //   `new` `.` `target`
  export interface NewTarget extends ParseNode {
    type: 'NewTarget';
  }

  // ImportMeta :
  //   `import` `.` `meta`
  export interface ImportMeta extends ParseNode {
    type: 'ImportMeta';
  }

  // MetaProperty :
  //   NewTarget
  //   ImportMeta
  export type MetaProperty =
    | NewTarget
    | ImportMeta;

  // MemberExpression (partial) :
  //   MemberExpression `[` Expression `]`
  export interface MemberExpression extends ParseNode {
    type: 'MemberExpression';
    // NOTE: Should be MemberExpressionOrHigher
    MemberExpression: LeftHandSideExpression;
    Expression: Expression | null;
  }

  // MemberExpression (partial) :
  //   MemberExpression `.` IdentifierName
  export interface MemberExpression extends ParseNode {
    type: 'MemberExpression';
    // NOTE: Should be MemberExpressionOrHigher
    MemberExpression: LeftHandSideExpression;
    IdentifierName: IdentifierName | null;
  }

  // MemberExpression (partial) :
  //   MemberExpression `.` PrivateIdentifier
  export interface MemberExpression extends ParseNode {
    type: 'MemberExpression';
    // NOTE: Should be MemberExpressionOrHigher
    MemberExpression: LeftHandSideExpression;
    PrivateIdentifier: PrivateIdentifier | null;
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

  // NewExpression (partial) :
  //   `new` NewExpression
  //
  // MemberExpression (partial) :
  //   `new` MemberExpression Arguments
  export interface NewExpression extends ParseNode {
    type: 'NewExpression';
    // NOTE: Should be NewExpressionOrHigher | MemberExpressionOrHigher
    MemberExpression: LeftHandSideExpression;
    Arguments: Arguments | null;
  }

  // NewExpression :
  //   MemberExpression
  //   `new` NewExpression
  export type NewExpressionOrHigher =
    | MemberExpressionOrHigher
    | NewExpression;

  // SuperCall :
  //   `super` Arguments
  export interface SuperCall extends ParseNode {
    type: 'SuperCall';
    Arguments: Arguments;
  }

  // ImportCall :
  //   `import` `(` AssignmentExpression `)`
  export interface ImportCall extends ParseNode {
    type: 'ImportCall';
    AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // CallExpression (partial) :
  //   CallExpression Arguments
  export interface CallExpression extends ParseNode {
    type: 'CallExpression';
    // NOTE: Should be CallExpressionOrHigher
    CallExpression: LeftHandSideExpression;
    Arguments: Arguments;
    arrowInfo?: ArrowInfo;
  }

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
  export interface TemplateLiteral extends ParseNode {
    type: 'TemplateLiteral';
    TemplateSpanList: string[];
    ExpressionList: Expression[];
  }

  // CallExpression (partial) :
  //   CallExpression TemplateLiteral
  //
  // MemberExpression (partial) :
  //   MemberExpression TemplateLiteral
  export interface TaggedTemplateExpression extends ParseNode {
    type: 'TaggedTemplateExpression';
    // NOTE: Should be CallExpressionOrHigher
    MemberExpression: LeftHandSideExpression;
    TemplateLiteral: TemplateLiteral;
    arrowInfo?: ArrowInfo;
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
    | MemberExpressionOrHigher
    | SuperCall
    | ImportCall
    | CallExpression
    | TaggedTemplateExpression;

  // OptionalExpression :
  //   MemberExpression OptionalChain
  //   CallExpression OptionalChain
  //   OptionalExpression OptionalChain
  export interface OptionalExpression extends ParseNode {
    type: 'OptionalExpression';
    MemberExpression: MemberExpressionOrHigher | CallExpressionOrHigher | OptionalExpression;
    OptionalChain: OptionalChain;
  }

  // OptionalChain (partial) :
  //   `?.` Arguments
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    Arguments?: Arguments;
  }

  // OptionalChain (partial) :
  //   `?.` `[` Expression `]`
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    Expression?: Expression;
  }

  // OptionalChain (partial) :
  //   `?.` IdentifierName
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    IdentifierName?: IdentifierName;
  }

  // OptionalChain (partial) :
  //   `?.` PrivateIdentifier
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    PrivateIdentifier?: PrivateIdentifier;
  }

  // OptionalChain (partial) :
  //   OptionalChain `?.` Arguments
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    OptionalChain: OptionalChain | null;
    Arguments?: Arguments;
  }

  // OptionalChain (partial) :
  //   OptionalChain `?.` `[` Expression `]`
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    OptionalChain: OptionalChain | null;
    Expression?: Expression;
  }

  // OptionalChain (partial) :
  //   OptionalChain `?.` IdentifierName
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    OptionalChain: OptionalChain | null;
    IdentifierName?: IdentifierName;
  }

  // OptionalChain (partial) :
  //   OptionalChain `?.` PrivateIdentifier
  export interface OptionalChain extends ParseNode {
    type: 'OptionalChain';
    OptionalChain: OptionalChain | null;
    PrivateIdentifier?: PrivateIdentifier;
  }

  // ArgumentList (partial) :
  //   `...` AssignmentExpression
  //   ArgumentList `,` `...` AssignmentExpression
  export interface AssignmentRestElement extends ParseNode {
    type: 'AssignmentRestElement';
    AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // ArgumentList :
  //   AssignmentExpression
  //   `...` AssignmentExpression
  //   ArgumentList `,` AssignmentExpression
  //   ArgumentList `,` `...` AssignmentExpression
  export type ArgumentListElement =
    | AssignmentExpressionOrHigher
    | AssignmentRestElement;

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
  export type Arguments = ArgumentListElement[];

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
  export interface UpdateExpression extends ParseNode {
    type: 'UpdateExpression';
    operator: '++' | '--';
    LeftHandSideExpression: LeftHandSideExpression | null;
    UnaryExpression: UnaryExpressionOrHigher | null;
  }

  // UpdateExpression :
  //   LeftHandSideExpression
  //   LeftHandSideExpression [no LineTerminator here] `++`
  //   LeftHandSideExpression [no LineTerminator here] `--`
  //   `++` UnaryExpression
  //   `--` UnaryExpression
  export type UpdateExpressionOrHigher =
    | LeftHandSideExpression
    | UpdateExpression;

  // AwaitExpression : `await` UnaryExpression
  export interface AwaitExpression extends ParseNode {
    type: 'AwaitExpression';
    UnaryExpression: UnaryExpressionOrHigher;
  }

  // UnaryExpression (partial) :
  //   `delete` UnaryExpression
  //   `void` UnaryExpression
  //   `typeof` UnaryExpression
  //   `+` UnaryExpression
  //   `-` UnaryExpression
  //   `~` UnaryExpression
  //   `!` UnaryExpression
  export interface UnaryExpression extends ParseNode {
    type: 'UnaryExpression';
    operator: 'delete' | 'void' | 'typeof' | '+' | '-' | '~' | '!';
    UnaryExpression: UnaryExpressionOrHigher;
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

  // ExponentiationExpression (partial) :
  //   UpdateExpresion `**` ExponentiationExpression
  export interface ExponentiationExpression extends ParseNode {
    type: 'ExponentiationExpression';
    UpdateExpression: UpdateExpressionOrHigher;
    ExponentiationExpression: ExponentiationExpressionOrHigher;
  }

  // ExponentiationExpression :
  //   UnaryExpression
  //   UpdateExpresion `**` ExponentiationExpression
  export type ExponentiationExpressionOrHigher =
    | UnaryExpressionOrHigher
    | ExponentiationExpression;

  // MultiplicativeOperator : one of
  //   `*`  `/`  `%`;
  export type MultiplicativeOperator = '*' | '/' | '%';

  // ExponentiationExpression (partial) :
  //   MultiplicativeExpression MultiplicativeOperator ExponentiationExpression
  export interface MultiplicativeExpression extends ParseNode {
    type: 'MultiplicativeExpression';
    MultiplicativeExpression: MultiplicativeExpressionOrHigher;
    MultiplicativeOperator: MultiplicativeOperator;
    ExponentiationExpression: ExponentiationExpressionOrHigher;
  }

  // MultiplicativeExpression :
  //   ExponentiationExpression
  //   MultiplicativeExpression MultiplicativeOperator ExponentiationExpression
  export type MultiplicativeExpressionOrHigher =
    | ExponentiationExpressionOrHigher
    | MultiplicativeExpression;

  // AdditiveExpression (partial) :
  //   AdditiveExpression `+` MultiplicativeExpression
  //   AdditiveExpression `-` MultiplicativeExpression
  export interface AdditiveExpression extends ParseNode {
    type: 'AdditiveExpression';
    operator: '+' | '-';
    AdditiveExpression: AdditiveExpressionOrHigher;
    MultiplicativeExpression: MultiplicativeExpressionOrHigher;
  }

  // AdditiveExpression :
  //   MultiplicativeExpression
  //   AdditiveExpression `+` MultiplicativeExpression
  //   AdditiveExpression `-` MultiplicativeExpression
  export type AdditiveExpressionOrHigher =
    | MultiplicativeExpressionOrHigher
    | AdditiveExpression;

  // ShiftExpression (partial) :
  //   ShiftExpression `<<` AdditiveExpression
  //   ShiftExpression `>>` AdditiveExpression
  //   ShiftExpression `>>>` AdditiveExpression
  export interface ShiftExpression extends ParseNode {
    type: 'ShiftExpression';
    operator: '<<' | '>>' | '>>>';
    ShiftExpression: ShiftExpressionOrHigher;
    AdditiveExpression: AdditiveExpressionOrHigher;
  }

  // ShiftExpression :
  //   AdditiveExpression
  //   ShiftExpression `<<` AdditiveExpression
  //   ShiftExpression `>>` AdditiveExpression
  //   ShiftExpression `>>>` AdditiveExpression
  export type ShiftExpressionOrHigher =
    | AdditiveExpressionOrHigher
    | ShiftExpression;

  // RelationalExpression (partial) :
  //   RelationalExpression `<` ShiftExpression
  //   RelationalExpression `>` ShiftExpression
  //   RelationalExpression `<=` ShiftExpression
  //   RelationalExpression `>=` ShiftExpression
  //   RelationalExpression `instanceof` ShiftExpression
  //   RelationalExpression `in` ShiftExpression
  export interface RelationalExpression extends ParseNode {
    type: 'RelationalExpression';
    operator: '<' | '>' | '<=' | '>=' | 'instanceof' | 'in';
    PrivateIdentifier?: PrivateIdentifier;
    RelationalExpression?: RelationalExpressionOrHigher;
    ShiftExpression: ShiftExpressionOrHigher;
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

  // EqualityExpression (partial) :
  //   EqualityExpression == RelationalExpression
  //   EqualityExpression != RelationalExpression
  //   EqualityExpression === RelationalExpression
  //   EqualityExpression !== RelationalExpression
  export interface EqualityExpression extends ParseNode {
    type: 'EqualityExpression';
    operator: '==' | '!=' | '===' | '!==';
    EqualityExpression: EqualityExpressionOrHigher;
    RelationalExpression: RelationalExpressionOrHigher;
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

  // BitwiseANDExpression (partial) :
  //   BitwiseANDExpression `^&` EqualityExpression
  export interface BitwiseANDExpression extends ParseNode {
    type: 'BitwiseANDExpression';
    operator: '&';
    A: BitwiseANDExpressionOrHigher;
    B: EqualityExpressionOrHigher;
  }

  // BitwiseANDExpression :
  //   EqualityExpression
  //   BitwiseANDExpression `^&` EqualityExpression
  export type BitwiseANDExpressionOrHigher =
    | EqualityExpressionOrHigher
    | BitwiseANDExpression;

  // BitwiseXORExpression (partial) :
  //   BitwiseXORExpression `^` BitwiseANDExpression
  export interface BitwiseXORExpression extends ParseNode {
    type: 'BitwiseXORExpression';
    operator: '^';
    A: BitwiseXORExpressionOrHigher;
    B: BitwiseANDExpressionOrHigher;
  }

  // BitwiseXORExpression :
  //   BitwiseANDExpression
  //   BitwiseXORExpression `^` BitwiseANDExpression
  export type BitwiseXORExpressionOrHigher =
    | BitwiseANDExpressionOrHigher
    | BitwiseXORExpression;

  // BitwiseORExpression (partial) :
  //   BitwiseORExpression `|` BitwiseXORExpression
  export interface BitwiseORExpression extends ParseNode {
    type: 'BitwiseORExpression';
    operator: '|';
    A: BitwiseORExpressionOrHigher;
    B: BitwiseXORExpressionOrHigher;
  }

  // BitwiseORExpression :
  //   BitwiseXORExpression
  //   BitwiseORExpression `|` BitwiseXORExpression
  export type BitwiseORExpressionOrHigher =
    | BitwiseXORExpressionOrHigher
    | BitwiseORExpression;

  // LogicalANDExpression (partial) :
  //   LogicalANDExpression `&&` BitwiseORExpression
  export interface LogicalANDExpression extends ParseNode {
    type: 'LogicalANDExpression';
    LogicalANDExpression: LogicalANDExpressionOrHigher;
    BitwiseORExpression: BitwiseORExpressionOrHigher;
  }

  // LogicalANDExpression :
  //   BitwiseORExpression
  //   LogicalANDExpression `&&` BitwiseORExpression
  export type LogicalANDExpressionOrHigher =
    | BitwiseORExpressionOrHigher
    | LogicalANDExpression;

  // LogicalORExpression (partial) :
  //   LogicalORExpression `||` LogicalANDExpression
  export interface LogicalORExpression extends ParseNode {
    type: 'LogicalORExpression';
    LogicalORExpression: LogicalORExpressionOrHigher;
    LogicalANDExpression: LogicalANDExpressionOrHigher;
  }

  // LogicalORExpression :
  //   LogicalANDExpression
  //   LogicalORExpression `||` LogicalANDExpression
  export type LogicalORExpressionOrHigher =
    | LogicalANDExpressionOrHigher
    | LogicalORExpression;

  // CoalesceExpression :
  //   CoalesceExpressionHead `??` BitwiseORExpression
  export interface CoalesceExpression extends ParseNode {
    type: 'CoalesceExpression';
    CoalesceExpressionHead: CoalesceExpressionHead;
    BitwiseORExpression: BitwiseORExpressionOrHigher;
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

  // ConditionalExpression (partial) :
  //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
  export interface ConditionalExpression extends ParseNode {
    type: 'ConditionalExpression';
    ShortCircuitExpression: ShortCircuitExpressionOrHigher;
    AssignmentExpression_a: AssignmentExpressionOrHigher;
    AssignmentExpression_b: AssignmentExpressionOrHigher;
  }

  // ConditionalExpression :
  //   ShortCircuitExpression
  //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
  export type ConditionalExpressionOrHigher =
    | ShortCircuitExpressionOrHigher
    | ConditionalExpression;

  // AssignmentExpression (partial) :
  //   LeftHandSideExpression `=` AssignmentExpression
  //   LeftHandSideExpression AssignmentOperator AssignmentExpression
  //   LeftHandSideExpression LogicalAssignmentOperator AssignmentExpression
  //
  export interface AssignmentExpression extends ParseNode {
    type: 'AssignmentExpression';
    // NOTE: Should be LeftHandSideExpression, but some invalid nodes are allowed as they report early errors
    LeftHandSideExpression: AssignmentExpressionOrHigher;
    AssignmentOperator: '=' | AssignmentOperator | LogicalAssignmentOperator;
    AssignmentExpression: AssignmentExpressionOrHigher;
  }

  // AssignmentOperator : one of
  //   `*=`  `/=`  `%=`  `+=`  `-=`  `<<=`  `>>=`  `>>>=`  `&=`  `^=`  `|=`  `**=`
  export type AssignmentOperator = '*=' | '/=' | '%=' | '+=' | '-=' | '<<=' | '>>=' | '>>>=' | '&=' | '^=' | '|=' | '**=';

  // LogicalAssignmentOperator : one of
  //   `&&=`  `||=`  `??=`
  export type LogicalAssignmentOperator = '&&=' | '||=' | '??=';

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

  // NON-SPEC
  export type BinaryExpressionOrHigher =
    | BinaryExpression
    | UnaryExpressionOrHigher;

  // Expression (partial) :
  //   Expression `,` AssignmentExpression
  export interface CommaOperator extends ParseNode {
    type: 'CommaOperator';
    ExpressionList: AssignmentExpressionOrHigher[];
  }

  // Expression :
  //   AssignmentExpression
  //   Expression `,` AssignmentExpression
  export type Expression =
    | CommaOperator
    | AssignmentExpressionOrHigher;

  // LetOrConst :
  //   `let`
  //   `const`
  export type LetOrConst =
    | 'let'
    | 'const';

  // LexicalDeclaration :
  //   LetOrConst BindingList `;`
  export interface LexicalDeclaration extends ParseNode {
    type: 'LexicalDeclaration';
    LetOrConst: LetOrConst;
    BindingList: BindingList;
  }

  // LexicalDeclaration :
  //   LetOrConst BindingList `;`
  export type LexicalDeclarationLike =
    | LexicalDeclaration;

  // BindingList :
  //   LexicalBinding
  //   BindingList `,` LexicalBinding
  export type BindingList = LexicalBinding[];

  // LexicalBinding :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  export interface LexicalBinding extends ParseNode {
    type: 'LexicalBinding';

    // LexicalBinding : BindingIdentifier Initializer?
    BindingIdentifier?: BindingIdentifier;

    // LexicalBinding : BindingPattern Initializer
    BindingPattern?: BindingPattern;

    Initializer: Initializer | null; // opt
  }

  // ObjectBindingPattern :
  //   `{` `}`
  //   `{` BindingRestProperty `}`
  //   `{` BindingPropertyList `}`
  //   `{` BindingPropertyList `,` BindingRestProperty? `}`
  export interface ObjectBindingPattern extends ParseNode {
    type: 'ObjectBindingPattern';
    BindingPropertyList: BindingPropertyList;
    BindingRestProperty?: BindingRestProperty;
  }

  // ArrayBindingPattern :
  //   `[` Elision? BindingRestElement `]`
  //   `[` BindingElementList `]`
  //   `[` BindingElementList `,` Elision? BindingRestElement `]`
  export interface ArrayBindingPattern extends ParseNode {
    type: 'ArrayBindingPattern';
    BindingElementList: BindingElementList;
    BindingRestElement: BindingRestElement;
  }

  // BindingRestProperty :
  //  `...` BindingIdentifier
  export interface BindingRestProperty extends ParseNode {
    type: 'BindingRestProperty';
    BindingIdentifier: BindingIdentifier;
  }

  // BindingProperty : PropertyName : BindingElement
  export interface BindingProperty extends ParseNode {
    type: 'BindingProperty';
    PropertyName: PropertyNameLike;
    BindingElement: BindingElementOrHigher;
  }

  // BindingProperty :
  //   SingleNameBinding
  //   PropertyName : BindingElement
  export type BindingPropertyLike =
    | BindingProperty
    | SingleNameBinding;

  // TODO: document
  export type BindingPropertyList = BindingPropertyLike[];

  // BindingRestElement :
  //   `...` BindingIdentifier
  //   `...` BindingPattern
  export interface BindingRestElement extends ParseNode {
    type: 'BindingRestElement';
    BindingIdentifier?: BindingIdentifier;
    BindingPattern?: BindingPattern;
  }

  // BindingElement :
  //   SingleNameBinding
  //   BindingPattern Initializer?
  export interface BindingElement extends ParseNode {
    type: 'BindingElement';
    BindingPattern: BindingPattern;
    Initializer: Initializer | null; // opt
  }

  // SingleNameBinding :
  //   BindingIdentifier Initializer?
  export interface SingleNameBinding extends ParseNode {
    type: 'SingleNameBinding';
    BindingIdentifier: BindingIdentifier;
    Initializer: Initializer | null; // opt
  }

  // BindingElement :
  //   SingleNameBinding
  //   BindingPattern Initializer?
  export type BindingElementOrHigher =
    | BindingElement
    | SingleNameBinding;

  // BindingElementList :
  //   BindingElisionElement
  //   BindingElementList , BindingElisionElement
  export type BindingElementList = BindingElementListItem[];

  // NON-SPEC
  export type BindingElementListItem =
    | BindingElementOrHigher
    | Elision;

  // BindingPattern :
  //   ObjectBindingPattern
  //   ArrayBindingPattern
  export type BindingPattern =
    | ObjectBindingPattern
    | ArrayBindingPattern;

  // Initializer :
  //   `=` AssignmentExpression
  export type Initializer = AssignmentExpressionOrHigher;

  // StatementList :
  //   StatementListItem
  //   StatementList StatementListItem
  export type StatementList = StatementListItem[];

  // StatementListItem :
  //   Statement
  //   Declaration
  export type StatementListItem =
    | Statement
    | Declaration;

  // Block :
  //   `{` StatementList `}`
  export interface Block extends ParseNode {
    type: 'Block';
    StatementList: StatementList;
  }

  // BlockStatement :
  //   Block
  export type BlockStatement = Block;

  // VariableStatement :
  //   `var` VariableDeclarationList `;`
  export interface VariableStatement extends ParseNode {
    type: 'VariableStatement';
    VariableDeclarationList: VariableDeclarationList;
  }

  // VariableDeclarationList :
  //   VariableDeclaration
  //   VariableDeclarationList `,` VariableDeclaration
  export type VariableDeclarationList = VariableDeclaration[];

  // VariableDeclaration :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  export interface VariableDeclaration extends ParseNode {
    type: 'VariableDeclaration';
    BindingPattern?: BindingPattern;
    BindingIdentifier?: BindingIdentifier;
    Initializer: Initializer | null; // opt
  }

  // EmptyStatement :
  //   `;`
  export interface EmptyStatement extends ParseNode {
    type: 'EmptyStatement';
  }

  // ExpressionStatement :
  //   [lookahead != `{`, `function`, `async` [no LineTerminator here] `function`, `class`, `let` `[` ] Expression `;`
  export interface ExpressionStatement extends ParseNode {
    type: 'ExpressionStatement';
    Expression: Expression;
  }

  // IfStatement :
  //   `if` `(` Expression `)` Statement `else` Statement
  //   `if` `(` Expression `)` Statement [lookahead ≠ `else`]
  export interface IfStatement extends ParseNode {
    type: 'IfStatement';
    Expression: Expression;
    Statement_a: Statement;
    Statement_b: Statement;
  }

  // DoWhileStatement :
  //   `do` Statement `while` `(` Expression `)` `;`
  export interface DoWhileStatement extends ParseNode {
    type: 'DoWhileStatement';
    Statement: Statement;
    Expression: Expression;
  }

  // WhileStatement :
  //   `while` `(` Expression `)` Statement
  export interface WhileStatement extends ParseNode {
    type: 'WhileStatement';
    Expression: Expression;
    Statement: Statement;
  }

  // ForStatement :
  //   `for` `(` [lookahead != `let` `[`] Expression? `;` Expression? `;` Expression? `)` Statement
  //   `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
  //   `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
  export interface ForStatement extends ParseNode {
    type: 'ForStatement';

    /// / ForStatement : `for` `(` [lookahead != `let` `[`] Expression? `;` Expression? `;` Expression? `)` Statement
    // Expression_a?: Expression;
    // Expression_b?: Expression;
    // Expression_c?: Expression;
    // Statement: Statement;

    /// / ForStatement : `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
    // VariableDeclarationList: VariableDeclarationList;
    // Expression_a?: Expression;
    // Expression_b?: Expression;
    // Statement: Statement;

    /// / ForStatement : `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
    // LexicalDeclaration?: LexicalDeclarationLike;
    // Expression_a?: Expression;
    // Expression_b?: Expression;
    // Statement: Statement;

    VariableDeclarationList: VariableDeclarationList;
    LexicalDeclaration?: LexicalDeclarationLike;
    Expression_a?: Expression;
    Expression_b?: Expression;
    Expression_c?: Expression;
    Statement: Statement;
  }

  // ForInOfStatement (partial) :
  //   `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
  //   `for` `(` `var` ForBinding `in` Expression `)` Statement
  //   `for` `(` ForDeclaration `in` Expression `)` Statement
  export interface ForInStatement extends ParseNode {
    type: 'ForInStatement';

    /// / ForInStatement : `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
    // LeftHandSideExpression?: LeftHandSideExpression;
    // Expression: Expression;
    // Statement: Statement;

    /// / ForInStatement : `for` `(` `var` ForBinding `in` Expression `)` Statement
    // ForBinding?: ForBinding;
    // Expression: Expression;
    // Statement: Statement;

    /// / ForInStatement : `for` `(` ForDeclaration `in` Expression `)` Statement
    // ForDeclaration?: ForDeclarationLike;
    // Expression: Expression;
    // Statement: Statement;

    LeftHandSideExpression?: LeftHandSideExpression;
    ForBinding?: ForBinding;
    ForDeclaration?: ForDeclarationLike;
    Expression: Expression;
    Statement: Statement;
  }

  // ForInOfStatement (partial) :
  //   `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  export interface ForOfStatement extends ParseNode {
    type: 'ForOfStatement';

    /// / ForOfStatement : `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    // LeftHandSideExpression?: LeftHandSideExpression;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// / ForOfStatement : `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // ForBinding?: ForBinding;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// / ForOfStatement : `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    // ForDeclaration?: ForDeclarationLike;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    LeftHandSideExpression?: LeftHandSideExpression;
    ForDeclaration?: ForDeclarationLike;
    ForBinding?: ForBinding;
    AssignmentExpression: AssignmentExpressionOrHigher;
    Statement: Statement;
  }

  // ForInOfStatement (partial) :
  //   `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  //   `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  export interface ForAwaitStatement extends ParseNode {
    type: 'ForAwaitStatement';

    /// / ForOfStatement : `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    // LeftHandSideExpression?: LeftHandSideExpression;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// / ForOfStatement : `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // ForBinding?: ForBinding;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    /// / ForOfStatement : `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    // ForDeclaration?: ForDeclarationLike;
    // AssignmentExpression: AssignmentExpressionOrHigher;
    // Statement: Statement;

    LeftHandSideExpression?: LeftHandSideExpression;
    ForDeclaration?: ForDeclarationLike;
    ForBinding?: ForBinding;
    AssignmentExpression: AssignmentExpressionOrHigher;
    Statement: Statement;
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

  // ForDeclaration :
  //   LetOrConst ForBinding
  export interface ForDeclaration extends ParseNode {
    type: 'ForDeclaration';
    LetOrConst: LetOrConst;
    ForBinding: ForBinding;
  }

  // NON-SPEC
  export type ForDeclarationLike =
    | ForDeclaration;

  // ForBinding :
  //   BindingPattern
  //   BindingIdentifier
  export interface ForBinding extends ParseNode {
    type: 'ForBinding';
    BindingIdentifier?: BindingIdentifier;
    BindingPattern?: BindingPattern;
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

  // SwitchStatement :
  //   `switch` `(` Expression `)` CaseBlock
  export interface SwitchStatement extends ParseNode {
    type: 'SwitchStatement';
    Expression: Expression;
    CaseBlock: CaseBlock;
  }

  // CaseBlock :
  //   `{` CaseClauses? `}`
  //   `{` CaseClauses? DefaultClause CaseClauses? `}`
  export interface CaseBlock extends ParseNode {
    type: 'CaseBlock';
    CaseClauses_a?: CaseClauses;
    DefaultClause?: DefaultClause;
    CaseClauses_b?: CaseClauses;
  }

  // CaseClauses :
  //   CaseClause
  //   CaseClauses CauseClause
  export type CaseClauses = CaseClause[];

  // CaseClause :
  //   `case` Expression `:` StatementList?
  export interface CaseClause extends ParseNode {
    type: 'CaseClause';
    Expression: Expression;
    StatementList: StatementList;
  }

  // DefaultClause :
  //   `default` `:` StatementList?
  export interface DefaultClause extends ParseNode {
    type: 'DefaultClause';
    StatementList: StatementList;
  }

  // BreakableStatement :
  //   IterationStatement
  //   SwitchStatement
  export type BreakableStatement =
    | IterationStatement
    | SwitchStatement;

  // ContinueStatement :
  //   `continue` `;`
  //   `continue` [no LineTerminator here] LabelIdentifier `;`
  export interface ContinueStatement extends ParseNode {
    type: 'ContinueStatement';
    LabelIdentifier: LabelIdentifier | null;
  }

  // BreakStatement :
  //   `break` `;`
  //   `break` [no LineTerminator here] LabelIdentifier `;`
  export interface BreakStatement extends ParseNode {
    type: 'BreakStatement';
    LabelIdentifier: LabelIdentifier | null;
  }

  // ReturnStatement :
  //   `return` `;`
  //   `return` [no LineTerminator here] Expression `;`
  export interface ReturnStatement extends ParseNode {
    type: 'ReturnStatement';
    Expression: Expression | null;
  }

  // WithStatement :
  //   `with` `(` Expression `)` Statement
  export interface WithStatement extends ParseNode {
    type: 'WithStatement';
    Expression: Expression;
    Statement: Statement;
  }

  // TODO: document
  export interface LabelledStatement extends ParseNode {
    type: 'LabelledStatement';
    LabelIdentifier: LabelIdentifier;
    LabelledItem: Statement;
  }

  // ThrowStatement :
  //   `throw` [no LineTerminator here] Expression `;`
  export interface ThrowStatement extends ParseNode {
    type: 'ThrowStatement';
    Expression: Expression;
  }

  // TryStatement :
  //   `try` Block Catch
  //   `try` Block Finally
  //   `try` Block Catch Finally
  export interface TryStatement extends ParseNode {
    type: 'TryStatement';
    Block: Block;
    Catch: Catch | null;
    Finally: Finally | null;
  }

  // Catch :
  //   `catch` `(` CatchParameter `)` Block
  //   `catch` Block
  //
  // CatchParameter :
  //   BindingIdentifier
  //   BindingPattern
  export interface Catch extends ParseNode {
    type: 'Catch';
    CatchParameter: BindingPattern | BindingIdentifier | null;
    Block: Block;
  }

  // Finally :
  //   `finally` Block
  export type Finally =
    | Block;

  // DebuggerStatement :
  //   `debugger` `;`
  export interface DebuggerStatement extends ParseNode {
    type: 'DebuggerStatement';
  }

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
export type HoistableDeclaration =
    | FunctionDeclaration
    | GeneratorDeclaration
    | AsyncFunctionDeclaration
    | AsyncGeneratorDeclaration;
export type Declaration =
    | HoistableDeclaration
    | ClassDeclaration
    | LexicalDeclarationLike;

  // Script :
  //   ScriptBody?
  export interface Script extends ParseNode {
    type: 'Script';
    ScriptBody: ScriptBody | null;
  }

  // ScriptBody :
  //   StatementList
  export interface ScriptBody extends ParseNode {
    type: 'ScriptBody';
    StatementList: StatementList;
  }

  // Module :
  //   ModuleBody?
  export interface Module extends ParseNode {
    type: 'Module';
    ModuleBody: ModuleBody | null;
    hasTopLevelAwait: boolean;
  }

  // ModuleBody :
  //   ModuleItemList
  export interface ModuleBody extends ParseNode {
    type: 'ModuleBody';
    ModuleItemList: ModuleItemList;
  }

  // ModuleItemList :
  //   ModuleItem
  //   ModuleItemList ModuleItem
  export type ModuleItemList = ModuleItem[];

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
  export interface ImportDeclaration extends ParseNode {
    type: 'ImportDeclaration';
    ModuleSpecifier?: PrimaryExpression;
    ImportClause?: ImportClause;
    FromClause?: FromClause;
  }

  // FromClause :
  //   `from` ModuleSpecifier
  export type FromClause =
    | ModuleSpecifier;

  // ModuleSpecifier :
  //   StringLiteral
  export type ModuleSpecifier =
    | StringLiteral;

  // ImportClause :
  //   ImportedDefaultBinding
  //   NameSpaceImport
  //   NamedImports
  //   ImportedDefaultBinding `,` NameSpaceImport
  //   ImportedDefaultBinding `,` NamedImports
  export interface ImportClause extends ParseNode {
    type: 'ImportClause';
    ImportedDefaultBinding?: ImportedDefaultBinding;
    NameSpaceImport?: NameSpaceImport;
    NamedImports?: NamedImports;
  }

  // ImportedDefaultBinding :
  //   ImportedBinding
  export interface ImportedDefaultBinding extends ParseNode {
    type: 'ImportedDefaultBinding';
    ImportedBinding: ImportedBinding;
  }

  // ImportedBinding :
  //   BindingIdentifier
  export type ImportedBinding =
    | BindingIdentifier;

  // NameSpaceImport :
  //   `*` `as` ImportedBinding
  export interface NameSpaceImport extends ParseNode {
    type: 'NameSpaceImport';
    ImportedBinding: ImportedBinding;
  }

  // NamedImports :
  //   `{` `}`
  //   `{` ImportsList `}`
  //   `{` ImportsList `,` `}`
  export interface NamedImports extends ParseNode {
    type: 'NamedImports';
    ImportsList: ImportsList;
  }

  // ImportsList :
  //   ImportSpecifier
  //   ImportsList `,` ImportSpecifier
  export type ImportsList = ImportSpecifier[];

  // ImportSpecifier :
  //   ImportedBinding
  //   ModuleExportName `as` ImportedBinding
  export interface ImportSpecifier extends ParseNode {
    type: 'ImportSpecifier';
    ModuleExportName?: ModuleExportName;
    ImportedBinding: ImportedBinding;
  }

  // ExportDeclaration :
  //   `export` ExportFromClause FromClause `;`
  //   `export` NamedExports `;`
  //   `export` VariableStatement
  //   `export` Declaration
  //   `export` `default` HoistableDeclaration
  //   `export` `default` ClassDeclaration
  //   `export` `default` AssignmentExpression `;`
  export interface ExportDeclaration extends ParseNode {
    type: 'ExportDeclaration';
    default: boolean;
    HoistableDeclaration?: HoistableDeclaration;
    ClassDeclaration?: ClassDeclaration;
    AssignmentExpression?: AssignmentExpressionOrHigher;
    Declaration?: Declaration;
    VariableStatement?: VariableStatement;
    ExportFromClause?: ExportFromClauseLike;
    FromClause?: FromClause;
    NamedExports?: NamedExports;
  }

  // ExportFromClause (partial) :
  //   `*`
  //   `*` as ModuleExportName
  export interface ExportFromClause extends ParseNode {
    type: 'ExportFromClause';
    ModuleExportName?: ModuleExportName;
  }

  // ExportFromClause :
  //   `*`
  //   `*` as ModuleExportName
  //   NamedExports
  export type ExportFromClauseLike =
    | NamedExports
    | ExportFromClause;

  // NamedExports :
  //   `{` `}`
  //   `{` ExportsList `}`
  //   `{` ExportsList `,` `}`
  export interface NamedExports extends ParseNode {
    type: 'NamedExports';
    ExportsList: ExportsList;
  }

  // ExportsList :
  //   ExportSpecifier
  //   ExportsList `,` ExportSpecifier
  export type ExportsList = ExportSpecifier[];

  // ExportSpecifier :
  //   ModuleExportName
  //   ModuleExportName `as` ModuleExportName
  export interface ExportSpecifier extends ParseNode {
    type: 'ExportSpecifier';
    localName: ModuleExportName;
    exportName: ModuleExportName;
  }

  // Gets all keys of all constituents of a union
  type AllKeysOf<T> = T extends unknown ? keyof T : never;

  // Gets all values for a given key for all constituents of a union
  type AllValuesOf<T, K extends AllKeysOf<T>> = T extends unknown ? K extends keyof T ? T[K] : never : never;

  // NON-SPEC
  /**
   * Used internally to describe a node that is still being parsed. Unfinished nodes may not yet be fully defined.
   */
  export type Unfinished<T extends ParseNode> = (
    // An unfinished node...

    // ...includes all properties of ParseNode except `type`
    & Pick<ParseNode, 'location' | 'strict' | 'sourceText'>

    // ...includes all properties of all potential types, with each property marked as optional
    & { [K in Exclude<AllKeysOf<T>, 'location' | 'strict' | 'sourceText'>]?: AllValuesOf<T, K>; }

    // ...includes a type-only cache of the potential nodes it represents. The finished type will be extracted from
    //    this cache.
    & { [K in typeof kPotentialNodes]: T }
  );

  // NON-SPEC
  /**
   * Used internally to indicate a node that has finished parsing.
   */
  export type Finished<T extends ParseNode | Unfinished<ParseNode>, K extends T['type']> =
    T extends Unfinished<ParseNode> ? Extract<T[typeof kPotentialNodes], { type: K }> :
    T;
}

// This value does not exist at runtime. Only its type is used to stash additional type information on a `ParseNode.Unfinished` type.
declare const kPotentialNodes: unique symbol;
