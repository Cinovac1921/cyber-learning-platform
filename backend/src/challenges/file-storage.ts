import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

/** The largest file an instructor may attach to a challenge. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** What multer hands us for an uploaded file (kept in memory). */
export interface UploadedBlob {
  originalname: string;
  size: number;
  buffer: Buffer;
}

/**
 * Cleans the name the instructor's browser sent so it is safe to show and to
 * put in a download header: no folders, no control characters, a sane length.
 */
export function cleanFileName(raw: string): string {
  // Some browsers send a full Windows path. Keep only the last part.
  const lastPart = basename(raw.replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const cleaned = lastPart.replace(/[\u0000-\u001f\u007f"<>:|?*]/g, '_').trim();
  const name = cleaned.replace(/^\.+/, '');
  if (!name) return 'challenge-file';
  if (name.length <= 100) return name;
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 && name.length - dot <= 12 ? name.slice(dot) : '';
  return name.slice(0, 100 - extension.length) + extension;
}

/** Stores uploaded files under a folder on disk, each with a random name. */
export class FileStorage {
  constructor(private readonly folder: string) {}

  /** Saves the file and returns the random key it was stored under. */
  async save(blob: UploadedBlob): Promise<string> {
    const key = randomUUID();
    await mkdir(this.folder, { recursive: true });
    await writeFile(this.pathFor(key), blob.buffer, { flag: 'wx' });
    return key;
  }

  open(key: string) {
    return createReadStream(this.pathFor(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await stat(this.pathFor(key))).isFile();
    } catch {
      return false;
    }
  }

  /** Deletes a stored file. A file that is already gone is not an error. */
  async remove(key: string | null | undefined): Promise<void> {
    if (!key) return;
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    // Keys are always UUIDs we made ourselves. This guards against anything else ever reaching the disk path.
    if (!/^[0-9a-f-]{36}$/.test(key)) {
      throw new Error('Invalid file key.');
    }
    return join(this.folder, key);
  }
}

export function uploadFolder(): string {
  return join(
    process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'),
    'challenges',
  );
}

/** Content-Disposition value that downloads the file under its original name. */
export function attachmentHeader(fileName: string): string {
  const fallback = fileName
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/[\\"]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
