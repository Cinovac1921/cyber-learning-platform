-- AlterTable
ALTER TABLE `courses` ADD COLUMN `copiedFromId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `courses_copiedFromId_idx` ON `courses`(`copiedFromId`);

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_copiedFromId_fkey` FOREIGN KEY (`copiedFromId`) REFERENCES `courses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
