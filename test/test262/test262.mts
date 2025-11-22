/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { relative } from 'node:path';
import util, { styleText } from 'node:util';
import { cpus } from 'node:os';
import { link } from '../base.mts';
import { isCI } from '../tui.mts';

export const args = util.parseArgs({
  args: process.argv.slice(2),
  allowNegative: true,
  allowPositionals: true,
  strict: true,
  options: {
    'help': { type: 'boolean', short: 'h' },
    'features': { type: 'string' },

    'update-slow': { type: 'string' },
    'update-failed': { type: 'boolean', short: 'u' },

    'run-slow': { type: 'boolean' },
    'failed-only': { type: 'boolean', short: 'f' },
    'strict-only': { type: 'boolean' },
    'fast': { type: 'boolean', short: 'q', default: !!isCI },

    'verbose': { type: 'boolean', short: 'v' },
    'vv': { type: 'boolean', short: 'V' },
  },
});

async function main() {
  if (args.values.help) {
    const TEST_PATTERN = styleText('gray', '[TEST-PATTERN]');
    const SLOW_LIST = link('the slow list file', new URL('./slow', import.meta.url));
    const LAST_FAILED_LIST = link('last-failed-list', new URL('./last-failed-list', import.meta.url));
    const LOCAL_FILE = styleText('gray', '(Local file)');
    const usage = `
      Usage: node ${relative(process.cwd(), import.meta.filename)} ${TEST_PATTERN} ...
      Run ${link('test262 tests', 'https://github.com/tc39/test262')} against engine262.

      ${TEST_PATTERN} supports glob syntax, and is interpreted relative to
      ${link('the test262 "test" subdirectory', new URL('./test262/test262/test/', import.meta.url))} or (if that fails for any pattern)
      relative to the working directory. If no patterns are specified,
      all tests are run.

      ${styleText('magentaBright', 'Environment variables:')}
        ${styleText('magenta', 'TEST262')} ${styleText('gray', process.env.TEST262 ? `(set to '${process.env.TEST262}')` : '(unset)')}
          The test262 directory, which contains the "test" subdirectory.
          If empty, it defaults to the "test262" sibling of this file.
        ${styleText('magenta', 'NUM_WORKERS')} ${styleText('gray', process.env.NUM_WORKERS ? `(set to '${process.env.NUM_WORKERS}')` : '(unset)')}
          The count of child processes that should be created to run tests.
          If empty, it defaults to ${cpus().length}.

      ${styleText('greenBright', 'Options:')}
        ${styleText('green', '--features')} ${styleText('gray', '[feature]')}
          Only run tests that has the specified feature.
        ${styleText('green', '--update-slow')} ${styleText('gray', '[seconds]')}
          Append tests that take longer than the given time to ${SLOW_LIST}.
        ${styleText('green', '--update-failed / -u')}
          Append failed tests to ${link('the failed list', new URL('./failed', import.meta.url))}.
          If test in this list passes, it will be an error.
        ${styleText('green', '--run-slow')}
          Run slow tests that are listed in ${SLOW_LIST}.
        ${styleText('green', '--failed-only / -f')}
          Run only the tests that failed in the previous run.
          Listed in ${LAST_FAILED_LIST}.
        ${styleText('green', '--strict-only / --fast / --q')}
          Only run strict mode tests.
        ${styleText('green', '--verbose / -v')}
          Print why tests are skipped or failed.
        ${styleText('green', '--vv / -V')}
          Print why tests are skipped or failed, and also print passed tests.

      ${styleText('yellowBright', 'Files:')}
        ${link(styleText('yellow', 'features'), new URL('./features', import.meta.url))}
          Specifies handling of test262 features, notably which ones to skip.
        ${link(styleText('yellow', 'skip'), new URL('./skip', import.meta.url))}
          Includes patterns of test files to skip.
        ${link(styleText('yellow', 'slow'), new URL('./slow', import.meta.url))}
          Includes patterns of test files to skip in the absence of ${styleText('green', '--run-slow-tests')}.
        ${link(styleText('yellow', 'failed'), new URL('./failed', import.meta.url))}
          Includes patterns of test files that are expected to fail.
        ${styleText('yellow', LAST_FAILED_LIST)} ${LOCAL_FILE}
          The list of test files that failed in the last run.
        ${link(styleText('yellow', 'last-failed.log'), new URL('./last-failed.log', import.meta.url))} ${LOCAL_FILE}
          The detailed log of test files that failed in the last run.
    `.slice(1);
    const indent = usage.match(/^\s*/)![0];
    process.stdout.write(
      `${usage
        .trimEnd()
        .split('\n')
        .map((line) => line.replace(indent, ''))
        .join('\n')}\n`,
    );
    process.exit(64);
  }

  await import('./test262-runner.mts');
}
main();
