// https://tc39.es/proposal-temporal/#sec-temporal-iso8601grammar

import type { TemporalDurationObject } from '../intrinsics/Temporal/Duration.mts';
import { unreachable } from '../helpers.mts';
import { remainder } from '../abstract-ops/math.mts';
import {
  Assert,
  CreateTemporalDuration,
  CreateTimeRecord,
  IsValidISODate,
  JSStringValue,
  NormalCompletion,
  ObjectValue,
  Q,
  StringToNumber,
  Throw,
  ThrowCompletion,
  ToIntegerWithTruncation,
  ToPrimitive,
  Value,
  X,
  type Formattable,
  type Mutable,
  type PlainCompletion, type PlainEvaluator, type TimeRecord,
  type ValueEvaluator,
} from '#self';

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-string-time-zone-parse-records */
export interface ISOStringTimeZoneParseRecord {
  readonly Z: boolean;
  readonly OffsetString: string | undefined;
  readonly TimeZoneAnnotation: string | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-time-parse-records */
export interface ISODateTimeParseRecord {
  readonly Year: number | undefined;
  readonly Month: number;
  readonly Day: number;
  readonly Time: TimeRecord | 'start-of-day';
  readonly TimeZone: ISOStringTimeZoneParseRecord;
  readonly Calendar: string | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-parseisodatetime */
export function ParseISODateTime(isoString: string, allowedFormats: Array<'TemporalInstantString' | 'TemporalDateTimeString[~Zoned]' | 'TemporalTimeString' | 'TemporalMonthDayString' | 'TemporalYearMonthString' | 'TemporalDateTimeString[+Zoned]'>): PlainCompletion<ISODateTimeParseRecord> {
  let parseResult: ObjectValue[] | undefined | RFC9557ParseNode.AnnotatedDateTime | RFC9557ParseNode.TemporalTimeString | RFC9557ParseNode.TemporalInstantString | RFC9557ParseNode.TemporalMonthDayString | RFC9557ParseNode.TemporalYearMonthString;
  let calendar: string | undefined;
  let yearAbsent = false;

  // Note: see https://github.com/tc39/proposal-temporal/issues/3281
  let year = 0;
  let month: number | undefined;
  let day: number | undefined;
  let hour: number | undefined;
  let minute: number | undefined;
  let second: number | undefined;
  let fSeconds: RFC9557ParseNode.TemporalDecimalFraction | undefined;
  let timeZoneIdentifier: RFC9557ParseNode.TimeZoneIdentifier | undefined;
  let UTCDesignator: RFC9557ParseNode.DateTimeUTCOffset['UTCDesignator'] | undefined;
  let UTCOffset: RFC9557ParseNode.UTCOffset | undefined;
  const assignTimeSpec = (timeSpec: RFC9557ParseNode.TimeSpec) => {
    hour = parseFloat(timeSpec.Hour);
    minute = timeSpec.Minute ? parseFloat(timeSpec.Minute) : undefined;
    second = timeSpec.Second ? parseFloat(timeSpec.Second) : undefined;
    fSeconds = timeSpec.TemporalDecimalFraction;
  };
  const assignDateSpec = (dateSpec: RFC9557ParseNode.DateSpec) => {
    year = dateSpec.Year;
    month = dateSpec.Month;
    day = dateSpec.Day;
  };
  const assignTimeZone = (TimeZoneAnnotation?: RFC9557ParseNode.TimeZoneAnnotation, DateTimeUTCOffset?: RFC9557ParseNode.DateTimeUTCOffset) => {
    timeZoneIdentifier = TimeZoneAnnotation?.TimeZoneIdentifier;
    UTCDesignator = DateTimeUTCOffset?.UTCDesignator;
    UTCOffset = DateTimeUTCOffset?.UTCOffset;
  };
  for (const goal of allowedFormats) {
    if (!parseResult || !Array.isArray(parseResult)) {
      parseResult = DateParser.parse(
        isoString,
        (parser) => {
          switch (goal) {
            case 'TemporalDateTimeString[+Zoned]':
            case 'TemporalDateTimeString[~Zoned]': {
              const node = parser.with({ Zoned: goal === 'TemporalDateTimeString[+Zoned]' }, () => parser.parseTemporalDateTimeString());
              assignTimeZone(node.TimeZoneAnnotation, node.DateTime.DateTimeUTCOffset);
              assignDateSpec(node.DateTime.Date);
              if (node.DateTime.Time) assignTimeSpec(node.DateTime.Time);
              return node;
            }
            case 'TemporalTimeString': {
              const node = parser.parseTemporalTimeString();
              if (node.AnnotatedDateTime) {
                assignTimeZone(node.AnnotatedDateTime.TimeZoneAnnotation, node.AnnotatedDateTime.DateTime.DateTimeUTCOffset);
                assignDateSpec(node.AnnotatedDateTime.DateTime.Date);
                if (node.AnnotatedDateTime.DateTime.Time) assignTimeSpec(node.AnnotatedDateTime.DateTime.Time);
              } else {
                Assert(!!node.AnnotatedTime);
                assignTimeZone(node.AnnotatedTime.TimeZoneAnnotation, node.AnnotatedTime.DateTimeUTCOffset);
                assignTimeSpec(node.AnnotatedTime.Time);
              }
              return node;
            }
            case 'TemporalInstantString': {
              const node = parser.parseTemporalInstantString();
              assignTimeZone(node.TimeZoneAnnotation, node.DateTimeUTCOffset);
              assignDateSpec(node.Date);
              assignTimeSpec(node.Time);
              return node;
            }
            case 'TemporalMonthDayString': {
              const node = parser.parseTemporalMonthDayString();
              if (node.AnnotatedDateTime) {
                assignTimeZone(node.AnnotatedDateTime.TimeZoneAnnotation, node.AnnotatedDateTime.DateTime.DateTimeUTCOffset);
                assignDateSpec(node.AnnotatedDateTime.DateTime.Date);
                if (node.AnnotatedDateTime.DateTime.Time) assignTimeSpec(node.AnnotatedDateTime.DateTime.Time);
              } else {
                Assert(!!node.AnnotatedMonthDay);
                assignTimeZone(node.AnnotatedMonthDay.TimeZoneAnnotation);
                month = node.AnnotatedMonthDay.DateSpecMonthDay.Month;
                day = node.AnnotatedMonthDay.DateSpecMonthDay.Day;
              }
              return node;
            }
            case 'TemporalYearMonthString': {
              const node = parser.parseTemporalYearMonthString();
              if (node.AnnotatedDateTime) {
                assignTimeZone(node.AnnotatedDateTime.TimeZoneAnnotation, node.AnnotatedDateTime.DateTime.DateTimeUTCOffset);
                assignDateSpec(node.AnnotatedDateTime.DateTime.Date);
                if (node.AnnotatedDateTime.DateTime.Time) assignTimeSpec(node.AnnotatedDateTime.DateTime.Time);
              } else {
                Assert(!!node.AnnotatedYearMonth);
                assignTimeZone(node.AnnotatedYearMonth.TimeZoneAnnotation, undefined);
                month = node.AnnotatedYearMonth.DateSpecYearMonth.Month;
                year = node.AnnotatedYearMonth.DateSpecYearMonth.Year;
              }
              return node;
            }
            default:
              return unreachable(goal);
          }
        },
      );
      if (parseResult && !Array.isArray(parseResult)) {
        let calendarWasCritical = false;

        // 2. For each Annotation Parse Node annotation contained within parseResult, do
        let annotations: readonly RFC9557ParseNode.Annotation[] = [];
        if ('Annotations' in parseResult && parseResult.Annotations) {
          annotations = annotations.concat(parseResult.Annotations);
        }
        if ('AnnotatedDateTime' in parseResult && parseResult.AnnotatedDateTime?.Annotations) {
          annotations = annotations.concat(parseResult.AnnotatedDateTime.Annotations);
        }
        if ('AnnotatedTime' in parseResult && parseResult.AnnotatedTime?.Annotations) {
          annotations = annotations.concat(parseResult.AnnotatedTime.Annotations);
        }
        if ('AnnotatedMonthDay' in parseResult && parseResult.AnnotatedMonthDay?.Annotations) {
          annotations = annotations.concat(parseResult.AnnotatedMonthDay.Annotations);
        }
        if ('AnnotatedYearMonth' in parseResult && parseResult.AnnotatedYearMonth?.Annotations) {
          annotations = annotations.concat(parseResult.AnnotatedYearMonth.Annotations);
        }

        for (const Annotation of annotations) {
          const key = Annotation.AnnotationKey;
          const value = Annotation.AnnotationValue;
          if (key === 'u-ca') {
            if (!calendar) {
              calendar = value;
              if (Annotation.CriticalFlag) calendarWasCritical = true;
            } else {
              if (Annotation.CriticalFlag || calendarWasCritical) return Throw.RangeError('Critical calendar annotation failed.');
            }
          } else {
            if (Annotation.CriticalFlag) return Throw.RangeError('Critical annotation "$1" failed.', key);
          }
        }

        // https://github.com/tc39/ecma262/pull/3759/changes#r2851037938
        if (goal === 'TemporalYearMonthString' && (parseResult as RFC9557ParseNode.TemporalYearMonthString).AnnotatedDateTime?.DateTime.Date.Day === undefined) {
          if (calendar !== undefined && calendar.toLowerCase() !== 'iso8601') return Throw.RangeError('Calendar annotation is not allowed when day is absent');
        }

        if (goal === 'TemporalMonthDayString' && (parseResult as RFC9557ParseNode.TemporalMonthDayString).AnnotatedDateTime?.DateTime.Date.Year === undefined) {
          if (calendar !== undefined && calendar.toLowerCase() !== 'iso8601') return Throw.RangeError('Calendar annotation is not allowed when year is absent');
          yearAbsent = true;
        }
      }
    }
  }

  Assert(!!parseResult);
  if (Array.isArray(parseResult!)) {
    return Throw.RangeError('Invalid date: $1', parseResult[0].properties.get('message')?.Value || '');
  }

  month ??= 1;
  day ??= 1;
  hour ??= 0;
  minute ??= 0;
  second ??= 0;
  if (second === 60) second = 59;
  let millisecondMV: number;
  let microsecondMV: number;
  let nanosecondMV: number;
  if (fSeconds) {
    const fSecondsDigits = fSeconds.digits;
    const fSecondsDigitsExtended = `${fSecondsDigits}000000000`;
    const millisecond = fSecondsDigitsExtended.substring(0, 3);
    const microsecond = fSecondsDigitsExtended.substring(3, 6);
    const nanosecond = fSecondsDigitsExtended.substring(6, 9);
    millisecondMV = StringToNumber(millisecond);
    microsecondMV = StringToNumber(microsecond);
    nanosecondMV = StringToNumber(nanosecond);
  } else {
    millisecondMV = 0;
    microsecondMV = 0;
    nanosecondMV = 0;
  }
  Assert(IsValidISODate(year, month, day));
  let time: ISODateTimeParseRecord['Time'];
  if (hour === undefined) {
    time = 'start-of-day';
  } else {
    time = CreateTimeRecord(hour, minute, second, millisecondMV, microsecondMV, nanosecondMV);
  }
  const timeZoneResult: Mutable<ISOStringTimeZoneParseRecord> = { Z: false, OffsetString: undefined, TimeZoneAnnotation: undefined };
  if (timeZoneIdentifier) timeZoneResult.TimeZoneAnnotation = timeZoneIdentifier.sourceText;
  if (UTCDesignator) timeZoneResult.Z = true;
  else if (UTCOffset) timeZoneResult.OffsetString = UTCOffset.sourceText;
  const yearReturn = yearAbsent ? undefined : year;
  return {
    Year: yearReturn,
    Month: month,
    Day: day,
    Time: time,
    TimeZone: timeZoneResult,
    Calendar: calendar,
  };
}

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporalcalendarstring */
export function ParseTemporalCalendarString(isoString: string): PlainCompletion<string> {
  const parseResult = ParseISODateTime(isoString, ['TemporalDateTimeString[+Zoned]', 'TemporalDateTimeString[~Zoned]', 'TemporalInstantString', 'TemporalTimeString', 'TemporalMonthDayString', 'TemporalYearMonthString']);
  if (parseResult instanceof NormalCompletion) {
    const calendar = parseResult.Value.Calendar;
    if (calendar === undefined) return 'iso8601';
    return calendar;
  }
  const parseResult2 = DateParser.parse(
    isoString,
    (parser) => parser.with({ RangeError: true }, () => parser.parseAnnotationValue()),
  );
  if (Array.isArray(parseResult2)) return ThrowCompletion(parseResult2[0]);
  return parseResult2;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaldurationstring */
export function* ParseTemporalDurationString(isoString: string): ValueEvaluator<TemporalDurationObject> {
  const duration = DateParser.parse(
    isoString,
    (parser) => parser.with({ RangeError: true }, () => parser.parseTemporalDurationString()),
  );
  if (Array.isArray(duration)) return ThrowCompletion(duration[0]);
  const {
    AsciiSign: sign, Years: years, Months: months, Weeks: weeks, Days: days, Hours: hours, Minutes: minutes, Seconds: seconds,
  } = duration;
  const sep = /[.,]/;
  const fHours = hours?.split(sep)[1];
  const fMinutes = minutes?.split(sep)[1];
  const fSeconds = seconds?.split(sep)[1];
  let yearsMV = Q(yield* ToIntegerWithTruncation(Value(years)));
  let monthsMV = Q(yield* ToIntegerWithTruncation(Value(months)));
  let weeksMV = Q(yield* ToIntegerWithTruncation(Value(weeks)));
  let daysMV = Q(yield* ToIntegerWithTruncation(Value(days)));
  let hoursMV = Q(yield* ToIntegerWithTruncation(Value(hours)));
  let minutesMV;
  if (fHours) {
    Assert(!minutes && !fMinutes && !seconds && !fSeconds);
    const fHoursDigits = fHours;
    const fHoursScale = fHoursDigits.length;
    minutesMV = (Q(yield* ToIntegerWithTruncation(Value(fHoursDigits))) / (10 ** fHoursScale)) * 60;
  } else {
    minutesMV = Q(yield* ToIntegerWithTruncation(Value(minutes)));
  }
  let secondsMV;
  if (fMinutes) {
    Assert(!seconds && !fSeconds);
    const fMinutesDigits = fMinutes;
    const fMinutesScale = fMinutesDigits.length;
    secondsMV = (Q(yield* ToIntegerWithTruncation(Value(fMinutesDigits))) / (10 ** fMinutesScale)) * 60;
  } else if (seconds) {
    secondsMV = Q(yield* ToIntegerWithTruncation(Value(seconds)));
  } else {
    secondsMV = remainder(minutesMV, 1) * 60;
  }
  let millisecondsMV;
  if (fSeconds) {
    const fSecondDigits = fSeconds;
    const fSecondsScale = fSecondDigits.length;
    millisecondsMV = (Q(yield* ToIntegerWithTruncation(Value(fSecondDigits))) / (10 ** fSecondsScale)) * 1000;
  } else {
    millisecondsMV = remainder(secondsMV, 1) * 1000;
  }
  let microsecondsMV = remainder(millisecondsMV, 1) * 1000;
  let nanosecondsMV = remainder(microsecondsMV, 1) * 1000;
  const factor = sign === '-' ? -1 : 1;
  yearsMV *= factor;
  monthsMV *= factor;
  weeksMV *= factor;
  daysMV *= factor;
  hoursMV *= factor;
  minutesMV = Math.floor(minutesMV) * factor;
  secondsMV = Math.floor(secondsMV) * factor;
  millisecondsMV = Math.floor(millisecondsMV) * factor;
  microsecondsMV = Math.floor(microsecondsMV) * factor;
  nanosecondsMV = Math.floor(nanosecondsMV) * factor;
  return Q(yield* CreateTemporalDuration(yearsMV, monthsMV, weeksMV, daysMV, hoursMV, minutesMV, secondsMV, millisecondsMV, microsecondsMV, nanosecondsMV));
}

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaltimezonestring */
export function ParseTemporalTimeZoneString(timeZoneString: string): PlainCompletion<TimeZoneIdentifierParseRecord> {
  const parseResult = DateParser.parse(
    timeZoneString,
    (parser) => parser.with({ RangeError: true }, () => parser.parseTimeZoneIdentifier()),
  );
  if (!Array.isArray(parseResult)) {
    return X(ParseTimeZoneIdentifier(timeZoneString));
  }
  const result = Q(ParseISODateTime(timeZoneString, ['TemporalDateTimeString[+Zoned]', 'TemporalDateTimeString[~Zoned]', 'TemporalInstantString', 'TemporalTimeString', 'TemporalMonthDayString', 'TemporalYearMonthString']));
  const timeZoneResult = result.TimeZone;
  if (timeZoneResult.TimeZoneAnnotation !== undefined) {
    return X(ParseTimeZoneIdentifier(timeZoneResult.TimeZoneAnnotation));
  }
  if (timeZoneResult.Z) return X(ParseTimeZoneIdentifier('UTC'));
  if (timeZoneResult.OffsetString !== undefined) {
    return Q(ParseTimeZoneIdentifier(timeZoneResult.OffsetString));
  }
  return ThrowCompletion(parseResult[0]);
}

/** https://tc39.es/proposal-temporal/#sec-temporal-time-zone-identifier-parse-records */
export interface TimeZoneIdentifierParseRecord {
  Name: string | undefined;
  OffsetMinutes: number | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-parsemonthcode */
export function* ParseMonthCode(argument: Value | string): PlainEvaluator<{ MonthNumber: number; IsLeapMonth: boolean }> {
  const monthCode = typeof argument === 'string' ? Value(argument) : Q(yield* ToPrimitive(argument, 'string'));
  if (!(monthCode instanceof JSStringValue)) {
    return Throw.TypeError('monthCode ($1) is not a string', typeof argument === 'string' ? Value(argument) : argument);
  }

  // If ParseText(StringToCodePoints(monthCode), MonthCode) is a List of errors, throw a RangeError exception.

  //  MonthCode :::
  //    M00L
  //    M0 NonZeroDigit L?
  //    M NonZeroDigit DecimalDigit L?

  if (!monthCode.stringValue().match(/^(M00L|M0[1-9]L?|M[1-9][0-9]L?)$/)) {
    return Throw.RangeError('$1 is not a valid month code', monthCode);
  }

  let isLeapMonth = false;
  if (monthCode.stringValue().length === 4) {
    // Assert: The fourth code unit of monthCode is 0x004C (LATIN CAPITAL LETTER L).
    Assert(monthCode.stringValue().charCodeAt(3) === 0x004C);
    isLeapMonth = true;
  }
  const monthCodeDigits = monthCode.stringValue().substring(1, 3);
  const monthNumber = parseInt(monthCodeDigits, 10);
  if (monthNumber === 0 && !isLeapMonth) {
    return Throw.RangeError('$1 is not a valid month code', monthCode);
  }
  return { MonthNumber: monthNumber, IsLeapMonth: isLeapMonth };
}

/** https://tc39.es/proposal-temporal/#sec-parsedatetimeutcoffset */
export function ParseDateTimeUTCOffset(offsetString: string): PlainCompletion<number> {
  const parseResult = DateParser.parse(
    offsetString,
    (parser) => parser.with({ SubMinutePrecision: true, RangeError: true }, () => parser.parseUTCOffset()),
  );
  if (Array.isArray(parseResult)) return ThrowCompletion(parseResult[0]);
  Assert(!!parseResult.Sign);
  const sign = parseResult.Sign === '-' ? -1 : 1;
  Assert(parseResult.Hour !== undefined);
  const hours = StringToNumber(parseResult.Hour);
  const minutes = parseResult.Minute ? StringToNumber(parseResult.Minute) : 0;
  const seconds = parseResult.Second ? StringToNumber(parseResult.Second) : 0;
  let nanoseconds;
  if (!parseResult.TemporalDecimalFraction) {
    nanoseconds = 0;
  } else {
    const fraction = `${parseResult.TemporalDecimalFraction.digits}000000000`;
    const nanosecondsString = fraction.substring(1, 10);
    nanoseconds = StringToNumber(nanosecondsString);
  }
  return sign * (((hours * 60 + minutes) * 60 + seconds) * 1e9 + nanoseconds);
}

// https://tc39.es/proposal-temporal/#sec-temporal-parsetimezoneidentifier
export function ParseTimeZoneIdentifier(identifier: string): PlainCompletion<TimeZoneIdentifierParseRecord> {
  const parseResult = DateParser.parse(
    identifier,
    (parser) => parser.with({ RangeError: true }, () => parser.parseTimeZoneIdentifier()),
  );
  if (Array.isArray(parseResult)) return ThrowCompletion(parseResult[0]);
  if (parseResult.TimeZoneIANAName) {
    const name = parseResult.TimeZoneIANAName;
    return { Name: name, OffsetMinutes: undefined };
  }
  Assert(!!parseResult.UTCOffset);
  // 5. Let offset be the source text matched by the UTCOffset[~SubMinutePrecision] Parse Node contained within parseResult.
  // the whole string is UTCOffset
  const offset = identifier;
  const offsetNanoseconds = X(ParseDateTimeUTCOffset(offset));
  const offsetMinutes = offsetNanoseconds / 60e9;
  return { Name: undefined, OffsetMinutes: offsetMinutes };
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace RFC9557ParseNode {
  export type Hour = string;
  export type MinuteSecond = string;
  export interface Annotation {
    readonly CriticalFlag: boolean;
    readonly AnnotationKey: string;
    readonly AnnotationValue: string;
  }

  export interface UTCOffset {
    readonly Sign: '+' | '-';
    readonly Hour: string;
    readonly Minute?: string;
    readonly Second?: string;
    readonly TemporalDecimalFraction?: { readonly separator: '.' | ','; readonly digits: string };
    readonly Extended?: boolean;
    readonly sourceText: string;
  }

  export interface TimeZoneIdentifier {
    readonly UTCOffset?: UTCOffset;
    readonly TimeZoneIANAName?: string;
    readonly sourceText: string;
  }

  export interface TimeZoneAnnotation {
    readonly CriticalFlag: boolean;
    readonly TimeZoneIdentifier: TimeZoneIdentifier;
  }

  export interface DateSpecYearMonth {
    readonly Year: number;
    readonly Month: number;
  }

  export interface DateSpecMonthDay {
    readonly Month: number;
    readonly Day: number;
  }

  export interface DateSpec {
    readonly Year: number;
    readonly Month: number;
    readonly Day: number;
  }

  export interface AmbiguousTemporalTimeString {
    readonly DateSpecMonthDay?: DateSpecMonthDay;
    readonly DateSpecYearMonth?: DateSpecYearMonth;
    readonly TimeZoneAnnotation?: TimeZoneAnnotation;
    readonly Annotations?: readonly Annotation[];
  }

  export interface DateTimeUTCOffset {
    readonly UTCDesignator?: 'Z' | 'z';
    readonly UTCOffset?: UTCOffset;
  }

  export interface TemporalDecimalFraction {
    readonly separator: '.' | ',';
    readonly digits: string;
  }

  export interface TimeSpec {
    readonly Hour: Hour;
    readonly Minute?: MinuteSecond;
    readonly Second?: MinuteSecond;
    readonly TemporalDecimalFraction?: TemporalDecimalFraction;
  }

  export interface DateTime {
    readonly Date: DateSpec;
    readonly DateTimeSeparator?: ' ' | 'T' | 't';
    readonly Time?: TimeSpec;
    readonly DateTimeUTCOffset?: DateTimeUTCOffset;
  }

  export interface AnnotatedDateTime {
    readonly DateTime: DateTime;
    readonly TimeZoneAnnotation?: TimeZoneAnnotation;
    readonly Annotations?: readonly Annotation[];
  }

  export interface TemporalMonthDayString {
    readonly AnnotatedMonthDay?: AnnotatedMonthDay;
    readonly AnnotatedDateTime?: AnnotatedDateTime;
  }

  export interface AnnotatedMonthDay {
    readonly DateSpecMonthDay: DateSpecMonthDay;
    readonly TimeZoneAnnotation?: TimeZoneAnnotation;
    readonly Annotations?: readonly Annotation[];
  }

  export interface AnnotatedTime {
    readonly TimeDesignator?: 'T' | 't';
    readonly Time: TimeSpec;
    readonly DateTimeUTCOffset?: DateTimeUTCOffset;
    readonly TimeZoneAnnotation?: TimeZoneAnnotation;
    readonly Annotations?: readonly Annotation[];
  }

  export interface TemporalTimeString {
    readonly AnnotatedDateTime?: AnnotatedDateTime;
    readonly AnnotatedTime?: AnnotatedTime;
  }

  export interface TemporalYearMonthString {
    readonly AnnotatedYearMonth?: AnnotatedYearMonth;
    readonly AnnotatedDateTime?: AnnotatedDateTime;
  }

  export interface AnnotatedYearMonth {
    readonly DateSpecYearMonth: DateSpecYearMonth;
    readonly TimeZoneAnnotation?: TimeZoneAnnotation;
    readonly Annotations?: readonly Annotation[];
  }

  export interface TemporalInstantString {
    readonly Date: DateSpec;
    readonly DateTimeSeparator: ' ' | 'T' | 't';
    readonly Time: TimeSpec;
    readonly DateTimeUTCOffset: DateTimeUTCOffset;
    readonly TimeZoneAnnotation?: TimeZoneAnnotation;
    readonly Annotations?: readonly Annotation[];
  }

  export interface Duration {
    readonly AsciiSign?: '+' | '-';
    readonly Years?: string;
    readonly Months?: string;
    readonly Weeks?: string;
    readonly Days?: string;

    readonly Hours?: string;
    readonly Minutes?: string;
    readonly Seconds?: string;
  }
}

export class DateParser {
  static parse<T>(
    source: string,
    f: (parser: DateParser) => T,
  ): T | ObjectValue[] {
    const parser = new DateParser(source);
    try {
      const parse = f(parser);
      if (parser.peek()) {
        return [Throw.SyntaxError('Date parser found more content after parsing finished when parsing $1', source).Value as ObjectValue];
      }
      return parse;
    } catch (error) {
      Assert(error instanceof ThrowCompletion && error.Value instanceof ObjectValue);
      return [error.Value];
    }
  }

  public input: string;

  public pos = 0;

  constructor(input: string) {
    this.input = input;
  }

  private grammarParameters = {
    Extended: false as boolean,
    SubMinutePrecision: false as boolean,
    Z: false as boolean,
    TimeRequired: false as boolean,
    Zoned: false as boolean,
    Sep: false as boolean,
    // Throw RangeError over SyntaxError
    RangeError: false as boolean,
  } as const;

  private raise: Throw = (message: string, ...args: Formattable[]) => {
    throw Reflect.apply(Throw[this.grammarParameters.RangeError ? 'RangeError' : 'SyntaxError'], null, [message, ...args]);
  };

  peek(length = 1): string | undefined {
    return this.input.slice(this.pos, this.pos + length);
  }

  private lookahead(text: string): boolean {
    return this.input.slice(this.pos, this.pos + text.length) === text;
  }

  private lookaheads(...str: string[]): boolean {
    return str.some((text) => this.input.slice(this.pos, this.pos + text.length) === text);
  }

  private eat<T extends string>(...str: T[]): T | undefined {
    for (const text of str) {
      if (this.lookahead(text)) {
        this.pos += text.length;
        return text;
      }
    }
    return undefined;
  }

  private eatRegExp(regExp: RegExp): undefined | string {
    const match = regExp.exec(this.input.slice(this.pos));
    if (!match || match.index !== 0) {
      return undefined;
    }
    this.pos += match[0].length;
    return match[0];
  }

  //  DateSeparator[Extended] :::
  //    [+Extended] -
  //    [~Extended] [empty]
  //  in case of +Extended ~Extended, this is equal to "-"?
  private parseDateSeparator(Extended: boolean) {
    if (Extended) {
      this.expect('-', 'Expected date separator');
      return '-';
    }
    return undefined;
  }

  private parseDateSeparatorExtendedOrNot() {
    return this.eat('-');
  }

  //  DateYear :::\d{4} or [+-]\d{6}
  private parseDateYear(): number {
    const year = this.eatRegExp(/\d{4}|[+-]\d{6}/);
    if (!year) {
      throw this.raise('Expected DateYear');
    }
    if (year === '-000000') {
      throw this.raise('-000000 is not a valid year');
    }
    return Number.parseInt(year, 10);
  }

  //  DateMonth ::: 01 to 12
  private parseDateMonth(): number {
    const month = this.eatRegExp(/0[1-9]|1[0-2]/);
    if (!month) {
      throw this.raise('Invalid DateMonth');
    }
    return Number.parseInt(month, 10);
  }

  //  DateDay ::: 01 to 31
  private parseDateDay(): number {
    const day = this.eatRegExp(/0[1-9]|[12][0-9]|3[01]/);
    if (!day) {
      throw this.raise('Invalid DateDay');
    }
    return Number.parseInt(day, 10);
  }

  //  Date :::
  //    DateSpec[+Extended]
  //    DateSpec[~Extended]
  //
  //  DateSpec[Extended] ::: DateYear DateSeparator[?Extended] DateMonth DateSeparator[?Extended] DateDay
  //
  //  combines to
  //
  //  DateSpec[Extended] :::
  //      DateYear DateSeparator[+Extended] DateMonth DateSeparator[+Extended] DateDay
  //      DateYear DateSeparator[~Extended] DateMonth DateSeparator[~Extended] DateDay
  private parseDate(): RFC9557ParseNode.DateSpec {
    const Year = this.parseDateYear();
    const Extended = this.parseDateSeparatorExtendedOrNot();
    const Month = this.parseDateMonth();
    this.parseDateSeparator(!!Extended);
    const Day = this.parseDateDay();
    return { Year, Month, Day };
  }

  with<T>(parameters: Partial<DateParser['grammarParameters']>, f: () => T): T {
    const oldParameters = this.grammarParameters;
    this.grammarParameters = { ...this.grammarParameters, ...parameters };
    try {
      return f();
    } finally {
      this.grammarParameters = oldParameters;
    }
  }

  // DateTimeSeparator ::: <SP> T t
  private parseDateTimeSeparator(): ' ' | 'T' | 't' {
    return this.parse(/[ Tt]/, 'Expected DateTimeSeparator') as ' ' | 'T' | 't';
  }

  // TimeSecond ::: 00 to 60
  private parseTimeSecond(): string {
    return this.parse(/0[0-9]|[1-5][0-9]|60/, 'Invalid second');
  }

  //  TimeSeparator :::
  //    [+Extended] :
  //    [~Extended] [empty]
  //  in case of +Extended ~Extended, this is equal to ":"?
  private parseTimeSeparator(Extended: boolean) {
    if (Extended) {
      this.expect(':', 'Expected time separator');
    }
  }

  private parseTimeSeparatorExtendedOrNot() {
    return this.eat(':');
  }

  //  Time :::
  //    TimeSpec[+Extended]
  //    TimeSpec[~Extended]
  //
  //  TimeSpec[Extended] :::
  //    Hour
  //    Hour TimeSeparator[?Extended] MinuteSecond
  //    Hour TimeSeparator[?Extended] MinuteSecond TimeSeparator[?Extended] TimeSecond TemporalDecimalFraction?
  //
  //  expanded to
  //
  //  TimeSpec :::
  //    Hour
  //    Hour TimeSeparator[+Extended] MinuteSecond
  //    Hour TimeSeparator[+Extended] MinuteSecond TimeSeparator[+Extended] TimeSecond TemporalDecimalFraction?
  //    Hour TimeSeparator[~Extended] MinuteSecond
  //    Hour TimeSeparator[~Extended] MinuteSecond TimeSeparator[~Extended] TimeSecond TemporalDecimalFraction?
  private parseTime(): RFC9557ParseNode.TimeSpec {
    const canContinue = (regExp: RegExp) => {
      const next = this.peek();
      return next && regExp.test(next);
    };

    const Hour = this.parseHour();
    if (!canContinue(/[:0-5]/)) return { Hour };
    const Extended = this.parseTimeSeparatorExtendedOrNot();
    const Minute = this.parseMinuteSecond();

    if (!canContinue(Extended ? /[:0-6]/ : /[0-6]/)) return { Hour, Minute };
    this.parseTimeSeparator(!!Extended);
    const Second = this.parseTimeSecond();
    const TemporalDecimalFraction = this.tryParseTemporalDecimalFraction();
    return {
      Hour, Minute, Second, TemporalDecimalFraction,
    };
  }

  //  DateTimeUTCOffset[Z] :::
  //    [+Z] UTCDesignator
  //    UTCOffset[+SubMinutePrecision]
  private parseDateTimeUTCOffset(): RFC9557ParseNode.DateTimeUTCOffset {
    if (this.grammarParameters.Z) {
      const char = this.peek();
      if (char === 'Z' || char === 'z') return { UTCDesignator: char };
    }
    return { UTCOffset: this.with({ SubMinutePrecision: true }, () => this.parseUTCOffset()) };
  }

  //  DateTime[Z, TimeRequired] :::
  //    [~TimeRequired] Date
  //                    Date DateTimeSeparator Time DateTimeUTCOffset[?Z]?
  private parseDateTime(): RFC9557ParseNode.DateTime {
    const Date = this.parseDate();
    if (!this.grammarParameters.TimeRequired) {
      if (!this.lookaheads(' ', 't', 'T')) {
        return { Date };
      }
    }
    const DateTimeSeparator = this.parseDateTimeSeparator();
    const Time = this.parseTime();
    if (!this.lookaheads('z', 'Z', '+', '-')) {
      return { Date, DateTimeSeparator, Time };
    }
    const DateTimeUTCOffset = this.with({ Z: true }, () => this.parseDateTimeUTCOffset()) ?? undefined;
    return {
      Date, DateTimeSeparator, Time, DateTimeUTCOffset,
    };
  }

  //  AnnotatedDateTime[Zoned, TimeRequired] :::
  //    [~Zoned] DateTime[~Z, ?TimeRequired] TimeZoneAnnotation? Annotations?
  //    [+Zoned] DateTime[+Z, ?TimeRequired] TimeZoneAnnotation Annotations?
  private parseAnnotatedDateTime(): RFC9557ParseNode.AnnotatedDateTime {
    const DateTime = this.parseDateTime();
    const TimeZoneAnnotation = this.grammarParameters.Zoned ? this.parseTimeZoneAnnotation() : this.try(() => this.parseTimeZoneAnnotation());
    if (!this.lookahead('[')) {
      return { DateTime, TimeZoneAnnotation };
    }
    const Annotations = this.parseAnnotations();
    return {
      DateTime,
      TimeZoneAnnotation,
      Annotations,
    };
  }

  //  AnnotatedTime :::
  //    TimeDesignator Time DateTimeUTCOffset[~Z]? TimeZoneAnnotation? Annotations?
  //                   Time DateTimeUTCOffset[~Z]? TimeZoneAnnotation? Annotations?
  private parseAnnotatedTime(): RFC9557ParseNode.AnnotatedTime {
    const TimeDesignator = this.eat('T', 't');

    const Time = this.parseTime();
    const result: Mutable<RFC9557ParseNode.AnnotatedTime> = { TimeDesignator, Time };
    if (this.lookaheads('+', '-')) {
      result.DateTimeUTCOffset = this.with({ Z: false }, () => this.parseDateTimeUTCOffset());
    }
    if (this.lookahead('[')) {
      result.TimeZoneAnnotation = this.try(() => this.parseTimeZoneAnnotation());
    }
    if (this.lookahead('[')) {
      result.Annotations = this.parseAnnotations();
    }
    return result;
  }

  expect(char: string, message?: string): void {
    if (this.input[this.pos] !== char) {
      throw new Error(message || `Expected '${char}' at position ${this.pos}`);
    }
    this.pos += 1;
  }

  expects(char: string[], message?: string): void {
    for (const c of char) {
      if (this.input[this.pos] === c) {
        this.pos += 1;
        return;
      }
    }
    throw new Error(message || `Expected one of '${char.join(', ')}' at position ${this.pos}`);
  }

  private parse(regExp: RegExp, message: string): string {
    const match = regExp.exec(this.input.slice(this.pos));
    if (!match || match.index !== 0) {
      throw new Error(message);
    }
    this.pos += match[0].length;
    return match[0];
  }

  try<T>(f: () => T, consumeAll = false): T | undefined {
    const startPos = this.pos;
    const oldParameter = this.grammarParameters;
    try {
      const result = f();
      if (consumeAll && this.peek()) {
        throw new SyntaxError('More content than expected');
      }
      return result;
    } catch {
      this.pos = startPos;
      return undefined;
    } finally {
      this.grammarParameters = oldParameter;
    }
  }

  // #region Top Goals (used as a parameter of ParseText)
  // AmbiguousTemporalTimeString :::
  //   DateSpecMonthDay TimeZoneAnnotation? Annotations?
  //   DateSpecYearMonth TimeZoneAnnotation? Annotations?
  parseAmbiguousTemporalTimeString(): RFC9557ParseNode.AmbiguousTemporalTimeString {
    const DateSpecMonthDay = this.try(() => this.parseDateSpecMonthDay());
    const DateSpecYearMonth = DateSpecMonthDay ? undefined : this.parseDateSpecYearMonth();
    const TimeZoneAnnotation = this.lookahead('[') ? this.try(() => this.parseTimeZoneAnnotation()) : undefined;
    const Annotations = this.lookahead('[') ? this.parseAnnotations() : undefined;
    return {
      DateSpecMonthDay, DateSpecYearMonth, TimeZoneAnnotation, Annotations,
    };
  }

  //  AnnotationValue ::: one or more [a-zA-Z0-9]+ connected with "-"
  parseAnnotationValue(): string {
    const parseComponent = () => {
      const value = this.eatRegExp(/[a-zA-Z0-9]+/);
      if (!value) {
        throw this.raise('Expected AnnotationValueComponent');
      }
      return value;
    };

    let value = parseComponent();
    while (this.eat('-')) {
      value += `-${parseComponent()}`;
    }
    return value;
  }

  // TemporalDurationString
  //    ASCIISign? DurationDesignator DurationDate
  //    ASCIISign? DurationDesignator DurationTime
  parseTemporalDurationString(): RFC9557ParseNode.Duration {
    const durationRegExp = /(?<AsciiSign>[+-])?P(?<Year>\d+Y)?(?<Month>\d+M)?(?<Week>\d+W)?(?<Day>\d+D)?(?<HasTimePart>T(?<Hour>\d+(?<HourDot>[.,]\d{1,9})?H)?(?<Minute>\d+(?<MinuteDot>[.,]\d{1,9})?M)?(?<Second>\d+([.,]\d{1,9})?S)?)?/i;
    const match = this.eatRegExp(durationRegExp);
    if (!match) {
      throw this.raise('Invalid TemporalDurationString');
    }
    const {
      AsciiSign, Year, Month, Week, Day, HasTimePart, Hour, Minute, Second, HourDot, MinuteDot,
    } = (durationRegExp.exec(match) as RegExpExecArray).groups!;
    if (HasTimePart && !Hour && !Minute && !Second) {
      throw this.raise('Invalid TemporalDurationString: Time part is present but empty');
    }
    if ((Minute || Second) && HourDot) throw this.raise('Invalid TemporalDurationString: Hour has decimal part but Minute or Second is present');
    if (Second && MinuteDot) throw this.raise('Invalid TemporalDurationString: Minute has decimal part but Second is present');
    return {
      AsciiSign: AsciiSign as '+' | '-' | undefined,
      Years: Year ? Year.slice(0, -1) : undefined,
      Months: Month ? Month.slice(0, -1) : undefined,
      Weeks: Week ? Week.slice(0, -1) : undefined,
      Days: Day ? Day.slice(0, -1) : undefined,
      Hours: Hour ? Hour.slice(0, -1) : undefined,
      Minutes: Minute ? Minute.slice(0, -1) : undefined,
      Seconds: Second ? Second.slice(0, -1) : undefined,
    };
  }

  // TemporalDateTimeString :::
  //    AnnotatedDateTime[?Zoned, ~TimeRequired]
  parseTemporalDateTimeString(): RFC9557ParseNode.AnnotatedDateTime {
    return this.with({ TimeRequired: false }, () => this.parseAnnotatedDateTime());
  }

  // TemporalInstantString :::
  //    Date DateTimeSeparator Time DateTimeUTCOffset[+Z] TimeZoneAnnotation? Annotations?
  parseTemporalInstantString(): RFC9557ParseNode.TemporalInstantString {
    const Date = this.parseDate();
    const DateTimeSeparator = this.parseDateTimeSeparator();
    const Time = this.parseTime();
    const DateTimeUTCOffset = this.with({ Z: true }, () => this.parseDateTimeUTCOffset());
    const TimeZoneAnnotation = this.lookahead('[') ? this.try(() => this.parseTimeZoneAnnotation()) : undefined;
    const Annotations = this.lookahead('[') ? this.try(() => this.parseAnnotations()) : undefined;
    return {
      Date,
      DateTimeSeparator,
      Time,
      DateTimeUTCOffset,
      TimeZoneAnnotation,
      Annotations,
    };
  }

  // TemporalYearMonthString :::
  //    AnnotatedYearMonth
  //    AnnotatedDateTime[~Zoned, ~TimeRequired]
  parseTemporalYearMonthString(): RFC9557ParseNode.TemporalYearMonthString {
    const AnnotatedYearMonth = this.try(() => this.parseAnnotatedYearMonth());
    if (AnnotatedYearMonth) return { AnnotatedYearMonth };
    const AnnotatedDateTime = this.with({ Zoned: false, TimeRequired: false }, () => this.parseAnnotatedDateTime());
    return { AnnotatedDateTime };
  }

  //  AnnotatedYearMonth :::
  //    DateSpecYearMonth TimeZoneAnnotation? Annotations?
  parseAnnotatedYearMonth(): RFC9557ParseNode.AnnotatedYearMonth {
    const DateSpecYearMonth = this.parseDateSpecYearMonth();
    const TimeZoneAnnotation = this.lookahead('[') ? this.parseTimeZoneAnnotation() : undefined;
    const Annotations = this.lookahead('[') ? this.parseAnnotations() : undefined;
    return { DateSpecYearMonth, TimeZoneAnnotation, Annotations };
  }

  //  TemporalMonthDayString :::
  //    AnnotatedMonthDay
  //    AnnotatedDateTime[~Zoned, ~TimeRequired]
  parseTemporalMonthDayString(): RFC9557ParseNode.TemporalMonthDayString {
    const AnnotatedMonthDay = this.try(() => this.parseAnnotatedMonthDay());
    if (AnnotatedMonthDay) return { AnnotatedMonthDay };
    const AnnotatedDateTime = this.with({ Zoned: false, TimeRequired: false }, () => this.parseAnnotatedDateTime());
    return { AnnotatedDateTime };
  }

  //  AnnotatedMonthDay :::
  //    DateSpecMonthDay TimeZoneAnnotation? Annotations?
  parseAnnotatedMonthDay(): RFC9557ParseNode.AnnotatedMonthDay {
    const DateSpecMonthDay = this.parseDateSpecMonthDay();
    const TimeZoneAnnotation = this.lookahead('[') ? this.parseTimeZoneAnnotation() : undefined;
    const Annotations = this.lookahead('[') ? this.parseAnnotations() : undefined;
    return { DateSpecMonthDay, TimeZoneAnnotation, Annotations };
  }

  // TemporalTimeString :::
  //   AnnotatedTime
  //   AnnotatedDateTime[~Zoned, +TimeRequired]
  parseTemporalTimeString(): RFC9557ParseNode.TemporalTimeString {
    const AnnotatedTime = this.try(() => this.parseAnnotatedTime(), true);
    if (AnnotatedTime) return { AnnotatedTime };
    const AnnotatedDateTime = this.with({ Zoned: false, TimeRequired: true }, () => this.parseAnnotatedDateTime());
    return { AnnotatedDateTime };
  }

  // TimeZoneIdentifier :::
  //   UTCOffset[~SubMinutePrecision]
  //   TimeZoneIANAName
  parseTimeZoneIdentifier(): RFC9557ParseNode.TimeZoneIdentifier {
    const pos = this.pos;
    if (this.lookaheads('+', '-')) {
      const UTCOffset = this.with({ SubMinutePrecision: false }, () => this.parseUTCOffset());
      return { UTCOffset, sourceText: this.input.slice(pos, this.pos) };
    }
    const TimeZoneIANAName = this.parseTimeZoneIANAName();
    return { TimeZoneIANAName, sourceText: this.input.slice(pos, this.pos) };
  }

  // UTCOffset[SubMinutePrecision] :::
  //                         ASCIISign Hour
  //                         ASCIISign Hour TimeSeparator[+Extended] MinuteSecond
  //                         ASCIISign Hour TimeSeparator[~Extended] MinuteSecond
  //   [+SubMinutePrecision] ASCIISign Hour TimeSeparator[+Extended] MinuteSecond TimeSeparator[+Extended] MinuteSecond TemporalDecimalFraction?
  //   [+SubMinutePrecision] ASCIISign Hour TimeSeparator[~Extended] MinuteSecond TimeSeparator[~Extended] MinuteSecond TemporalDecimalFraction?
  parseUTCOffset(): RFC9557ParseNode.UTCOffset {
    const pos = this.pos;
    const Sign = this.parseAsciiSign();
    const Hour = this.parseHour();
    if (!/[0-6:]/.test(this.peek() || '')) {
      return { Sign, Hour, sourceText: this.input.slice(pos, this.pos) };
    }
    const Extended = !!this.parseTimeSeparatorExtendedOrNot();
    const Minute = this.parseMinuteSecond();
    if (!this.grammarParameters.SubMinutePrecision || !/[0-6:]/.test(this.peek() || '')) {
      return {
        Sign, Hour, Minute, sourceText: this.input.slice(pos, this.pos),
      };
    }
    this.parseTimeSeparator(Extended);
    const Second = this.parseMinuteSecond();
    const TemporalDecimalFraction = this.tryParseTemporalDecimalFraction();
    return {
      Sign, Hour, Minute, Second, TemporalDecimalFraction, sourceText: this.input.slice(pos, this.pos),
    };
  }
  // #endregion

  // #region Sub goals
  //  ASCIISign ::: one of + -
  parseAsciiSign(): '+' | '-' {
    return this.parse(/[+-]/, 'Expected ASCIISign') as '+' | '-';
  }

  // TimeZoneIANAName ::: TimeZoneIANANameComponent separated by "/"
  // TimeZoneIANANameComponent ::: [._a-zA-Z] followed by zero or more [._a-zA-Z\d\-+]
  parseTimeZoneIANAName(): string {
    const parseComponent = (): string => {
      const name = this.parse(/[._a-zA-Z][._a-zA-Z\d\-+]*/, 'Expected TimeZoneIANANameComponent');
      return name;
    };

    let name = parseComponent();
    while (this.eat('/')) {
      name += `/${parseComponent()}`;
    }
    return name;
  }

  //  Hour :: number 00 to 23
  parseHour(): string {
    return this.parse(/([01]\d)|(2[0123])/, 'Invalid hour');
  }

  //  MinuteSecond :: number 00 to 59
  parseMinuteSecond(): string {
    return this.parse(/[0-5]\d/, 'Invalid minute or second');
  }

  //  TemporalDecimalFraction ::: [.,][0-9]{1,9}
  tryParseTemporalDecimalFraction(): RFC9557ParseNode.TemporalDecimalFraction | undefined {
    const separator = this.peek();
    if (separator !== '.' && separator !== ',') {
      return undefined;
    }
    this.pos += 1;
    const digits = this.parse(/[0-9]{1,9}/, 'Expected 1 to 9 decimal digits in TemporalDecimalFraction');
    return {
      separator,
      digits,
    };
  }

  //  DateSpecMonthDay ::: --? DateMonth DateSeparator[+Extended][~Extended] DateDay
  parseDateSpecMonthDay(): RFC9557ParseNode.DateSpecMonthDay {
    this.eat('--');
    const Month = this.parseDateMonth();
    this.parseDateSeparatorExtendedOrNot();
    const Day = this.parseDateDay();
    return { Month, Day };
  }

  // DateSpecYearMonth ::: DateYear DateSeparator[+Extended][~Extended] DateMonth
  parseDateSpecYearMonth(): RFC9557ParseNode.DateSpecYearMonth {
    const Year = this.parseDateYear();
    this.parseDateSeparatorExtendedOrNot();
    const Month = this.parseDateMonth();
    return { Year, Month };
  }

  //  TimeZoneAnnotation ::: [ AnnotationCriticalFlag? TimeZoneIdentifier ]
  //  AnnotationCriticalFlag ::: !
  parseTimeZoneAnnotation(): RFC9557ParseNode.TimeZoneAnnotation {
    this.expect('[');
    const CriticalFlag = !!this.eat('!');
    const TimeZoneIdentifier = this.parseTimeZoneIdentifier();
    this.expect(']');
    return {
      CriticalFlag,
      TimeZoneIdentifier,
    };
  }

  //  Annotations ::: Annotation Annotations?
  //  Annotation :::
  //    [ AnnotationCriticalFlag? AnnotationKey = AnnotationValue ]
  //  AnnotationCriticalFlag ::: !

  parseAnnotations(): Array<RFC9557ParseNode.Annotation> {
    const annotations: Array<RFC9557ParseNode.Annotation> = [];

    while (this.lookahead('[')) {
      this.expect('[');
      const CriticalFlag = !!this.eat('!');
      const AnnotationKey = this.parseAnnotationKey();
      this.expect('=');
      const AnnotationValue = this.parseAnnotationValue();
      this.expect(']');
      annotations.push({ CriticalFlag, AnnotationKey, AnnotationValue });
    }

    if (annotations.length === 0) {
      throw this.raise('Expected at least one Annotation');
    }
    return annotations;
  }

  //  AnnotationKey ::: [a-z_][a-z_0-9-]*
  parseAnnotationKey(): string {
    return this.parse(/[a-z_][a-z_0-9-]*/, 'Expected AnnotationKey');
  }
  // #endregion
}
