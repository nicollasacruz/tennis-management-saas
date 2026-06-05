import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;
  private readonly replyTo: string | undefined;

  constructor(private readonly config: ConfigService) {
    const enabled = parseBool(this.config.get<string>('SMTP_ENABLED'), true);
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass =
      this.config.get<string>('SMTP_PASSWORD') ??
      this.config.get<string>('SMTP_PASS');
    const secure = parseBool(this.config.get<string>('SMTP_SECURE'), port === 465);
    const requireTLS = parseBool(this.config.get<string>('SMTP_REQUIRE_TLS'), false);
    const rejectUnauthorized = parseBool(
      this.config.get<string>('SMTP_REJECT_UNAUTHORIZED'),
      true,
    );

    const fromEmail =
      this.config.get<string>('SMTP_FROM_EMAIL') ??
      this.config.get<string>('SMTP_FROM') ??
      user ??
      'no-reply@clubtenispro.com';
    const fromName = this.config.get<string>('SMTP_FROM_NAME');
    this.fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    this.replyTo = this.config.get<string>('SMTP_REPLY_TO') || undefined;

    if (enabled && host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS,
        auth: { user, pass },
        tls: { rejectUnauthorized },
      });
      this.logger.log(
        `SMTP configured: ${host}:${port} (secure=${secure}, requireTLS=${requireTLS}, rejectUnauthorized=${rejectUnauthorized})`,
      );
    } else {
      this.transporter = null;
      const reason = !enabled
        ? 'SMTP_ENABLED=false'
        : 'missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD';
      this.logger.warn(`SMTP disabled (${reason}). Emails will be logged only.`);
    }
  }

  async send(input: SendMailInput): Promise<{ delivered: boolean }> {
    if (!this.transporter) {
      this.logger.log(
        `[MAIL DRY-RUN] to=${input.to} subject="${input.subject}" attachments=${input.attachments?.length ?? 0}`,
      );
      return { delivered: false };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        replyTo: this.replyTo,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType ?? 'application/octet-stream',
        })),
      });
      this.logger.log(`Mail sent to=${input.to} messageId=${info.messageId}`);
      return { delivered: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mail send failed to=${input.to}: ${message}`);
      throw error;
    }
  }
}
