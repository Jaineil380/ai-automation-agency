import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ============================
   ENV VALIDATION
============================ */
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY");
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase credentials");
}
if (!process.env.RESEND_API_KEY) {
  console.error("❌ Missing RESEND_API_KEY");
}

/* ============================
   CLIENTS
============================ */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/* ============================
   HEALTH CHECK
============================ */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "AI Automation Agency server is running 🚀",
  });
});

/* ============================
   AI GENERATION ENDPOINT
============================ */
app.post("/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional business AI assistant." },
        { role: "user", content: prompt },
      ],
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ============================
   LEAD → AI → SAVE → EMAIL
============================ */
app.post("/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // AI reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You write polite and professional business emails.",
        },
        {
          role: "user",
          content: `Write a short professional reply to this lead message:\n"${message}"`,
        },
      ],
    });

    const aiReply = completion.choices[0].message.content;

    // Save to Supabase
    const { error: dbError } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        ai_reply: aiReply,
      },
    ]);

    if (dbError) {
      console.error("Supabase error:", dbError);
    }

    // Send email
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Thanks for contacting us!",
      html: `<p>${aiReply}</p>`,
    });

    res.json({
      success: true,
      message: "Lead processed successfully",
      aiReply,
    });
  } catch (err) {
    console.error("LEAD ERROR:", err);
    res.status(500).json({ error: "Lead processing failed" });
  }
});

/* ============================
   SERVER START
============================ */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
