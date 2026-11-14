import { checkFlag, hashFlag } from './flag';

describe('flag hashing', () => {
  it('accepts the flag it was made from', () => {
    const { flagSalt, flagHash } = hashFlag('flag{hello_world}');
    expect(checkFlag('flag{hello_world}', flagSalt, flagHash)).toBe(true);
  });

  it('rejects a different flag', () => {
    const { flagSalt, flagHash } = hashFlag('flag{hello_world}');
    expect(checkFlag('flag{hello_worle}', flagSalt, flagHash)).toBe(false);
    expect(checkFlag('', flagSalt, flagHash)).toBe(false);
  });

  it('ignores spaces around the flag but keeps the letter case', () => {
    const { flagSalt, flagHash } = hashFlag('  flag{Abc}\n');
    expect(checkFlag('flag{Abc}', flagSalt, flagHash)).toBe(true);
    expect(checkFlag('  flag{Abc}  ', flagSalt, flagHash)).toBe(true);
    expect(checkFlag('flag{abc}', flagSalt, flagHash)).toBe(false);
  });

  it('uses a new salt each time, so equal flags do not share a hash', () => {
    const first = hashFlag('flag{same}');
    const second = hashFlag('flag{same}');
    expect(first.flagSalt).not.toBe(second.flagSalt);
    expect(first.flagHash).not.toBe(second.flagHash);
  });

  it('never stores the flag itself', () => {
    const { flagSalt, flagHash } = hashFlag('flag{secret}');
    expect(flagSalt).not.toContain('secret');
    expect(flagHash).not.toContain('secret');
    expect(flagHash).toHaveLength(64);
    expect(flagSalt.length).toBeLessThanOrEqual(32);
  });

  it('does not throw on a stored hash of the wrong length', () => {
    expect(checkFlag('flag{x}', 'salt', 'abcd')).toBe(false);
  });
});
