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

/* ======================
   CLIENTS
====================== */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "AI Automation Agency backend is running 🚀",
  });
});

/* ======================
   LEAD → AI → SAVE → EMAIL
====================== */
app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Name, email, and message are required",
      });
    }

    /* ---------- AI REPLY ---------- */
    const replyCompletion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content:
            "You are a professional business sales assistant. Write polite, confident, and helpful email replies.",
        },
        {
          role: "user",
          content: `Write a professional email reply to this lead message:\n"${message}"`,
        },
      ],
    });

    const aiReply = replyCompletion.choices[0].message.content;

    /* ---------- AI QUALIFICATION ---------- */
    const qualificationCompletion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content:
            "You are a sales expert. Classify leads strictly as HOT, WARM, or COLD.",
        },
        {
          role: "user",
          content: `
Classify the following lead:

Rules:
- HOT: clear intent, urgency, budget, ready to buy
- WARM: interested but needs discussion
- COLD: vague or just browsing

Lead message:
"${message}"

Return ONLY one word: HOT, WARM, or COLD.
          `,
        },
      ],
    });

    const qualification =
      qualificationCompletion.choices[0].message.content.trim();

    /* ---------- SAVE TO SUPABASE ---------- */
    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          name,
          email,
          message,
          ai_reply: aiReply,
          qualification, // HOT / WARM / COLD
        },
      ])
      .select();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({
        error: "Failed to save lead",
        details: error.message,
      });
    }

    /* ---------- SEND EMAIL ---------- */
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Thanks for contacting us",
      html: `<p>${aiReply}</p>`,
    });

    /* ---------- RESPONSE ---------- */
    res.status(201).json({
      success: true,
      qualification,
      message: "Lead processed successfully",
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
