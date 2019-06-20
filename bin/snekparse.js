'use strict';

function snekparse(args) {
  if (typeof args === 'string') args = args.split(' ');
  const argv = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (/^--.+=/.test(arg)) {
      const match = arg.match(/^--([^=]+)=([\s\S]*)$/);
      argv[match[1]] = match[2];
    } else if (/^--no-.+/.test(arg)) {
      argv[arg.match(/^--no-(.+)/)[1]] = false;
    } else if (/^--.+/.test(arg)) {
      const key = arg.match(/^--(.+)/)[1];
      const next = args[i + 1];
      if (typeof next !== 'undefined' && !/^-/.test(next)) {
        argv[key] = next;
      } else if (/^(true|false)$/.test(next)) {
        argv[key] = next === 'true';
      } else {
        argv[key] = true;
      }
    } else if (/^-[^-]+/.test(arg)) {
      const letters = arg.slice(1, -1).split('');
      let broken = false;
      for (const j of letters) {
        const next = arg.slice(j + 2);

        if (next === '-') {
          argv[letters[j]] = next;
          continue;
        }

        if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
          argv[letters[j]] = next.split('=')[1];
          broken = true;
          break;
        }

        if (/[A-Za-z]/.test(letters[j])
            && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
          argv[letters[j]] = next;
          broken = true;
          break;
        }

        if (letters[j + 1] && letters[j + 1].match(/\W/)) {
          argv[letters[j]] = arg.slice(j + 2);
          broken = true;
          break;
        } else {
          argv[letters[j]] = true;
        }
      }

      const key = arg.slice(-1)[0];
      if (!broken && key !== '-') {
        if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1])) argv[key] = args[i + 1];
        else if (args[i + 1] && /true|false/.test(args[i + 1])) argv[key] = args[i + 1] === 'true';
        else argv[key] = true;
      }
    } else {
      argv.push(arg);
    }
  }

  return argv;
}

module.exports = snekparse;
