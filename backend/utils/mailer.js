const nodemailer = require("nodemailer");

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
 * @param {string} to - recipient email
 * @param {string} otp - the OTP code
 */
async function sendOtpEmail(to, otp) {
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

module.exports = { sendOtpEmail };
