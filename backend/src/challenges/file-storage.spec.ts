import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { attachmentHeader, cleanFileName, FileStorage } from './file-storage';

describe('cleanFileName', () => {
  it('keeps an ordinary name', () => {
    expect(cleanFileName('capture.pcap')).toBe('capture.pcap');
  });

  it('removes folders, including Windows paths and path tricks', () => {
    expect(cleanFileName('C:\\Users\\me\\capture.pcap')).toBe('capture.pcap');
    expect(cleanFileName('../../etc/passwd')).toBe('passwd');
    expect(cleanFileName('/etc/shadow')).toBe('shadow');
  });

  it('replaces characters that break headers or file systems', () => {
    expect(cleanFileName('a"b<c>d.txt')).toBe('a_b_c_d.txt');
    expect(cleanFileName('line\nbreak.txt')).toBe('line_break.txt');
  });

  it('drops leading dots and falls back when nothing is left', () => {
    expect(cleanFileName('.hidden')).toBe('hidden');
    expect(cleanFileName('...')).toBe('challenge-file');
    expect(cleanFileName('')).toBe('challenge-file');
  });

  it('shortens long names but keeps the extension', () => {
    const name = cleanFileName(`${'a'.repeat(300)}.zip`);
    expect(name.length).toBeLessThanOrEqual(100);
    expect(name.endsWith('.zip')).toBe(true);
  });
});

describe('attachmentHeader', () => {
  it('is a download with an ASCII fallback and the real name encoded', () => {
    const header = attachmentHeader('résumé "x".txt');
    expect(
      header.startsWith(
        'attachment; filename="r_sum_ _x_.txt"'.replace(
          'r_sum_ _x_',
          'r_sum_ _x_',
        ),
      ),
    ).toBe(true);
    expect(header).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9%20%22x%22.txt");
    expect(header).not.toContain('\n');
  });
});

describe('FileStorage', () => {
  let folder: string;
  let storage: FileStorage;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'challenge-files-'));
    storage = new FileStorage(join(folder, 'nested'));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('saves a file under a random key and reads it back', async () => {
    const key = await storage.save({
      originalname: 'a.txt',
      size: 5,
      buffer: Buffer.from('hello'),
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(key).not.toContain('a.txt');
    expect(await storage.exists(key)).toBe(true);

    const chunks: Buffer[] = [];
    for await (const chunk of storage.open(key)) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('hello');
    expect((await readFile(join(folder, 'nested', key))).toString()).toBe(
      'hello',
    );
  });

  it('gives two uploads of the same name different keys', async () => {
    const blob = {
      originalname: 'same.txt',
      size: 1,
      buffer: Buffer.from('x'),
    };
    expect(await storage.save(blob)).not.toBe(await storage.save(blob));
  });

  it('removes a file, and removing it again is fine', async () => {
    const key = await storage.save({
      originalname: 'a.txt',
      size: 1,
      buffer: Buffer.from('x'),
    });
    await storage.remove(key);
    expect(await storage.exists(key)).toBe(false);
    await expect(storage.remove(key)).resolves.toBeUndefined();
    await expect(storage.remove(null)).resolves.toBeUndefined();
  });

  it('refuses a key that is not one it made, so paths cannot escape the folder', async () => {
    await expect(storage.remove('../../etc/passwd')).rejects.toThrow(
      'Invalid file key',
    );
    await expect(storage.exists('../secret')).resolves.toBe(false);
    expect(() => storage.open('../secret')).toThrow('Invalid file key');
  });
});
