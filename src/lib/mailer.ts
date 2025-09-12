import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendOtpEmail(to: string, otp: string) {
  const from = process.env.MAIL_FROM || smtpUser;
  const appName = process.env.APP_NAME || "Layer4";
  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Your ${appName} verification code</h2>
      <p style="margin:0 0 12px">Use the code below to verify your email address. This code expires in 10 minutes.</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:12px 16px;border:1px solid #ddd;border-radius:8px;display:inline-block">${otp}</div>
      <p style="margin:16px 0 0;color:#555">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({ to, from, subject: `${appName} verification code`, html });
}


