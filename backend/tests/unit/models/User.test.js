import User from '../../../models/User.js';

describe('User Model Unit Tests', () => {
  it('pre-save bcrypt hook hashes the password (stored value != plaintext)', async () => {
    const rawPassword = 'SecurePassword123!';
    const user = await User.create({
      name: 'Bcrypt Test User',
      email: 'bcrypt-test@example.com',
      password: rawPassword,
      role: 'citizen',
    });

    expect(user.password).not.toBe(rawPassword);
    expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$/); // Standard bcrypt hash format
  });

  it('checkPassword correctly validates matching and rejects non-matching passwords', async () => {
    const rawPassword = 'MySecretPassword123';
    const user = await User.create({
      name: 'Password Checker User',
      email: 'checker@example.com',
      password: rawPassword,
      role: 'citizen',
    });

    const isMatch = await user.checkPassword(rawPassword);
    expect(isMatch).toBe(true);

    const isWrong = await user.checkPassword('WrongPassword123');
    expect(isWrong).toBe(false);
  });

  it('defaults role to citizen and initializes empty string defaults for phone, address, and avatar', async () => {
    const user = await User.create({
      name: 'Default Role User',
      email: 'defaultrole@example.com',
      password: 'password123',
    });

    expect(user.role).toBe('citizen');
    expect(user.phone).toBe('');
    expect(user.address).toBe('');
    expect(user.avatar).toBe('');
  });
});

