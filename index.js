import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ======================
   PATH SETUP
====================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ======================
   STATIC FRONTEND
====================== */
app.use(express.static(path.join(__dirname, "public")));

/* ======================
   SUPABASE
====================== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ======================
   RESEND
====================== */
const resend = new Resend(process.env.RESEND_API_KEY);

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "AI Automation Agency backend running 🚀"
  });
});

/* ======================
   SIMPLE QUALIFICATION (FREE)
====================== */
function qualifyLead(message) {
  const text = message.toLowerCase();
  if (text.includes("automation") || text.includes("ai")) return "HOT";
  if (text.includes("website") || text.includes("marketing")) return "WARM";
  return "COLD";
}

/* ======================
   CREATE LEAD
====================== */
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

    /* SAVE TO SUPABASE */
    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        qualification,
        ai_reply: reply
      }
    ]);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({ error: "Database error" });
    }

    /* SEND EMAIL */
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "We received your message",
      text: reply
    });

    res.json({
      success: true,
      qualification,
      message: "Lead saved and email sent"
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================
   ADMIN: GET ALL LEADS
====================== */
app.get("/api/leads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch leads" });
    }

    res.json({ leads: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
