import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ------------------ ENV ------------------ */
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

/* ------------------ CLIENTS ------------------ */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const resend = new Resend(RESEND_API_KEY);

/* ------------------ HELPERS ------------------ */
function qualifyLead(message) {
  const text = message.toLowerCase();

  if (
    text.includes("automation") ||
    text.includes("ai") ||
    text.includes("business") ||
    text.includes("crm") ||
    text.includes("workflow")
  ) {
    return "HOT";
  }

  if (text.length > 20) return "WARM";
  return "COLD";
}

function generateReply(name) {
  return `Hi ${name},

Thank you for reaching out! I really appreciate your interest in AI automation.

I’d love to understand your requirements better and see how we can build a solution that fits your business goals.

Please reply with a good time to connect.

Best regards,
Jai`;
}

/* ------------------ ROUTES ------------------ */

// Health check
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

/* ----------- CREATE LEAD ----------- */
app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const qualification = qualifyLead(message);
    const ai_reply = generateReply(name);

    // Save to Supabase
    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        qualification,
        ai_reply,
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database insert failed" });
    }

    // Send email
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Thanks for contacting us!",
      text: ai_reply,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------- ADMIN DASHBOARD API ----------- */
app.get("/api/leads", async (req, res) => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch leads" });
  }

  res.json(data);
});

/* ------------------ START ------------------ */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
