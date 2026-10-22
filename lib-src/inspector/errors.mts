export class CDPError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }

  static methodNotFound(method: string): CDPError {
    return new CDPError(-32601, `Method not found: ${method}`);
  }

  static invalidParams(message: string): CDPError {
    return new CDPError(-32602, message);
  }

  static serverError(message: string): CDPError {
    return new CDPError(-32000, message);
  }
}
