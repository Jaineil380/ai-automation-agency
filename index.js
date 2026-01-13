import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Simple qualification logic (FREE)
function qualifyLead(message) {
  const text = message.toLowerCase();
  if (text.includes("automation") || text.includes("ai")) return "HOT";
  if (text.includes("website") || text.includes("marketing")) return "WARM";
  return "COLD";
}

// Lead endpoint
app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const qualification = qualifyLead(message);

    const reply = `Hi ${name},

Thanks for reaching out! We’ve received your message and will get back to you shortly.

– AI Automation Agency`;

    // Save to Supabase
    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        qualification,
        ai_reply: reply
      }
    ]);

    if (error) throw error;

    // Send email
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "We received your message",
      text: reply
    });

    res.json({
      success: true,
      qualification,
      message: "Lead saved & email sent"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
