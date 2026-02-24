import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send OTP email
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const mailOptions = {
    from: `"CYBERSEC Systems" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your PICS Login OTP",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; text-align: center;">CYBERSEC SYSTEMS</h2>
        <p style="text-align: center; color: #374151;">Your one-time password for login:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8; background: #eff6ff; padding: 12px 24px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 13px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="text-align: center; color: #9ca3af; font-size: 11px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Send login credentials email to a newly created jailer
 */
export async function sendJailerCredentialsEmail(
  to: string,
  name: string,
  password: string,
): Promise<void> {
  const mailOptions = {
    from: `"CYBERSEC Systems" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your PICS Jailer Account Credentials",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; text-align: center;">CYBERSEC SYSTEMS</h2>
        <p style="text-align: center; color: #374151;">Welcome, <strong>${name}</strong>! Your Jailer account has been created.</p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;"><strong>Password:</strong></p>
          <div style="text-align: center;">
            <span style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #1d4ed8; background: #eff6ff; padding: 10px 20px; border-radius: 8px; display: inline-block;">${password}</span>
          </div>
          <p style="margin: 12px 0 0 0; color: #374151; font-size: 14px;"><strong>Role:</strong> Jailer</p>
        </div>
        <p style="text-align: center; color: #dc2626; font-size: 13px; font-weight: 600;">Please change your password after first login.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="text-align: center; color: #9ca3af; font-size: 11px;">This is an automated message. Do not share your credentials with anyone.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
