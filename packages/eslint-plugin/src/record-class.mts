import type { Rule } from 'eslint';
import {
  analyzeRecordClasses,
  type RecordClassDiagnosticKind,
} from '@engine262/babel-compiler';
import { getParserServices } from './utils.mjs';

const messages = {
  classDecorator: 'Record classes may only use the @callable and @record class decorators.',
  elementDecorator: 'Record class fields and methods may not have decorators.',
  staticBlock: 'Record classes may not have class static blocks.',
  fieldInitializer: 'Record class fields may not have initializers.',
  constructor: 'Record classes require constructor containing only the final-class guard and field copies.',
  constructorGuard: 'Record class constructors must guard new.target against the class name.',
  fieldCopy: 'Record class constructor must copy every field with this.X = o.X and perform no other work.',
  visibility: 'Record class fields may not be private or protected.',
  privateName: 'Record classes may not use JavaScript private names.',
  extends: 'Record classes may not extend another class.',
} as const satisfies Record<RecordClassDiagnosticKind, string>;

const rule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    messages,
  },
  create(context) {
    const services = getParserServices(context, 'record-class');
    const analysis = analyzeRecordClasses(context.physicalFilename, services.program);

    return {
      Program() {
        for (const diagnostic of analysis.diagnostics) {
          context.report({
            loc: {
              start: context.sourceCode.getLocFromIndex(diagnostic.start),
              end: context.sourceCode.getLocFromIndex(diagnostic.end),
            },
            messageId: diagnostic.kind,
            fix: diagnostic.fix
              ? (fixer) => fixer.insertTextAfterRange(
                  [diagnostic.fix!.start, diagnostic.fix!.end],
                  diagnostic.fix!.text,
                )
              : undefined,
          });
        }
      },
    };
  },
};

export default rule;
