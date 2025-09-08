const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");
const chatbot = document.querySelector(".chatbot-container");
const whatsappBtn = document.getElementById("whatsapp-btn");

let chatInitialized = false;
let waitingForOption = false;

// -------------------- Envío de mensajes --------------------
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  // Detectamos si el usuario quiere opciones de asesor o leyes
  if (/asesor/i.test(text)) {
    showAdvisorOptions();
    return;
  }

  if (/leyes|ley/i.test(text)) {
    waitingForOption = true;
    showLawsOptions();
    return;
  }

  // Respuesta normal de la IA
  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      // Para testing sin API Key, mostramos el mensaje de error y salimos
      throw new Error("API key no válida o suspendida");
    }

    const data = await response.json();
    addMessage(data.reply, "bot");
  } catch (err) {
    console.error(err);
    // Mensaje de prueba si la API Key no está habilitada
    addMessage(
      "❌ Problemas al contactarse con la IA (mensaje de prueba sin API Key)",
      "bot"
    );
  } finally {
    // Reiniciamos el flag para permitir futuras interacciones
    waitingForOption = false;
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

chatbot.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - chatbot.getBoundingClientRect().left;
  offsetY = e.clientY - chatbot.getBoundingClientRect().top;
  chatbot.style.cursor = "grabbing";
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
  chatbot.style.cursor = "grab";
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
  if (!chatWindow) return;
  addMessage(
    "¡Hola! 👋 Bienvenido al AgroBot del Ministerio de Agricultura. ¿Qué deseas hacer?",
    "bot"
  );
}

// -------------------- Opciones de asesor --------------------
function showAdvisorOptions() {
  waitingForOption = true;

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "chat-options";

  const optWhatsapp = document.createElement("div");
  optWhatsapp.className = "chat-option";
  optWhatsapp.textContent = "📲 Contactate con un asesor por Whatsapp";
  optWhatsapp.addEventListener("click", () => {
    window.open("https://wa.me/549XXXXXXXXXX", "_blank");
    waitingForOption = false;
    optionsContainer.remove();
  });

  optionsContainer.appendChild(optWhatsapp);
  chatWindow.appendChild(optionsContainer);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// -------------------- Opciones de leyes --------------------
// Pregunta si quiere una ley o todas
async function showLawsOptions() {
  addMessage("¿Deseas consultar una ley en particular o todas las leyes?", "bot");

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "chat-options";

  // Botón "Una ley específica"
  const oneOption = document.createElement("div");
  oneOption.className = "chat-option";
  oneOption.textContent = "Una ley específica";

  oneOption.addEventListener("click", () => {
    optionsContainer.remove();
    addMessage("¿Cuál ley desearías consultar? Escribe el título o número de la ley:", "bot");

    // Activamos flag para que el siguiente mensaje del usuario sea interpretado como ley
    waitingForOption = "specificLaw";
  });

  // Botón "Todas las leyes"
  const allOption = document.createElement("div");
  allOption.className = "chat-option";
  allOption.textContent = "Todas las leyes";

  allOption.addEventListener("click", async () => {
    optionsContainer.remove();
    try {
      const res = await fetch("/api/leyes/todas");
      const allLaws = await res.json();

      if (!allLaws.length) {
        addMessage("No se encontraron leyes 📂", "bot");
        return;
      }

      let allContent = "";
      allLaws.forEach(ley => {
        allContent += `<b>${ley.titulo}</b>: ${ley.contenido.replace(/\n/g,"<br>")}<br><br>`;
      });

      addMessage(allContent, "bot");
    } catch (err) {
      console.error(err);
      addMessage("❌ Hubo un problema al cargar las leyes.", "bot");
    }
  });

  optionsContainer.appendChild(oneOption);
  optionsContainer.appendChild(allOption);
  chatWindow.appendChild(optionsContainer);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}



// -------------------- Acciones de botones --------------------

document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById("refreshChat");
  const closeBtn = document.getElementById("closeChat");
  const chatContainer = document.getElementById("chatbot");

  // Refrescar
  refreshBtn.addEventListener("click", () => {
    chatWindow.innerHTML = ""; // 👈 limpiamos el contenedor correcto
    showWelcomeMessage(); // 👈 mostramos el mensaje de inicio
  });

  // Minimizar
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
