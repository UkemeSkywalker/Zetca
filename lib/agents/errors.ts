/** Raised when an agent fails to return structured output. */
export class StructuredOutputException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredOutputException';
  }
}
