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

const PORT = process.env.PORT || 3000;

/* ------------------ CLIENTS ------------------ */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/* ------------------ HEALTH ------------------ */

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server running" });
});

/* ------------------ CREATE LEAD ------------------ */

app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // FREE qualification logic
    const text = message.toLowerCase();
    let qualification = "WARM";

    if (text.includes("automation") || text.includes("business")) {
      qualification = "HOT";
    }

    const aiReply = `
Hi ${name},

Thanks for reaching out!  
We received your message and will contact you shortly.

– Team
`.trim();

    // ✅ INSERT INTO SUPABASE (NO NULLS)
    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        qualification,
        ai_reply: aiReply
      }
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database insert failed" });
    }

    // ✅ SEND EMAIL
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "We received your message",
      html: `<p>${aiReply.replace(/\n/g, "<br>")}</p>`
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------ FETCH LEADS ------------------ */

app.get("/api/leads", async (req, res) => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json([]);
  }

  res.json(data);
});

/* ------------------ START ------------------ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
