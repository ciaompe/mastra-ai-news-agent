import { createTool } from '@mastra/core';
import { z } from 'zod';
import { Resend } from 'resend';

const emailSchema = z.object({
  subject: z.string().describe('Email subject'),
  htmlContent: z.string().describe('HTML email content'),
});

export const emailTool = createTool({
  id: 'send-email',
  description: 'Sends an email via Resend API with the provided HTML content',
  inputSchema: emailSchema,
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    messageId: z.string().optional(),
  }),
  execute: async ({ context: { subject, htmlContent } }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const emailToEnv = process.env.EMAIL_TO;

    if (!resendApiKey || !emailFrom || !emailToEnv) {
      throw new Error('Missing required email environment variables (RESEND_API_KEY, EMAIL_FROM, EMAIL_TO)');
    }

    try {
      // Parse multiple recipients from comma-separated string
      const emailTo = emailToEnv
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (emailTo.length === 0) {
        throw new Error('No valid email recipients provided');
      }

      const resend = new Resend(resendApiKey);
      
      const response = await resend.emails.send({
        from: emailFrom,
        to: emailTo.length === 1 ? emailTo[0] : emailTo,
        subject: subject,
        html: htmlContent,
      });

      if (response.error) {
        throw new Error(`Resend API error: ${response.error.message}`);
      }

      return {
        success: true,
        message: 'Email sent successfully',
        messageId: response.data?.id,
      };
    } catch (error) {
      throw new Error(`Email sending error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

