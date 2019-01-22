@preprocessor esmodule

Pattern ->
    Disjunction

Disjunction ->
    Alternative
  | Alternative  "|" Disjunction

Alternative ->
    null
  | Alternative Term

Term ->
    Assertion
  | Atom
  | Atom Quantifier

Assertion ->
    "^"
  | "$"
  | "\\b"
  | "\\B"
  | "(?=" Disjunction ")"
  | "(?!" Disjunction ")"
  | "(?<=" Disjunction ")"
  | "(?<!" Disjunction ")"

Quantifier ->
    QuantifierPrefix
  | QuantifierPrefix "?"

QuantifierPrefix ->
    "*"
  | "+"
  | "?"
  | "{" DecimalDigits "}"
  | "{" DecimalDigits ",}"
  | "{" DecimalDigits "," DecimalDigits "}"

Atom ->
    PatternCharacter
  | "."
  | "\\" AtomEscape 
  | CharacterClass 
  | "(" GroupSpecifier Disjunction ")"
  | "(?:" Disjunction ")"

SyntaxCharacter ->
    [$^\\.*+?()[\]{}|]

PatternCharacter ->
    [^$^\\.*+?()[\]{}|]

AtomEscape ->
    DecimalEscape
  | CharacterClassEscape 
  | CharacterEscape 
  | "k" GroupName

CharacterEscape ->
    ControlEscape
  | "c" ControlLetter
  | "0" # [lookahead ∉ DecimalDigit]
  | HexEscapeSequence
  | RegExpUnicodeEscapeSequence 
  | IdentityEscape 

ControlEscape ->
    [fnrtv]

ControlLetter ->
    [abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ]

GroupSpecifier ->
    null
  | "?" GroupName

GroupName ->
    "<" RegExpIdentifierName ">"

RegExpIdentifierName ->
    RegExpIdentifierStart 
  | RegExpIdentifierName RegExpIdentifierPart 

RegExpIdentifierStart ->
    [a-zA-Z]# UnicodeIDStart
  | "$"
  | "_"
  "\\" RegExpUnicodeEscapeSequence

RegExpIdentifierPart ->
    [a-zA-Z0-9] # UnicodeIDContinue
  | "$"
  | "\\" RegExpUnicodeEscapeSequence
  | [\u200C] # <ZWNJ>
  | [\u200D] # <ZWJ>

RegExpUnicodeEscapeSequence ->
    "u" LeadSurrogate "\\u" TrailSurrogate
  | "u" LeadSurrogate
  | "u" TrailSurrogate
  | "u" NonSurrogate
  | "u" Hex4Digits
  | "u{" CodePoint "}"

# Each \u TrailSurrogate for which the choice of associated u LeadSurrogate is ambiguous shall be associated with the nearest possible u LeadSurrogate that would otherwise have no corresponding \u TrailSurrogate.

LeadSurrogate ->
    Hex4Digits # but only if the SV of Hex4Digits is in the inclusive range 0xD800 to 0xDBFF

TrailSurrogate ->
    Hex4Digits # but only if the SV of Hex4Digits is in the inclusive range 0xDC00 to 0xDFFF

NonSurrogate ->
    Hex4Digits # but only if the SV of Hex4Digits is not in the inclusive range 0xD800 to 0xDFFF

IdentityEscape ->
    SyntaxCharacter
  | "/"
  | . # SourceCharacter # but not UnicodeIDContinue

DecimalEscape ->
    NonZeroDigit DecimalDigits # opt[lookahead ∉ DecimalDigit]

CharacterClassEscape ->
    "d"
  | "D"
  | "s"
  | "S"
  | "w"
  | "W"
  | "p{" UnicodePropertyValueExpression "}"
  | "P{" UnicodePropertyValueExpression "}"

UnicodePropertyValueExpression ->
    UnicodePropertyName "=" UnicodePropertyValue
    LoneUnicodePropertyNameOrValue

UnicodePropertyName ->
    UnicodePropertyNameCharacters

UnicodePropertyNameCharacters ->
    UnicodePropertyNameCharacter UnicodePropertyNameCharacters

UnicodePropertyValue ->
    UnicodePropertyValueCharacters

LoneUnicodePropertyNameOrValue ->
    UnicodePropertyValueCharacters

UnicodePropertyValueCharacters ->
    UnicodePropertyValueCharacter UnicodePropertyValueCharacters

UnicodePropertyValueCharacter ->
    UnicodePropertyNameCharacter
  | [0-9]

UnicodePropertyNameCharacter ->
    ControlLetter
  | "_"

CharacterClass ->
    "[" ClassRanges "]" # [lookahead ∉ { ^ }]
  | "[^" ClassRanges "]"

ClassRanges ->
    null
  | NonemptyClassRanges 

NonemptyClassRanges ->
    ClassAtom
  | ClassAtom NonemptyClassRangesNoDash
  | ClassAtom "-" ClassAtom ClassRanges

NonemptyClassRangesNoDash ->
    ClassAtom
  | ClassAtomNoDash NonemptyClassRangesNoDash
  | ClassAtomNoDash "-" ClassAtom ClassRanges

ClassAtom ->
    "-"
  | ClassAtomNoDash 

ClassAtomNoDash ->
    [^\\\]-]# SourceCharacterbut not one of \ or ] or -
  | "\\" ClassEscape

ClassEscape ->
    "b"
  | "-"
  | CharacterClassEscape
  | CharacterEscape

DecimalDigits ->
    DecimalDigit
  | DecimalDigits DecimalDigit

DecimalDigit ->
    [0-9]

HexEscapeSequence ->
    "x" HexDigit HexDigit

Hex4Digits ->
    HexDigit HexDigit HexDigit HexDigit

HexDigit ->
    [0-9a-fA-F]

CodePoint ->
    HexDigits

HexDigits ->
    HexDigit
  | HexDigits HexDigit

NonZeroDigit ->
    [1-9]
