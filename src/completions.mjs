export class Completion {
  constructor(type, value, target) {
    this.Type = type;
    this.Value = value;
    this.Target = target;
  }
}

export class NormalCompletion extends Completion {
  constructor(value, target) {
    super('normal', value, target);
  }
}

export class AbruptCompletion extends Completion {}

export class BreakCompletion extends AbruptCompletion {
  constructor(value, target) {
    super('break', value, target);
  }
}

export class ContinueCompletion extends AbruptCompletion {
  constructor(value, target) {
    super('continue', value, target);
  }
}

export class ReturnCompletion extends AbruptCompletion {
  constructor(value, target) {
    super('return', value, target);
  }
}

export class ThrowCompletion extends AbruptCompletion {
  constructor(value, target) {
    super('throw', value, target);
  }
}
