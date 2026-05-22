const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({ origin: "*", methods: ["POST", "GET"] }));
app.use(express.json());

// ── Brevo (Sendinblue) transporter ──────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_LOGIN,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

// ── Health check ────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Backbone Physiotherapy Backend Running ✅" });
});

// ── APPOINTMENT route ────────────────────────────
app.post("/api/appointment", async (req, res) => {
  const { name, phone, email, date, time, service, message } = req.body;

  if (!name || !phone || !date || !time || !service) {
    return res.status(400).json({ success: false, message: "Required fields missing" });
  }

  const confirmURL = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/confirm-appointment?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email || "")}&phone=${encodeURIComponent(phone)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&service=${encodeURIComponent(service)}`;

  try {
    await transporter.sendMail({
      from: `"Backbone Physiotherapy" <a4963d001@smtp-brevo.com>`,
      to: process.env.RECEIVER_EMAIL,
      subject: `📅 New Appointment Request — ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background: #1a3a6b; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">📅 New Appointment Request</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">Backbone Physiotherapy — Action Required</p>
          </div>
          <div style="padding: 28px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px; width: 40%;">Patient Name</td><td style="padding: 12px 0; color: #1a3a6b; font-weight: bold; font-size: 14px;">${name}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Phone</td><td style="padding: 12px 0; color: #222; font-size: 14px;"><a href="tel:${phone}" style="color: #1a3a6b; font-weight: bold;">${phone}</a></td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Email</td><td style="padding: 12px 0; color: #222; font-size: 14px;">${email || "Not provided"}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Preferred Date</td><td style="padding: 12px 0; color: #222; font-size: 14px;">${date}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Preferred Time</td><td style="padding: 12px 0; color: #222; font-size: 14px;">${time}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Service</td><td style="padding: 12px 0; color: #1a3a6b; font-weight: bold; font-size: 14px;">${service}</td></tr>
              <tr><td style="padding: 12px 0; color: #666; font-size: 13px; vertical-align: top;">Notes</td><td style="padding: 12px 0; color: #222; font-size: 14px;">${message || "No additional notes"}</td></tr>
            </table>
          </div>
          ${email ? `
          <div style="padding: 0 28px 28px;">
            <div style="background: #f0f7ff; border-radius: 10px; padding: 20px; text-align: center; border: 2px dashed #1a3a6b;">
              <p style="margin: 0 0 6px; color: #1a3a6b; font-weight: bold; font-size: 15px;">Ready to confirm this appointment?</p>
              <p style="margin: 0 0 16px; color: #666; font-size: 13px;">Click below to send confirmation email to patient.</p>
              <a href="${confirmURL}" style="display: inline-block; background: #1a3a6b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">✅ Confirm Appointment</a>
            </div>
          </div>
          ` : `
          <div style="padding: 0 28px 28px;">
            <div style="background: #fff3cd; border-radius: 10px; padding: 16px; border: 1px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 13px;">⚠️ Patient did not provide email — please call <strong>${phone}</strong> to confirm.</p>
            </div>
          </div>`}
          <div style="background: #f8f9fa; padding: 14px 28px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #888; font-size: 12px;">Backbone Physiotherapy • Rion's Hospital, Sector 110, Gurugram</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: "Appointment request sent successfully" });
  } catch (error) {
    console.error("Appointment email error:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

// ── CONFIRM APPOINTMENT route ────────────────────────────
app.get("/api/confirm-appointment", async (req, res) => {
  const { name, email, phone, date, time, service } = req.query;

  if (!email || !name) {
    return res.send(`<div style="font-family: Arial; text-align: center; padding: 60px;"><h2 style="color: #e53e3e;">❌ Cannot Confirm</h2><p>Patient email not available. Please call <strong>${phone}</strong> to confirm.</p></div>`);
  }

  try {
    await transporter.sendMail({
      from: `"Backbone Physiotherapy" <a4963d001@smtp-brevo.com>`,
      to: email,
      subject: `✅ Appointment Confirmed — Backbone Physiotherapy`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background: #1a3a6b; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Appointment Confirmed!</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">Backbone Physiotherapy, Gurgaon</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #555; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">Your appointment has been <strong style="color: #16a34a;">confirmed</strong> by our team!</p>
            <div style="background: #f0f7f0; border-radius: 10px; padding: 20px; margin: 0 0 24px; border-left: 4px solid #16a34a;">
              <p style="margin: 0 0 12px; font-weight: bold; color: #1a3a6b; font-size: 15px;">📋 Appointment Details</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #666; font-size: 13px; width: 40%;">📅 Date</td><td style="padding: 6px 0; color: #222; font-weight: bold; font-size: 14px;">${date}</td></tr>
                <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">⏰ Time</td><td style="padding: 6px 0; color: #222; font-weight: bold; font-size: 14px;">${time}</td></tr>
                <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">🏥 Service</td><td style="padding: 6px 0; color: #1a3a6b; font-weight: bold; font-size: 14px;">${service}</td></tr>
                <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">📍 Location</td><td style="padding: 6px 0; color: #222; font-size: 13px;">Rion's Hospital, Sector 110, Gurugram</td></tr>
              </table>
            </div>
            <div style="background: #fff8e1; border-radius: 10px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0 0 8px; font-weight: bold; color: #92400e; font-size: 13px;">📌 Important Reminders</p>
              <ul style="margin: 0; padding-left: 18px; color: #555; font-size: 13px; line-height: 1.8;">
                <li>Please arrive <strong>15 minutes early</strong></li>
                <li>Bring all relevant <strong>medical records and reports</strong></li>
                <li>For cancellation, contact us <strong>at least 24 hours</strong> in advance</li>
              </ul>
            </div>
            <p style="color: #555; font-size: 14px; margin: 0;">Need to reschedule? Call us at <a href="tel:+918510013420" style="color: #1a3a6b; font-weight: bold;">+91-8510013420</a></p>
          </div>
          <div style="background: #f8f9fa; padding: 14px 28px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #888; font-size: 12px;">Backbone Physiotherapy • Rion's Hospital, Sector 110, Gurugram, Haryana 122017</p>
          </div>
        </div>
      `,
    });

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 80px 20px; background: #f0f7f0; min-height: 100vh;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          <div style="font-size: 64px; margin-bottom: 24px;">✅</div>
          <h2 style="color: #16a34a; margin: 0 0 12px; font-size: 24px;">Appointment Confirmed!</h2>
          <p style="color: #555; font-size: 15px; margin: 0 0 24px;">Confirmation email sent to <strong>${email}</strong></p>
          <div style="background: #f8f9fa; border-radius: 10px; padding: 16px; text-align: left;">
            <p style="margin: 0 0 6px; color: #666; font-size: 13px;"><strong>Patient:</strong> ${name}</p>
            <p style="margin: 0 0 6px; color: #666; font-size: 13px;"><strong>Date:</strong> ${date} at ${time}</p>
            <p style="margin: 0; color: #666; font-size: 13px;"><strong>Service:</strong> ${service}</p>
          </div>
        </div>
      </div>
    `);
  } catch (error) {
    console.error("Confirmation email error:", error);
    res.send(`<div style="font-family: Arial; text-align: center; padding: 60px;"><h2 style="color: #e53e3e;">❌ Failed</h2><p>Please call <strong>${phone}</strong></p></div>`);
  }
});

// ── CONTACT route ────────────────────────────────
app.post("/api/contact", async (req, res) => {
  const { firstName, lastName, email, phone, service, message } = req.body;

  if (!firstName || !email || !phone || !message) {
    return res.status(400).json({ success: false, message: "Required fields missing" });
  }

  try {
    await transporter.sendMail({
      from: `"Backbone Physiotherapy" <a4963d001@smtp-brevo.com>`,
      to: process.env.RECEIVER_EMAIL,
      subject: `📩 New Contact Message — ${firstName} ${lastName || ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background: #1a3a6b; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">📩 New Contact Message</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">Backbone Physiotherapy</p>
          </div>
          <div style="padding: 28px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px; width: 40%;">Name</td><td style="padding: 12px 0; color: #1a3a6b; font-weight: bold; font-size: 14px;">${firstName} ${lastName || ""}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Email</td><td style="padding: 12px 0; color: #222; font-size: 14px;"><a href="mailto:${email}" style="color: #1a3a6b;">${email}</a></td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Phone</td><td style="padding: 12px 0; color: #222; font-size: 14px;"><a href="tel:${phone}" style="color: #1a3a6b; font-weight: bold;">${phone}</a></td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; color: #666; font-size: 13px;">Service</td><td style="padding: 12px 0; color: #222; font-size: 14px;">${service || "Not specified"}</td></tr>
              <tr><td style="padding: 12px 0; color: #666; font-size: 13px; vertical-align: top;">Message</td><td style="padding: 12px 0; color: #222; font-size: 14px; line-height: 1.6;">${message}</td></tr>
            </table>
          </div>
          <div style="background: #f8f9fa; padding: 14px 28px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #888; font-size: 12px;">Reply to: <strong>${email}</strong> | Call: <strong>${phone}</strong></p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));