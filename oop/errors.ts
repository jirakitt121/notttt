/** Shared HTTP error type; presentation stays in the existing Worker handler. */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
