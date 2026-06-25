import {
  type Evaluator, ExecutionContext, type EvaluatorNextType, OutOfRange,
  type YieldOrAwaitEvaluator,
} from '#self';


/* node:coverage enable */
export function skipDebugger<T>(iterator: Evaluator<T>, maxSteps = Infinity): T {
  let steps = 0;
  while (true) {
    const { done, value } = iterator.next({ type: 'debugger-resume', value: undefined });
    if (done) {
      return value;
    }
    /* node:coverage ignore next 4 */
    steps += 1;
    if (steps > maxSteps) {
      throw new RangeError('Max steps exceeded');
    }
  }
}

export function* resume(context: ExecutionContext, completion: EvaluatorNextType): YieldOrAwaitEvaluator {
  let result;
  while (true) {
    result = context.CodeEvaluationState!.next(completion);
    if (result.done) {
      return result.value;
    }
    const { value } = result;
    if (value.type === 'debugger' || value.type === 'potential-debugger') {
      completion = yield value;
    } else if (value.type === 'await' || value.type === 'async-generator-yield') {
      return undefined;
    } else if (value.type === 'yield') {
      return value.value;
    } else {
      throw OutOfRange.exhaustive(value);
    }
  }
}
