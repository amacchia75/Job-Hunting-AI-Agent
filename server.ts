import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Job Search (SerpApi Proxy)
  app.post("/api/jobs/search", async (req, res) => {
    try {
      const { q, location } = req.body;
      const apiKey = process.env.SERPAPI_API_KEY;

      if (!apiKey || apiKey === "MY_SERPAPI_API_KEY") {
        return res.status(401).json({ error: "SerpApi key not configured" });
      }

      console.log(`Searching jobs for: ${q} in ${location}`);

      const response = await axios.get("https://serpapi.com/search", {
        params: {
          engine: "google_jobs",
          q,
          location,
          hl: "it",
          api_key: apiKey,
        },
      });

      console.log("First job apply_options:", response.data.jobs_results?.[0]?.apply_options);
      res.json(response.data);
    } catch (error: any) {
      console.error("SerpApi Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // API Route for AI Processing (Groq Proxy)
  app.post("/api/ai/process", async (req, res) => {
    try {
      const { prompt, systemPrompt, jsonMode = true, fileData } = req.body;
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey || apiKey === "MY_GROQ_API_KEY") {
        return res.status(401).json({ error: "Groq API key not configured" });
      }

      let finalPrompt = prompt;

      if (fileData) {
        // Extract text from PDF if provided
        const buffer = Buffer.from(fileData, 'base64');
        const data = await pdf(buffer);
        finalPrompt = `[TESTO ESTRATTO DAL PDF]:\n${data.text}\n\n[ISTRUZIONI]:\n${prompt}`;
      }

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalPrompt }
        ],
        response_format: jsonMode ? { type: "json_object" } : undefined,
        temperature: 0.1,
      });

      const content = response.choices[0].message.content;
      res.json(jsonMode ? JSON.parse(content || "{}") : { text: content });
    } catch (error: any) {
      console.error("Groq Error:", error.message);
      res.status(500).json({ error: "AI Processing failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
