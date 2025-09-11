const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");
const chatbot = document.querySelector(".chatbot-container");
const whatsappBtn = document.getElementById("whatsapp-btn");

let chatInitialized = false;
let waitingForLawOption = false; // Esperando que el usuario elija "una ley específica" o "todas"
let waitingForLawInput = false;  // Esperando que escriba el número/título de la ley

// -------------------- Envío de mensajes --------------------
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  // ⚡ Si estamos esperando que el usuario escriba el número/título de la ley
  if (waitingForLawInput) {
    waitingForLawInput = false;
    await fetchSpecificLaw(text);
    return;
  }

  // Asesor
  if (/asesor/i.test(text)) {
    showAdvisorOptions();
    return;
  }

  // Leyes: solo palabras clave "ley" o "leyes"
  if (/^ley(es)?$/i.test(text)) {
    waitingForLawOption = true;
    showLawsChoice();
    return;
  }

  // Ley específica: detecta "Ley 27.118" o "Ley 27118"
  const leyMatch = text.match(/ley\s+(\d+\.?\d*)/i);
  if (leyMatch) {
    await fetchSpecificLaw(leyMatch[1]);
    return;
  }

  // Respuesta normal de la IA
  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) throw new Error("API key no válida o suspendida");

    const data = await response.json();
    addMessage(data.reply, "bot");
  } catch (err) {
    console.error(err);
    addMessage(
      "❌ Problemas al contactarse con la IA (mensaje de prueba sin API Key)",
      "bot"
    );
  }
}

// -------------------- Función para agregar mensajes --------------------
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = text;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// -------------------- Drag del chat --------------------
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

// Seleccionamos el header
const header = document.querySelector(".chatbot-header");

// Inicia arrastre solo desde el header
header.addEventListener("mousedown", (e) => {
  isDragging = true;
  const rect = chatbot.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  header.style.cursor = "grabbing"; // cursor mientras arrastramos
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  chatbot.style.left = e.clientX - offsetX + "px";
  chatbot.style.top = e.clientY - offsetY + "px";
  chatbot.style.bottom = "auto";
  chatbot.style.right = "auto";
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  header.style.cursor = "grab"; // vuelve a grab cuando soltamos
});

// -------------------- Botón de WhatsApp --------------------
if (whatsappBtn && chatbot) {
  whatsappBtn.addEventListener("click", () => {
    chatbot.classList.toggle("is-open");

    if (!chatInitialized && chatbot.classList.contains("is-open")) {
      showWelcomeMessage();
      chatInitialized = true;
    }
  });
} else {
  console.error("[chat] Falta whatsappBtn o chatbot en el DOM.");
}

// -------------------- Mensaje de bienvenida --------------------
function showWelcomeMessage() {
  addMessage(
    "¡Hola! 👋 Bienvenido al AgroBot del Ministerio de Agricultura. ¿Qué deseas hacer?",
    "bot"
  );
}

// -------------------- Opciones de asesor --------------------
function showAdvisorOptions() {
  const optionsContainer = document.createElement("div");
  optionsContainer.className = "chat-options";

  const optWhatsapp = document.createElement("div");
  optWhatsapp.className = "chat-option";
  optWhatsapp.textContent = "📲 Contactate con un asesor por Whatsapp";
  optWhatsapp.addEventListener("click", () => {
    window.open("https://wa.me/549XXXXXXXXXX", "_blank");
    optionsContainer.remove();
  });

  optionsContainer.appendChild(optWhatsapp);
  chatWindow.appendChild(optionsContainer);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// -------------------- Opciones de leyes --------------------
function showLawsChoice() {
  const optionsContainer = document.createElement("div");
  optionsContainer.className = "chat-options";

  const oneOption = document.createElement("div");
  oneOption.className = "chat-option";
  oneOption.textContent = "Una ley específica";
  oneOption.addEventListener("click", () => {
    optionsContainer.remove();
    waitingForLawOption = false;
    waitingForLawInput = true;
    addMessage("📝 Escribí el número o título de la ley que deseas consultar:", "bot");
  });

  const allOption = document.createElement("div");
  allOption.className = "chat-option";
  allOption.textContent = "Todas las leyes";
  allOption.addEventListener("click", async () => {
    optionsContainer.remove();
    waitingForLawOption = false;
    await fetchAllLaws();
  });

  optionsContainer.appendChild(oneOption);
  optionsContainer.appendChild(allOption);
  chatWindow.appendChild(optionsContainer);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// -------------------- Funciones de leyes --------------------
async function fetchAllLaws() {
  try {
    const res = await fetch("/api/leyes/todas");
    const allLaws = await res.json();

    if (!allLaws.length) {
      addMessage("📂 No se encontraron leyes.", "bot");
      return;
    }

    let allContent = "";
    allLaws.forEach((ley) => {
      allContent += `<b>${ley.titulo}</b>: ${ley.contenido.replace(/\n/g, "<br>")}<br><br>`;
    });

    addMessage(allContent, "bot");
  } catch (err) {
    console.error(err);
    addMessage("❌ Hubo un problema al cargar las leyes.", "bot");
  }
}

async function fetchSpecificLaw(titulo) {
  try {
    const res = await fetch(`/api/leyes/${encodeURIComponent(titulo)}`);
    const data = await res.json();

    if (data.error) {
      addMessage(`⚠️ ${data.error}`, "bot");
    } else {
      addMessage(
        `<b>${data.titulo}</b>: ${data.contenido.replace(/\n/g, "<br>")}`,
        "bot"
      );
    }
  } catch (err) {
    console.error(err);
    addMessage("❌ Hubo un problema al consultar la ley.", "bot");
  }
}

// -------------------- Botones de refrescar y minimizar --------------------
document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById("refreshChat");
  const closeBtn = document.getElementById("closeChat");
  const chatContainer = document.getElementById("chatbot");

  refreshBtn.addEventListener("click", () => {
    chatWindow.innerHTML = "";
    showWelcomeMessage();
  });

  closeBtn.addEventListener("click", () => {
    if (!chatContainer) return;
    chatContainer.classList.remove("is-open");
  });
});

// -------------------- Envío con Enter --------------------
userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});
