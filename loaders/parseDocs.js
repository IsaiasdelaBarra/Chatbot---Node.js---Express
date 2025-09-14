// Lector de PDF y Word.

import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const DOCS_DIR = path.join(process.cwd(), "documents");

export async function loadDocuments() {
  const files = fs.readdirSync(DOCS_DIR);
  const documents = [];

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const ext = path.extname(file).toLowerCase();
    let text = "";

    try {
      if (ext === ".pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        continue;
      }

      documents.push({
        titulo: path.basename(file, ext),
        contenido: text.replace(/\s+/g, " ").trim(),
      });
    } catch (err) {
      console.error(`Error leyendo ${file}:`, err);
    }
  }

  return documents;
}

// -------------------- Extracción de leyes --------------------
export function getLaws(documents, leyEspecifica = null) {
  const allText = documents.map((d) => d.contenido).join(" ");

  // Regex para extraer leyes y sus nombres
  const regex =
    /(Ley\s+\d+(?:\.\d+)?\s*\([^)]+\):\s*.*?)(?=Ley\s+\d+(?:\.\d+)?\s*\(|$)/gis;

  const leyes = allText.match(regex)?.map((l) => l.trim()) || [];
  if (!leyes.length) return "No se encontraron leyes en los documentos.";

  if (leyEspecifica) {
    const query = leyEspecifica.toLowerCase().replace(/\s+/g, " ").trim();

    // Normaliza número de ley (quita puntos y espacios)
    const numQuery = query.replace(/\D/g, "");

    // Busca por número (con/sin puntos)
    let encontrada =
      leyes.find(
        (l) =>
          l.toLowerCase().replace(/\D/g, "").includes(numQuery) &&
          numQuery.length > 0
      ) ||
      // Busca por nombre dentro del paréntesis
      leyes.find((l) => {
        const nombreMatch = l.match(/\(([^)]+)\)/);
        if (!nombreMatch) return false;
        return nombreMatch[1].toLowerCase().includes(query);
      }) ||
      // Busca por nombre en todo el texto de la ley
      leyes.find((l) => l.toLowerCase().includes(query));

    return encontrada || `No se encontró la ley "${leyEspecifica}".`;
  } else {
    return leyes.join("\n\n");
  }
}
