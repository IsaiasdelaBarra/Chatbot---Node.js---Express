import express from "express";
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

// -------------------- ENDPOINT CHAT --------------------
app.post("/chat", async (req, res) => {
  try {
    if (!process.env.API_KEY) {
      return res
        .status(401)
        .json({ reply: "❌ Problemas al contactarse con la IA (API Key no habilitada)" });
    }

    // Aquí iría tu lógica real de llamar a la IA
    // const userMessage = req.body.message;
    // const iaResponse = await callGeminiAPI(userMessage);
    // res.json({ reply: iaResponse });

  } catch (err) {
    console.error("Error en /chat:", err);
    res.status(500).json({ reply: "❌ Problemas al contactarse con la IA" });
  }
});

// -------------------- ENDPOINT TODAS LAS LEYES --------------------
app.get("/api/leyes/todas", (req, res) => {
  try {
    if (!cachedDocs.length) return res.status(200).json([]);

    const allLaws = getLaws(cachedDocs).split("\n\n");
    const formattedLaws = allLaws.map((l) => {
      const match = l.match(/Ley\s+\d+(?:\.\d+)?\s*\([^)]+\)/);
      const titulo = match ? match[0] : "Ley desconocida";
      return { titulo, contenido: l };
    });

    res.json(formattedLaws);
  } catch (err) {
    console.error("Error en /api/leyes/todas:", err);
    res.status(500).json({ error: "No se pudieron cargar las leyes" });
  }
});

// -------------------- ENDPOINT LEY ESPECÍFICA --------------------
app.get("/api/leyes/:titulo", (req, res) => {
  const { titulo } = req.params;

  const ley = getLaws(cachedDocs, titulo);

  if (ley) {
    res.json({ titulo, contenido: ley });
  } else {
    res.status(404).json({ error: `Ley "${titulo}" no encontrada` });
  }
});

// -------------------- SERVIR FRONTEND --------------------
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------- LEVANTAR SERVIDOR --------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
