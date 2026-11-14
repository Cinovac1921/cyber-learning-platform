import { Module } from '@nestjs/common';
import { readMailConfig } from './mail.config';
import { MailService } from './mail.service';

@Module({
  providers: [{ provide: MailService, useFactory: () => new MailService(readMailConfig()) }],
  exports: [MailService],
})
export class MailModule {}
