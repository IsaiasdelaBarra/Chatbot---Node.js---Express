import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { loadDocuments, getLaws } from "./loaders/parseDocs.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

let cachedDocs = [];
(async () => {
  cachedDocs = await loadDocuments();
  console.log(`Documentos legales cargados: ${cachedDocs.length}`);
})();

// ENDPOINT CHAT
app.post("/chat", async (req, res) => {
  try {
    // Verificamos si la API Key está definida
    if (!process.env.API_KEY) {
      return res.status(401).json({ reply: "❌ Problemas al contactarse con la IA (API Key no habilitada)" });
    }

    // Aquí iría tu lógica real de llamar a Gemini, por ejemplo:
    // const userMessage = req.body.message;
    // const iaResponse = await callGeminiAPI(userMessage);
    // res.json({ reply: iaResponse });

  } catch (err) {
    console.error("Error en /chat:", err);
    res.status(500).json({ reply: "❌ Problemas al contactarse con la IA" });
  }
});

// ENDPOINTS LEYES
app.get("/api/leyes", (req, res) => {
  try {
    if (!cachedDocs.length) return res.json([]);

    const allLaws = getLaws(cachedDocs).split("\n\n");
    const titles = allLaws.map(l => {
      const match = l.match(/Ley\s+\d+\.\d+\s*\([^)]+\)/);
      return match ? match[0] : "Ley desconocida";
    });

    res.json(titles);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});


app.get("/api/leyes/:titulo", (req, res) => {
  const { titulo } = req.params;

  // Busca la ley específica usando getLaws
  const ley = getLaws(cachedDocs, titulo);

  if (ley) {
    res.json({ titulo, contenido: ley });
  } else {
    res.status(404).json({ error: "Ley no encontrada" });
  }
});

// ENDPOINT TODAS LAS LEYES
app.get("/api/leyes/todas", (req, res) => {
  try {
    if (!cachedDocs.length) return res.status(200).json([]);

    const allLaws = getLaws(cachedDocs).split("\n\n");
    const formattedLaws = allLaws.map(l => {
      const match = l.match(/Ley\s+\d+\.\d+\s*\([^)]+\)/);
      const titulo = match ? match[0] : "Ley desconocida";
      return { titulo, contenido: l };
    });

    res.json(formattedLaws);
  } catch (err) {
    console.error("Error en /api/leyes/todas:", err);
    res.status(500).json({ error: "No se pudieron cargar las leyes" });
  }
});

// SERVIR FRONTEND
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// LEVANTAR SERVIDOR
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
