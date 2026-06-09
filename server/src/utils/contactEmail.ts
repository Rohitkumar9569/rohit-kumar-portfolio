import { Resend } from 'resend';

interface ContactEmailPayload {
  name: string;
  email: string;
  message: string;
  messageId: string;
  receivedAt: Date;
}

interface ContactEmailResult {
  configured: boolean;
  sent: boolean;
}

type EmailProviderErrorDetail = {
  code?: number;
  message: string;
};

type ResendSendError = Error & {
  statusCode?: number | null;
  name: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMessageForHtml = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br />');

const getRecipients = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const sendContactNotificationEmail = async ({
  name,
  email,
  message,
  messageId,
  receivedAt,
}: ContactEmailPayload): Promise<ContactEmailResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const toEmail = process.env.CONTACT_EMAIL_TO || process.env.ADMIN_EMAIL;

  if (!apiKey || !toEmail) {
    return { configured: false, sent: false };
  }

  const resend = new Resend(apiKey);
  const recipients = getRecipients(toEmail);
  if (!recipients.length) {
    return { configured: false, sent: false };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = formatMessageForHtml(message);
  const receivedAtText = receivedAt.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const { data, error } = await resend.emails.send({
    to: recipients.length > 1 ? recipients : recipients[0],
    from: fromEmail,
    replyTo: email,
    subject: `New portfolio message from ${name}`,
    text: [
      `New portfolio contact message`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Received: ${receivedAtText}`,
      `Message ID: ${messageId}`,
      ``,
      message,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 16px;">New portfolio contact message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Received:</strong> ${escapeHtml(receivedAtText)}</p>
        <p><strong>Message ID:</strong> ${escapeHtml(messageId)}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="white-space: normal;">${safeMessage}</p>
      </div>
    `,
  });

  if (error) {
    const providerError = new Error(error.message) as ResendSendError;
    providerError.name = error.name || 'resend_error';
    providerError.statusCode = error.statusCode;
    throw providerError;
  }

  if (!data?.id) {
    throw new Error('Resend accepted the request but did not return an email id.');
  }

  return { configured: true, sent: true };
};

export const getContactEmailErrorDetail = (error: unknown): EmailProviderErrorDetail => {
  if (!error || typeof error !== 'object') {
    return { message: 'Unknown email provider error.' };
  }

  const maybeError = error as {
    code?: number;
    statusCode?: number | null;
    message?: string;
    name?: string;
    response?: {
      body?: {
        errors?: Array<{ message?: string; field?: string; help?: string }>;
      };
    };
  };
  const providerMessage = maybeError.response?.body?.errors
    ?.map((item) => item.message)
    .filter(Boolean)
    .join(' ');

  return {
    code: maybeError.code || maybeError.statusCode || undefined,
    message: providerMessage || maybeError.message || maybeError.name || 'Email provider rejected the request.',
  };
};
