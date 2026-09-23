export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function succeed<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(message = "That change is not allowed") {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

/** Convert thrown domain errors into an ActionResult; rethrow anything else. */
export function toActionError(error: unknown): ActionResult<never> {
  if (
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof InvalidTransitionError
  ) {
    return fail(error.message);
  }
  throw error;
}
