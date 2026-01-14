import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Required for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

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

/**
 * POST /api/lead
 * Save lead + send reply
 */
app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Simple qualification logic (FREE, no AI)
    const qualification =
      message.toLowerCase().includes("price") ||
      message.toLowerCase().includes("cost")
        ? "HOT"
        : "WARM";

    // Email reply (template)
    const reply = `
Dear ${name},

Thank you for reaching out! 👋

We received your message and our team will review your requirements carefully.
If your project fits our automation services, we’ll get back to you shortly.

Have a great day!

Best regards,  
AI Automation Agency
`;

    // Save to Supabase
    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        qualification,
        ai_reply: reply,
      },
    ]);

    if (error) throw error;

    // Send email
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Thanks for contacting AI Automation Agency",
      text: reply,
    });

    res.json({
      success: true,
      qualification,
      reply,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/leads
 * Admin dashboard
 */
app.get("/api/leads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      leads: data,
    });
  } catch (err) {
    console.error("FETCH ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
