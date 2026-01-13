import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (IMPORTANT for Railway)
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Example AI endpoint
app.post("/api/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is missing"
      });
    }

    // ✅ Create OpenAI client INSIDE the request
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: prompt }
      ]
    });

    res.json({
      success: true,
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
});

// Railway PORT handling
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
