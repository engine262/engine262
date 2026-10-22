import {
  type PlainCompletion,
  type PlainEvaluator,
  type Value,
  type ValueCompletion,
  type ValueEvaluator,
} from '#self';

export interface NamedResult {
  readonly name: string;
}

export interface UnavailableResult {
  readonly unavailable: true;
}

export declare function valueCompletion(value: Value): ValueCompletion;
export declare function valueEvaluator(): ValueEvaluator;
export declare function stringCompletion(): PlainCompletion<string>;
export declare function stringEvaluator(): PlainEvaluator<string>;
export declare function namedCompletion(): PlainCompletion<NamedResult>;
export declare function unavailableCompletion(): PlainCompletion<UnavailableResult>;
export declare function unavailableEvaluator(): PlainEvaluator<UnavailableResult>;
