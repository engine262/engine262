@preprocessor esmodule

@{%
import Scientific from './Scientific.mjs';
function c(val) {
  return () => val;
}
%}

##################################################
# 7.1.3.1 #sec-tonumber-applied-to-the-string-type

StrNumericLiteral ->
    StrDecimalLiteral    {% ([StrDecimalLiteral]) => StrDecimalLiteral %}
  | BinaryIntegerLiteral {% ([BinaryIntegerLiteral]) => BinaryIntegerLiteral %}
  | OctalIntegerLiteral  {% ([OctalIntegerLiteral]) => OctalIntegerLiteral %}
  | HexIntegerLiteral    {% ([HexIntegerLiteral]) => HexIntegerLiteral %}

# #prod-StrDecimalLiteral
StrDecimalLiteral ->
    StrUnsignedDecimalLiteral     {% ([StrUnsignedDecimalLiteral]) => StrUnsignedDecimalLiteral %}
  | "+" StrUnsignedDecimalLiteral {% ([_, StrUnsignedDecimalLiteral]) => StrUnsignedDecimalLiteral %}
  | "-" StrUnsignedDecimalLiteral {% ([_, StrUnsignedDecimalLiteral]) => StrUnsignedDecimalLiteral.negate() %}

# #prod-StrUnsignedDecimalLiteral
StrUnsignedDecimalLiteral ->
    "Infinity"                                   {% () => new Scientific(1n, 10000n) %}
  | DecimalDigits "."                            {% ([[DecimalDigits]]) => new Scientific(DecimalDigits) %}
  | DecimalDigits "." DecimalDigits              {% ([[first], _, [second, n]]) => new Scientific(first).addSci(new Scientific(second, -n)) %}
  | DecimalDigits "." ExponentPart               {% ([[DecimalDigits], _, e]) => new Scientific(DecimalDigits, e) %}
  | DecimalDigits "." DecimalDigits ExponentPart {% ([[first], _, [second, n], e]) => (new Scientific(first).addSci(new Scientific(second, -n))).expAdd(e) %}
  | "." DecimalDigits                            {% ([_, [DecimalDigits, n]]) => new Scientific(DecimalDigits, -n) %}
  | "." DecimalDigits ExponentPart               {% ([_, [DecimalDigits, n], e]) => new Scientific(DecimalDigits, e - n) %}
  | DecimalDigits                                {% ([[DecimalDigits]]) => new Scientific(DecimalDigits) %}
  | DecimalDigits ExponentPart                   {% ([[DecimalDigits], e]) => new Scientific(DecimalDigits, e) %}

#######################################
# 11.8.3 #sec-literals-numeric-literals

# #prod-NumericLiteral
NumericLiteral ->
    DecimalLiteral       {% ([DecimalLiteral]) => DecimalLiteral %}
  | BinaryIntegerLiteral {% ([BinaryIntegerLiteral]) => BinaryIntegerLiteral %}
  | OctalIntegerLiteral  {% ([OctalIntegerLiteral]) => OctalIntegerLiteral %}
  | HexIntegerLiteral    {% ([HexIntegerLiteral]) => HexIntegerLiteral %}

# #prod-DecimalLiteral
DecimalLiteral ->
    DecimalIntegerLiteral "."                            {% ([DecimalIntegerLiteral]) => new Scientific(DecimalIntegerLiteral) %}
  | DecimalIntegerLiteral "." DecimalDigits              {% ([DecimalIntegerLiteral, _, [DecimalDigits, n]]) => new Scientific(DecimalIntegerLiteral).addSci(new Scientific(DecimalDigits, -n)) %}
  | DecimalIntegerLiteral "." ExponentPart               {% ([DecimalIntegerLiteral, _, e]) => new Scientific(DecimalIntegerLiteral, e) %}
  | DecimalIntegerLiteral "." DecimalDigits ExponentPart {% ([DecimalIntegerLiteral, _, [DecimalDigits, n], e]) => new Scientific(DecimalIntegerLiteral).addSci(new Scientific(DecimalDigits, -n)).expAdd(e) %}
  | "." DecimalDigits                                    {% ([_, [DecimalDigits, n]]) => new Scientific(DecimalDigits, -n) %}
  | "." DecimalDigits ExponentPart                       {% ([_, [DecimalDigits, n], e]) => new Scientific(DecimalDigits, e - n) %}
  | DecimalIntegerLiteral                                {% ([DecimalIntegerLiteral]) => new Scientific(DecimalIntegerLiteral) %}
  | DecimalIntegerLiteral ExponentPart                   {% ([DecimalIntegerLiteral, e]) => new Scientific(DecimalIntegerLiteral, e) %}

# #prod-DecimalIntegerLiteral
DecimalIntegerLiteral ->
    "0"                        {% c(0n) %}
  | NonZeroDigit               {% ([NonZeroDigit]) => NonZeroDigit %}
  | NonZeroDigit DecimalDigits {% ([NonZeroDigit, [DecimalDigits, n]]) => NonZeroDigit * (10n ** n) + DecimalDigits %}

# #prod-DecimalDigits
DecimalDigits ->
    DecimalDigit               {% ([DecimalDigit]) => [DecimalDigit, 1n] %}
  | DecimalDigits DecimalDigit {% ([[DecimalDigits, n], DecimalDigit]) => [DecimalDigits * 10n + DecimalDigit, n + 1n] %}

# #prod-DecimalDigit
DecimalDigit ->
    "0" {% c(0n) %}
  | "1" {% c(1n) %}
  | "2" {% c(2n) %}
  | "3" {% c(3n) %}
  | "4" {% c(4n) %}
  | "5" {% c(5n) %}
  | "6" {% c(6n) %}
  | "7" {% c(7n) %}
  | "8" {% c(8n) %}
  | "9" {% c(9n) %}

# #prod-NonZeroDigit
NonZeroDigit ->
    "1" {% c(1n) %}
  | "2" {% c(2n) %}
  | "3" {% c(3n) %}
  | "4" {% c(4n) %}
  | "5" {% c(5n) %}
  | "6" {% c(6n) %}
  | "7" {% c(7n) %}
  | "8" {% c(8n) %}
  | "9" {% c(9n) %}

# #prod-ExponentPart
ExponentPart -> ExponentIndicator SignedInteger {% ([_, SignedInteger]) => SignedInteger %}

# #prod-ExponentIndicator
ExponentIndicator -> "e"i

# #prod-SignedInteger
SignedInteger ->
    DecimalDigits     {% ([[DecimalDigits]]) => DecimalDigits %}
  | "+" DecimalDigits {% ([_, [DecimalDigits]]) => DecimalDigits %}
  | "-" DecimalDigits {% ([_, [DecimalDigits]]) => -DecimalDigits %}

# #prod-BinaryIntegerLiteral
BinaryIntegerLiteral -> "0b"i BinaryDigits {% ([_, BinaryDigits]) => new Scientific(BinaryDigits) %}

# #prod-BinaryDigits
BinaryDigits ->
    BinaryDigit              {% ([BinaryDigit]) => BinaryDigit %}
  | BinaryDigits BinaryDigit {% ([BinaryDigits, BinaryDigit]) => BinaryDigits * 2n + BinaryDigit %}

# #prod-BinaryDigit
BinaryDigit ->
    "0" {% c(0n) %}
  | "1" {% c(1n) %}

# #prod-OctalIntegerLiteral
OctalIntegerLiteral -> "0o"i OctalDigits {% ([_, OctalDigits]) => new Scientific(OctalDigits) %}

# #prod-OctalDigits
OctalDigits ->
    OctalDigit             {% ([OctalDigit]) => OctalDigit %}
  | OctalDigits OctalDigit {% ([OctalDigits, OctalDigit]) => OctalDigits * 8n + OctalDigit %}

# #prod-OctalDigit
OctalDigit ->
    "0" {% c(0n) %}
  | "1" {% c(1n) %}
  | "2" {% c(2n) %}
  | "3" {% c(3n) %}
  | "4" {% c(4n) %}
  | "5" {% c(5n) %}
  | "6" {% c(6n) %}
  | "7" {% c(7n) %}

# #prod-HexIntegerLiteral
HexIntegerLiteral -> "0x"i HexDigits {% ([_, HexDigits]) => new Scientific(HexDigits) %}

# #prod-HexDigits
HexDigits ->
    HexDigit           {% ([HexDigit]) => HexDigit %}
  | HexDigits HexDigit {% ([HexDigits, HexDigit]) => HexDigits * 16n + HexDigit %}

# #prod-HexDigit
HexDigit ->
    "0"  {% c(0n) %}
  | "1"  {% c(1n) %}
  | "2"  {% c(2n) %}
  | "3"  {% c(3n) %}
  | "4"  {% c(4n) %}
  | "5"  {% c(5n) %}
  | "6"  {% c(6n) %}
  | "7"  {% c(7n) %}
  | "8"  {% c(8n) %}
  | "9"  {% c(9n) %}
  | "a"i {% c(10n) %}
  | "b"i {% c(11n) %}
  | "c"i {% c(12n) %}
  | "d"i {% c(13n) %}
  | "e"i {% c(14n) %}
  | "f"i {% c(15n) %}
