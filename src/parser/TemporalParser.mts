// https://tc39.es/proposal-temporal/#sec-temporal-iso8601grammar

import type { TemporalDurationObject } from '../intrinsics/Temporal/Duration.mts';
import type { TimeRecord } from '../intrinsics/Temporal/PlainTime.mts';
import type { TimeZoneIdentifier } from '../abstract-ops/temporal/addition.mts';
import {
  Assert,
  JSStringValue,
  Q,
  surroundingAgent,
  ToPrimitive,
  Value,
  type PlainCompletion, type PlainEvaluator, type ValueCompletion,
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
export declare function ParseISODateTime(isoString: string, allowedFormats: unknown): PlainCompletion<ISODateTimeParseRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporalcalendarstring */
export declare function ParseTemporalCalendarString(isoString: string): PlainCompletion<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaldurationstring */
export declare function ParseTemporalDurationString(isoString: string): ValueCompletion<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaltimezonestring */
export declare function ParseTemporalTimeZoneString(timeZoneString: string): PlainCompletion<unknown>;

/** https://tc39.es/proposal-temporal/#sec-temporal-parsemonthcode */
export function* ParseMonthCode(argument: Value | string): PlainEvaluator<{ MonthNumber: number; IsLeapMonth: boolean }> {
  const monthCode = typeof argument === 'string' ? Value(argument) : Q(yield* ToPrimitive(argument, 'string'));
  if (!(monthCode instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', typeof argument === 'string' ? Value(argument) : argument);
  }

  // If ParseText(StringToCodePoints(monthCode), MonthCode) is a List of errors, throw a RangeError exception.

  //  MonthCode :::
  //    M00L
  //    M0 NonZeroDigit L?
  //    M NonZeroDigit DecimalDigit L?

  if (!monthCode.stringValue().match(/^(M00L|M0[1-9]L?|M[1-9][0-9]L?)$/)) {
    return surroundingAgent.Throw('RangeError', 'InvalidMonth');
  }

  let isLeapMonth = false;
  if (monthCode.stringValue().length === 4) {
    // Assert: The fourth code unit of monthCode is 0x004C (LATIN CAPITAL LETTER L).
    Assert(monthCode.stringValue().charCodeAt(4) === 0x004C);
    isLeapMonth = true;
  }
  const monthCodeDigits = monthCode.stringValue().substring(1, 3);
  const monthNumber = parseInt(monthCodeDigits, 10);
  if (monthNumber === 0 && !isLeapMonth) {
    return surroundingAgent.Throw('RangeError', 'InvalidMonth');
  }
  return { MonthNumber: monthNumber, IsLeapMonth: isLeapMonth };
}

/** https://tc39.es/proposal-temporal/#sec-parsedatetimeutcoffset */
export declare function ParseDateTimeUTCOffset(offsetString: string): number;

// https://tc39.es/proposal-temporal/#sec-temporal-parsetimezoneidentifier
export declare function ParseTimeZoneIdentifier(identifier: TimeZoneIdentifier): PlainCompletion<{ Name?: TimeZoneIdentifier; OffsetMinutes?: number }>;

class DateParser {
  public input: string;

  public pos = 0;

  constructor(input: string) {
    this.input = input;
  }

  peek() {
    return this.input[this.pos];
  }

  expect(char: string, message?: string) {
    if (this.input[this.pos] !== char) {
      throw new Error(message || `Expected '${char}' at position ${this.pos}`);
    }
    this.pos += 1;
  }

  tryParse<T>(f: () => T) {
    const startPos = this.pos;
    try {
      return f();
    } catch {
      this.pos = startPos;
      return undefined;
    }
  }

  // #region Top Goals (used as a parameter of ParseText)
  // AmbiguousTemporalTimeString :::
  //   DateSpecMonthDay TimeZoneAnnotation? Annotations?
  //   DateSpecYearMonth TimeZoneAnnotation? Annotations?
  parseAmbiguousTemporalTimeString() {
    const DateSpecMonthDay = this.tryParse(() => this.parseDateSpecMonthDay());
    const DateSpecYearMonth = DateSpecMonthDay ? undefined : this.parseDateSpecYearMonth();
    const TimeZoneAnnotation = this.tryParse(() => this.parseTimeZoneAnnotation());
    const Annotations = this.peek() && this.parseAnnotations();
    return {
      DateSpecMonthDay, DateSpecYearMonth, TimeZoneAnnotation, Annotations,
    };
  }

  // AnnotationValue
  parseAnnotationValue() { }

  // TemporalDurationString
  parseTemporalDurationString() { }

  // TemporalDateTimeString
  parseTemporalDateTimeString() { }

  // TemporalInstantString
  parseTemporalInstantString() { }

  // TemporalYearMonthString
  parseTemporalYearMonthString() { }

  // TemporalMonthDayString
  parseTemporalMonthDayString() { }

  // TemporalTimeString :::
  //   AnnotatedTime
  //   AnnotatedDateTime[~Zoned, +TimeRequired]
  parseTemporalTimeString() { }

  // TimeZoneIdentifier :::
  //   UTCOffset[~SubMinutePrecision]
  //   TimeZoneIANAName
  parseTimeZoneIdentifier() {
    const next = this.peek();
    if (next === '+' || next === '-') {
      return { UTCOffset: this.parseUTCOffset(false), TimeZoneIANAName: undefined };
    }
    return { UTCOffset: undefined, TimeZoneIANAName: this.parseTimeZoneIANAName() };
  }

  // UTCOffset[SubMinutePrecision] :::
  //   ASCIISign Hour
  //   ASCIISign Hour TimeSeparator[+Extended] MinuteSecond
  //   ASCIISign Hour TimeSeparator[~Extended] MinuteSecond
  //   [+SubMinutePrecision] ASCIISign Hour TimeSeparator[+Extended] MinuteSecond TimeSeparator[+Extended] MinuteSecond TemporalDecimalFraction?
  //   [+SubMinutePrecision] ASCIISign Hour TimeSeparator[~Extended] MinuteSecond TimeSeparator[~Extended] MinuteSecond TemporalDecimalFraction?
  parseUTCOffset(SubMinutePrecision: boolean) {
    const sign = this.parseAsciiSign();
    const hour = this.parseHour();
    const timeSeparator = this.tryParseTimeSeparator_ExtendedOrNot();
    const minuteSecond = this.parseMinuteSecond();
    if (SubMinutePrecision && this.peek()) {
      return this.tryParse(() => {
        const timeSeparator2 = this.tryParseTimeSeparator_ExtendedOrNot();
        const minuteSecond2 = this.parseMinuteSecond();
        const fraction = this.tryParseTemporalDecimalFraction();
        return {
          sign, hour, timeSeparator, minuteSecond, timeSeparator2, minuteSecond2, fraction,
        };
      });
    }
    return {
      sign, hour, timeSeparator, minuteSecond,
    };
  }
  // #endregion

  // #region Sub goals
  //  ASCIISign ::: one of + -
  parseAsciiSign(): '+' | '-' {
    const next = this.peek();
    if (next === '+' || next === '-') {
      this.pos += 1;
      return next;
    }
    throw new Error(`Expected '+' or '-' at position ${this.pos}`);
  }

  // TimeSeparator[Extended] :::
  //   [+Extended] :
  //   [~Extended] [empty]
  tryParseTimeSeparator_ExtendedOrNot(): ':' | undefined {
    if (this.peek() === ':') {
      this.pos += 1;
      return ':';
    }
    return undefined;
  }

  parseTimeZoneIANAName() { }

  parseHour() { }

  parseMinuteSecond() { }

  tryParseTemporalDecimalFraction() { }

  parseDateSpecMonthDay() { }

  parseDateSpecYearMonth() { }

  parseTimeZoneAnnotation() { }

  parseAnnotations() {}
  // #endregion
}
