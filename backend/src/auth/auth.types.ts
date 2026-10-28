export interface JwtPayload {
  sub: number;
  role: string;
}

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: JwtPayload;
}