export function specFunctionName(name: string): string {
  let accessor: 'get' | 'set' | undefined;
  const accessorMatch = /_(getter|setter)$/.exec(name);
  if (accessorMatch) {
    accessor = accessorMatch[1] === 'getter' ? 'get' : 'set';
    name = name.slice(0, -accessorMatch[0].length);
  }

  const prototypeMatch = /^(.+?)(?:Proto|Prototype)_(.+)$/.exec(name);
  const specName = prototypeMatch
    ? prototypeName(prototypeMatch[1], prototypeMatch[2])
    : staticName(name.replace(/Constructor$/, ''));
  return accessor ? `${accessor} ${specName}` : specName;
}

function prototypeName(owner: string, member: string): string {
  const symbol = /^AtAt_(.+)$/.exec(member);
  return symbol
    ? `${owner.replaceAll('_', '.')}.prototype[Symbol.${symbol[1]}]`
    : `${owner.replaceAll('_', '.')}.prototype.${member.replaceAll('_', '.')}`;
}

function staticName(name: string): string {
  const symbol = /^(.+?)_AtAt_(.+)$/.exec(name);
  return symbol
    ? `${symbol[1].replaceAll('_', '.')}[Symbol.${symbol[2]}]`
    : name.replaceAll('_', '.');
}
