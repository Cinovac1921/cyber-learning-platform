export interface JwtPayload {
  sub: number;
  role: string;
  /** The account's token version when this token was made. Tokens from before versions existed have none. */
  ver?: number;
}

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: JwtPayload;
}