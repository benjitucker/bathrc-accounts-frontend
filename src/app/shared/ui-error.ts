export class UiError extends Error {
  public readonly status: number;
  public override readonly name = 'UiError';

  public constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
