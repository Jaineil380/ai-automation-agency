import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ------------------ SUPABASE ------------------ */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ------------------ HEALTH CHECK ------------------ */
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

/* ------------------ SUBMIT LEAD ------------------ */
app.post("/api/lead", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const qualification = "WARM";
    const reply = "Thanks for reaching out! We’ll get back to you shortly.";

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

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* ------------------ GET LEADS (DASHBOARD) ------------------ */
app.get("/api/leads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
