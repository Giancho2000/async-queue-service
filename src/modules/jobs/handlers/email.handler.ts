import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { JobHandler } from './jobs-handler.interface';

interface EmailPayload {
  to: string;
  subject?: string;
  body?: string;
}

@Injectable()
export class EmailHandler implements JobHandler {
  private readonly logger = new Logger(EmailHandler.name);

  async handle(job: Job): Promise<unknown> {
    const { to, subject, body } = job.data as EmailPayload;
    // This test account only simulates emails and returns a preview URL.
    const testAccountEmail = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccountEmail.user, pass: testAccountEmail.pass },
    });

    const info = await transporter.sendMail({
      from: ` "Async Queue" <no-reply@async.dev>`,
      to,
      subject: subject ?? `Test Email`,
      text: body ?? 'Send from activities queue',
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    this.logger.log(`Email in queue was send. Preview ${previewUrl}`);
    return { messageUrl: info.messageId, previewUrl };
  }
}
