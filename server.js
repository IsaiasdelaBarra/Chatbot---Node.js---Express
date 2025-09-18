import express from "express";
import dotenv from "dotenv";
import path from "path";
import { loadDocuments, getLaws } from "./loaders/parseDocs.js";
import fetch from "node-fetch";

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

// ------------- Prueba de Gemini ----------------

function esConsultaValida(mensaje) {
  const temasPermitidos = [
    "agricultura",
    "agro",
    "leyes",
    "subsidios",
    "cosecha",
    "ganadería",
    "silvicultura",
    "pesca",
    "rural",
    "producción",
    "alimentos",
    "exportación",
    "importación",
    "bioeconomía"
  ];

  // Convierte el mensaje a minúsculas para una comparación sin distinción de mayúsculas.
  const mensajeLowerCase = mensaje.toLowerCase();

  // Verifica si el mensaje contiene alguna de las palabras clave.
  return temasPermitidos.some(tema => mensajeLowerCase.includes(tema));
}

// ------------- Funcion de prompt ----------------------

// Agrega esta función al inicio o en un archivo de utilidades
async function callGeminiAPI(userMessage, apiKey) {
  const SYSTEM_PROMPT = `Eres un asistente virtual del Ministerio de Agricultura, Ganadería y Pesca de Argentina. 
  Tu función es proporcionar información precisa, objetiva y relevante exclusivamente sobre temas agropecuarios, leyes y regulaciones argentinas. 
  Debes responder siempre desde la perspectiva de un asesor oficial. 
  Si la pregunta no está relacionada con la agricultura, la ganadería, la pesca, la silvicultura o la bioeconomía, debes rechazarla educadamente y recordar tu propósito. 
  No opines sobre política, temas personales o cualquier asunto fuera de tu ámbito. 
  Sé conciso y claro.`;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [
        { text: SYSTEM_PROMPT },
        { text: userMessage }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error de la API de Gemini:", errorData);
        throw new Error(`Error de la API de Gemini: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extrae el texto de la respuesta.
    // La respuesta de la API puede variar, es buena práctica manejar posibles errores.
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return textResult || "No se pudo obtener una respuesta de la IA.";
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    return "❌ Problemas al contactarse con la IA. Intenta de nuevo más tarde.";
  }
}


// -------------------- ENDPOINT CHAT --------------------
app.post("/chat", async (req, res) => {
  try {

    console.log(process.env.GEMINI_API_KEY)
    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(401)
        .json({ reply: "❌ Problemas al contactarse con la IA (API Key no habilitada)" });
    }

    const userMessage = req.body.message;

    if (!esConsultaValida(userMessage)) {
      return res.status(200).json({ 
        reply: "🚫 Como asesor del Ministerio de Agricultura, solo puedo responder preguntas relacionadas con temas agropecuarios. Por favor, realiza una consulta relevante." 
      });
    }

    // **NUEVO: Llamada a la API de Gemini con el prompt configurado.**
    const iaResponse = await callGeminiAPI(userMessage, process.env.GEMINI_API_KEY);
    res.json({ reply: iaResponse });

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
