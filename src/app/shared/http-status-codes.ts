export const enum HttpStatusCodes {
  ConnectionError = 0,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Conflict = 409,
  RequestEntityTooLarge = 413,
  Unhandled = 500,
  NotImplemented = 501,
  BadGateway = 502,
  GatewayTimeout = 504,
}
