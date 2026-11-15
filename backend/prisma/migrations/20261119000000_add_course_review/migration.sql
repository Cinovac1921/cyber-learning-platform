-- AlterTable
ALTER TABLE `courses` ADD COLUMN `reviewStatus` ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `reviewNote` VARCHAR(500) NULL,
    ADD COLUMN `submittedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` INTEGER NULL;

-- Courses already live in the public library count as approved, so nothing disappears.
UPDATE `courses` SET `reviewStatus` = 'APPROVED', `reviewedAt` = CURRENT_TIMESTAMP(3) WHERE `scope` = 'PUBLIC' AND `published` = true;

-- CreateIndex
CREATE INDEX `courses_reviewStatus_idx` ON `courses`(`reviewStatus`);

-- CreateIndex
CREATE INDEX `courses_reviewedById_idx` ON `courses`(`reviewedById`);

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
