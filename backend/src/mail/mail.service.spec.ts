import { Logger } from '@nestjs/common';
import { readMailConfig, type MailConfig } from './mail.config';
import { MailService } from './mail.service';

const config: MailConfig = {
  host: null,
  port: 587,
  user: null,
  pass: null,
  from: 'Cyber Learning <no-reply@example.com>',
  appUrl: 'http://localhost:5173',
  production: false,
};
const message = { to: 'sam@example.com', subject: 'Reset', text: 'Open http://x/reset-password?token=SECRET' };

describe('MailService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends through the transport, from the configured address', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    await new MailService(config, { sendMail }).send(message);
    expect(sendMail).toHaveBeenCalledWith({ from: config.from, ...message });
  });

  it('prints the message in the terminal while developing without email set up', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await new MailService(config, null).send(message);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('token=SECRET');
  });

  it('never prints a message body in production, and says email is not set up', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await new MailService({ ...config, production: true }, null).send(message);
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).not.toContain('SECRET');
  });

  it('lets a sending failure reach the caller', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('SMTP down'));
    await expect(new MailService(config, { sendMail }).send(message)).rejects.toThrow('SMTP down');
  });
});

describe('readMailConfig', () => {
  it('has safe defaults for development', () => {
    expect(readMailConfig({})).toMatchObject({
      host: null,
      port: 587,
      appUrl: 'http://localhost:5173',
      production: false,
    });
  });

  it('builds links from APP_URL, then FRONTEND_ORIGIN, without a trailing slash', () => {
    expect(readMailConfig({ FRONTEND_ORIGIN: 'https://learn.example.com/' }).appUrl).toBe('https://learn.example.com');
    expect(
      readMailConfig({ APP_URL: 'https://app.example.com//', FRONTEND_ORIGIN: 'https://other.example.com' }).appUrl,
    ).toBe('https://app.example.com');
  });

  it('reads the SMTP settings and the production flag', () => {
    expect(
      readMailConfig({ SMTP_HOST: ' smtp.example.com ', SMTP_PORT: '465', SMTP_USER: 'u', SMTP_PASS: 'p', NODE_ENV: 'production' }),
    ).toMatchObject({ host: 'smtp.example.com', port: 465, user: 'u', pass: 'p', production: true });
  });
});
