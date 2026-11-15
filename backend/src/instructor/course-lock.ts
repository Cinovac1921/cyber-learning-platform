import { ConflictException } from '@nestjs/common';

/**
 * A public course that is waiting for review, or live, can't be edited. If it could, an instructor
 * could get a clean version approved and then swap in anything at all. To change it they withdraw it,
 * edit, and submit it again.
 */
export function assertEditable(reviewStatus: string): void {
  if (reviewStatus === 'PENDING') {
    throw new ConflictException('This course is waiting for review, so it is locked. Withdraw it to make changes.');
  }
  if (reviewStatus === 'APPROVED') {
    throw new ConflictException('This course is live in the public library, so it is locked. Withdraw it to make changes.');
  }
}
