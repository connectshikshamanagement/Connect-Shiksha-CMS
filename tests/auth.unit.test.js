const jwt = require('jsonwebtoken');
const {
  getSignedJwtToken,
  generateRawRefreshToken,
  hashToken,
  compareTokenHash
} = require('../middleware/auth');

describe('Auth helpers', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_key';
    process.env.JWT_EXPIRE = '1m';
  });

  test('getSignedJwtToken returns a valid JWT', () => {
    const token = getSignedJwtToken('507f1f77bcf86cd799439011');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('id', '507f1f77bcf86cd799439011');
  });

  test('generateRawRefreshToken returns a long random string', () => {
    const t1 = generateRawRefreshToken();
    const t2 = generateRawRefreshToken();
    expect(typeof t1).toBe('string');
    expect(t1.length).toBeGreaterThanOrEqual(64);
    expect(t1).not.toEqual(t2);
  });

  test('hashToken and compareTokenHash work correctly', async () => {
    const raw = 'some_random_refresh_token_value';
    const hash = await hashToken(raw);
    expect(hash).not.toEqual(raw);
    const matchTrue = await compareTokenHash(raw, hash);
    const matchFalse = await compareTokenHash('wrong', hash);
    expect(matchTrue).toBe(true);
    expect(matchFalse).toBe(false);
  });
});


