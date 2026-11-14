import { Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import type { MailConfig } from './mail.config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** The one thing MailService needs from an email library, so tests can swap in a fake. */
export interface MailTransport {
  sendMail(message: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
}

export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: MailTransport | null;

  constructor(
    private readonly config: MailConfig,
    transport?: MailTransport | null,
  ) {
    this.transport =
      transport !== undefined
        ? transport
        : config.host
          ? createTransport({
              host: config.host,
              port: config.port,
              // 465 is encrypted from the start. Other ports upgrade to TLS when the server offers it.
              secure: config.port === 465,
              auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
            })
          : null;
  }

  /** Public address of the frontend, for building links inside messages. */
  get appUrl(): string {
    return this.config.appUrl;
  }

  async send(message: MailMessage): Promise<void> {
    if (this.transport) {
      await this.transport.sendMail({ from: this.config.from, ...message });
      return;
    }

    if (this.config.production) {
      // Never print message bodies in production: they can contain reset links.
      this.logger.error(`Email is not configured (SMTP_HOST is empty), so "${message.subject}" was not sent.`);
      return;
    }

    this.logger.warn(
      `Email is not configured, so nothing was sent. In production this message would go to ${message.to}:\n` +
        `Subject: ${message.subject}\n\n${message.text}`,
    );
  }
}
