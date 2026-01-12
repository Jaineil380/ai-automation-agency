import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

/* ================== ENV CHECK ================== */
console.log("ENV CHECK");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY exists:", !!process.env.SUPABASE_ANON_KEY);
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
console.log("PORT:", process.env.PORT);
console.log("================================");

/* ================== INIT ================== */
const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/* ================== ROUTES ================== */

app.get("/", (req, res) => {
  res.send("AI Automation Agency Backend is running 🚀");
});

app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    /* ===== OpenAI ===== */
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI that qualifies business leads as HOT, WARM, or COLD and writes a professional email reply. Respond ONLY in valid JSON.",
        },
        {
          role: "user",
          content: `
Name: ${name}
Email: ${email}
Message: ${message}

Return JSON like:
{
  "qualification": "HOT | WARM | COLD",
  "reply": "Email reply text"
}
          `,
        },
      ],
    });

    let parsed;
    try {
      parsed = JSON.parse(aiResponse.choices[0].message.content);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "AI response parsing failed",
        raw: aiResponse.choices[0].message.content,
      });
    }

    const { qualification, reply } = parsed;

    /* ===== Supabase Insert ===== */
    const { error: dbError } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        qualification,
        reply,
      },
    ]);

    if (dbError) {
      console.error("Supabase Error:", dbError);
      throw dbError;
    }

    /* ===== Resend Email ===== */
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Thanks for reaching out!",
      text: reply,
    });

    return res.json({
      success: true,
      qualification,
      reply,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

/* ================== START ================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
