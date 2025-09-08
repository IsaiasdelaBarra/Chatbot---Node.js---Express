//Lecto de PDF y Word.

import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { loadDocuments, getLaws } from "./loaders/parseDocs.js";

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
        contenido: text.replace(/\s+/g, " ").trim()
      });
    } catch (err) {
      console.error(`Error leyendo ${file}:`, err);
    }
  }

  return documents;
}

// Formato para el listado de las leyes


export function getLaws(documents, leyEspecifica = null) {
  // Combinar todos los documentos en un solo string
  const allText = documents.map(d => d.contenido).join(" ");

  // Separar las leyes usando regex: detecta "Ley <número> (...) :"
  const regex = /(Ley\s+\d+\.\d+\s*\([^)]+\):\s*.*?)(?=Ley\s+\d+\.|$)/g;
  const leyes = allText.match(regex)?.map(l => l.trim()) || [];

  if (!leyes.length) return "No se encontraron leyes en los documentos.";

  if (leyEspecifica) {
    // Buscar la ley específica por número o palabra clave
    const encontrada = leyes.find(l => l.toLowerCase().includes(leyEspecifica.toLowerCase()));
    return encontrada || `No se encontró la ley "${leyEspecifica}".`;
  } else {
    // Devolver todas las leyes separadas por un salto de línea
    return leyes.join("\n\n");
  }
}

