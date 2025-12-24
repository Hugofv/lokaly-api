/**
 * JWT Mock Helper for Tests
 * Provides a mock JWT service that works in test environment
 */

export class MockJwtService {
  private secret: string;
  private tokens: Map<string, any> = new Map();

  constructor(secret: string) {
    this.secret = secret;
  }

  async sign(payload: any, ttlSeconds?: number): Promise<string> {
    const tokenId = `mock-token-${Date.now()}-${Math.random()}`;
    const tokenData = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: ttlSeconds
        ? Math.floor(Date.now() / 1000) + ttlSeconds
        : Math.floor(Date.now() / 1000) + 3600,
    };
    this.tokens.set(tokenId, tokenData);
    return tokenId;
  }

  async verify(token: string): Promise<any | null> {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return null;
    }

    // Check expiration
    if (tokenData.exp && tokenData.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return tokenData;
  }
}
