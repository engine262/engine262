import { NormalCompletion } from '../completion.mjs';

export function Evaluate_EmptyStatement(/* EmptyStatement */) {
  return new NormalCompletion(undefined);
}
