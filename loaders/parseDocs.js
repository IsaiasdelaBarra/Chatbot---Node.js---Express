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
  // Combinar todos los documentos en un solo string
  const allText = documents.map((d) => d.contenido).join(" ");

  // Regex flexible para soportar "Ley 27.118" o "Ley 27118"
  const regex =
    /(Ley\s+\d+(?:\.\d+)?\s*\([^)]+\):\s*.*?)(?=Ley\s+\d+(?:\.\d+)?\s*\(|$)/gis;

  const leyes = allText.match(regex)?.map((l) => l.trim()) || [];

  if (!leyes.length) return "No se encontraron leyes en los documentos.";

  if (leyEspecifica) {
    // Normalizamos: quitamos todo lo que no sean dígitos
    const num = leyEspecifica.replace(/\D/g, "");
    const encontrada = leyes.find((l) => l.replace(/\D/g, "").includes(num));

    return encontrada || `No se encontró la ley "${leyEspecifica}".`;
  } else {
    return leyes.join("\n\n");
  }
}
