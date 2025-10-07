document.addEventListener('DOMContentLoaded', () => {

    // -------------------- ELEMENTOS --------------------
    const mainScreen = document.getElementById('main-screen');
    const microfonoScreen = document.getElementById('microfono-screen');
    const chatScreen = document.getElementById('chat-screen');
    const btnMicrofono = document.getElementById('btn-microfono');
    const btnChat = document.getElementById('btn-chat');
    const backButton = document.getElementById('back-button');
    const menuIcon = document.getElementById('menu-icon');
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const appContainer = document.querySelector('.app-container');
    const header = document.querySelector('header');
    const handles = document.querySelectorAll('.resize-handle');
    const whatsappBtn = document.getElementById("btn-whatsapp");
    const hiAnimation = document.getElementById("hi-animation");
    const loadingAnimation = document.getElementById("loading-animation");
    const refreshButton = document.getElementById('refresh-button');
    const menuPopup = document.getElementById("menu-popup");

    const list = document.querySelector(".options-list");


    const pinNotes = document.querySelectorAll('.pin-note');
const popup = document.getElementById('pin-note-popup');
const popupMessage = document.getElementById('popup-message');
const closePopup = document.getElementById('close-popup');
const pinNotesContainer = document.querySelector('.pin-notes-container');


    let chatInitialized = false;
    let waitingForLawOption = false;
    let waitingForLawInput = false;

    // -------------------- FUNCIONES PANTALLAS --------------------
    const showScreen = (screen) => {
        mainScreen.classList.add('hidden');
        microfonoScreen.classList.add('hidden');
        chatScreen.classList.add('hidden');
        screen.classList.remove('hidden');
        menuIcon.classList.add('hidden');
        backButton.classList.remove('hidden');
        if (screen === chatScreen) {
    refreshButton.classList.remove('hidden');
} else {
    refreshButton.classList.add('hidden');
}
    };


    // ---------- Ocultar elementos y mostrar pantalla principal ----------
    const showMainScreen = () => {
        mainScreen.classList.remove('hidden');
        microfonoScreen.classList.add('hidden');
        chatScreen.classList.add('hidden');
        menuIcon.classList.remove('hidden');
        backButton.classList.add('hidden');
        refreshButton.classList.add('hidden');
        
    };

    btnMicrofono.addEventListener('click', () => showScreen(microfonoScreen));
    btnChat.addEventListener('click', () => showScreen(chatScreen));
    backButton.addEventListener('click', showMainScreen);

    // -------------------- CHAT --------------------
    const addMessage = (message, sender) => {
        const msg = document.createElement('div');
        msg.classList.add('message', sender);
        msg.innerHTML = message;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, "user");
        chatInput.value = "";
        if (hiAnimation) hiAnimation.style.display = "none";

        // Opciones de leyes
        if (waitingForLawOption) {
            addMessage("⚠️ Por favor selecciona una de las opciones antes de continuar.", "bot");
            showLawsChoice();
            return;
        }
        if (waitingForLawInput) {
            if (/otra|volver|menu/i.test(text)) {
                waitingForLawInput = false;
                showLawsChoice();
                return;
            }
            waitingForLawInput = false;
            await fetchSpecificLaw(text);
            return;
        }

        // Asesor
        if (/asesor/i.test(text)) {
            showAdvisorOptions();
            return;
        }

        // Leyes
        if (/\bley(es)?\b/i.test(text)) {
            waitingForLawOption = true;
            showLawsChoice();
            return;
        }

        const leyMatch = text.match(/ley\s+(\d+\.?\d*)/i);
        if (leyMatch) {
            await fetchSpecificLaw(leyMatch[1].replace(/\./g, ""));
            return;
        }

        // 🌟 Llamada normal a la IA
        if (loadingAnimation) loadingAnimation.style.display = "block";
        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });
            if (!response.ok) throw new Error("API key no válida o suspendida");
            const data = await response.json();
            addMessage(data.reply, "bot");
        } catch (err) {
            console.error(err);
            addMessage("❌ Problemas al contactarse con la IA.", "bot");
        } finally {
            if (loadingAnimation) loadingAnimation.style.display = "none";
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    // -------------------- LEYES Y ASESOR --------------------
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
        chatBox.appendChild(optionsContainer);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

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
            addMessage("📝 Escribí el número de la ley que deseas consultar:", "bot");
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
        chatBox.appendChild(optionsContainer);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

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
                allContent += `${ley.contenido.replace(/\n/g, "<br>")}<br><br>`;
            });
            addMessage(allContent, "bot");
        } catch (err) {
            console.error(err);
            addMessage("❌ Hubo un problema al cargar las leyes.", "bot");
        }
    }

    async function fetchSpecificLaw(titulo) {
        if (!/^\d+(\.\d+)?$/.test(titulo.trim())) {
            addMessage("⚠️ Ingresa solo el número de la ley.", "bot");
            waitingForLawInput = true;
            return;
        }
        try {
            const res = await fetch(`/api/leyes/${encodeURIComponent(titulo)}`);
            const data = await res.json();
            if (data.error) addMessage(`⚠️ ${data.error}`, "bot");
            else addMessage(`${data.contenido.replace(/\n/g, "<br>")}`, "bot");
        } catch (err) {
            console.error(err);
            addMessage("❌ Hubo un problema al consultar la ley.", "bot");
        }
    }

    // -------------------- Mensaje de bienvenida --------------------
    // -------------------- FUNCION DE MENSAJE DE BIENVENIDA --------------------
function showWelcomeMessage() {
    addMessage("🌱 ¡Hola! Soy el asistente virtual del Ministerio de Agricultura.", "bot");
    addMessage("Puedo ayudarte a:\n\n📑 Consultar leyes y normativas vigentes\n💬 Brindarte asistencia virtual sobre trámites y servicios", "bot");
    addMessage("¿Qué necesitas hoy?", "bot");
}

// -------------------- BOTON WHATSAPP DEL PRIMER MENU --------------------
if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
        // Redirige al grupo de WhatsApp directamente
        window.open("https://wa.me/549XXXXXXXXXX", "_blank");
    });
}

// -------------------- APERTURA DEL CHAT --------------------
btnChat.addEventListener('click', () => {
    showScreen(chatScreen);

    // Solo mostrar mensaje de bienvenida si aún no se inicializó el chat
    if (!chatInitialized) {
        showWelcomeMessage();
        chatInitialized = true;
    }
});








    // -------------------- REDIMENSION Y DRAG --------------------
    let isDragging = false;
    let isResizing = false;
    let activeHandle = null;

    let startMouseX, startMouseY;
    let startWidth, startHeight, startLeft, startTop;

    const minWidth = 250;
    const minHeight = 350;

    // -------------------- Drag desde header --------------------
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.resize-handle')) return;
        isDragging = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startLeft = appContainer.offsetLeft;
        startTop = appContainer.offsetTop;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        activeHandle = null;
        document.body.style.userSelect = '';
    });

    document.addEventListener('mousemove', (e) => {
        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;

        if (isDragging) {
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            const maxLeft = window.innerWidth - appContainer.offsetWidth;
            const maxTop = window.innerHeight - appContainer.offsetHeight;

            newLeft = Math.min(Math.max(0, newLeft), maxLeft);
            newTop = Math.min(Math.max(0, newTop), maxTop);

            appContainer.style.left = newLeft + 'px';
            appContainer.style.top = newTop + 'px';
        }

        if (isResizing && activeHandle) {
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            const dir = activeHandle.dataset.direction;

            if (dir.includes('right')) newWidth = Math.max(minWidth, startWidth + dx);
            if (dir.includes('left')) {
                newWidth = Math.max(minWidth, startWidth - dx);
                newLeft = startLeft + (startWidth - newWidth);
                if (newLeft < 0) {
                    newWidth += newLeft;
                    newLeft = 0;
                }
            }

            if (dir.includes('bottom')) newHeight = Math.max(minHeight, startHeight + dy);
            if (dir.includes('top')) {
                newHeight = Math.max(minHeight, startHeight - dy);
                newTop = startTop + (startHeight - newHeight);
                if (newTop < 0) {
                    newHeight += newTop;
                    newTop = 0;
                }
            }

            appContainer.style.width = newWidth + 'px';
            appContainer.style.height = newHeight + 'px';
            appContainer.style.left = newLeft + 'px';
            appContainer.style.top = newTop + 'px';
        }
    });

    // -------------------- Inicializar handles --------------------
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            activeHandle = handle;

            startMouseX = e.clientX;
            startMouseY = e.clientY;

            startWidth = appContainer.offsetWidth;
            startHeight = appContainer.offsetHeight;
            startLeft = appContainer.offsetLeft;
            startTop = appContainer.offsetTop;

            document.body.style.userSelect = 'none';
        });
    });
    
    

    // -------------------- BOTON REFRESH --------------------
    
    refreshButton.addEventListener('click', () => {
    chatBox.innerHTML = "";   // Limpiar mensajes
    chatInput.value = "";     // Limpiar input
    showWelcomeMessage();     // Opcional: mostrar mensaje de bienvenida
});

menuIcon.addEventListener("click", () => {
    menuPopup.style.display = menuPopup.style.display === "flex" ? "none" : "flex";
});



 // ---------------- Pin notes ------------------------------------



pinNotes.forEach(note => {
  note.addEventListener('click', () => {
    const message = note.getAttribute('data-message');
    popupMessage.textContent = message;
    popup.classList.remove('hidden');
  });
});

closePopup.addEventListener('click', () => {
  popup.classList.add('hidden');
});

// Cerrar popup si se hace click fuera del contenido
popup.addEventListener('click', (e) => {
  if (e.target === popup) {
    popup.classList.add('hidden');
  }
});



// ------ Grab de opciones ---


});