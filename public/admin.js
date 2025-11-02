// Valores por defecto
const DEFAULT_SETTINGS = {
    "theme": 'light',
    "--accent": '#6c2bd9',
    "--bubble-bot-light": '#eaeaea',
    "--bubble-user": '#955cca' // Color de burbuja de usuario por defecto
};

const themeBtns = document.querySelectorAll(".theme-option");
const accentColorBtns = document.querySelectorAll("#accent-color-options .color-option-border");
const botMsgColorBtns = document.querySelectorAll("#bot-message-options .color-option-border");
const userMsgColorBtns = document.querySelectorAll("#user-message-options .color-option-border");
const resetButton = document.getElementById("reset-defaults-btn"); 
const logoutBtn = document.getElementById("logout-btn"); // Obtener el botón de salir de la sidebar
const previewContainer = document.querySelector('.preview-app-container'); // Contenedor de la vista previa

// Función simple para oscurecer un color hexadecimal
function darkenColor(hex, percent) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    r = Math.floor(Math.max(0, r - (r * percent / 100)));
    g = Math.floor(Math.max(0, g - (g * percent / 100)));
    b = Math.floor(Math.max(0, b - (b * percent / 100)));

    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Función para aplicar color y guardar
function applyColor(variable, color) {
    // Aplicar a la raíz del documento (para estilos globales)
    document.documentElement.style.setProperty(variable, color);
    
    // Aplicar al contenedor de la vista previa para sincronización inmediata
    if (previewContainer) {
        previewContainer.style.setProperty(variable, color);
    }
    
    localStorage.setItem(variable, color);
    
    if (variable === '--accent') {
        // Manejar el color secundario para el acento
        const secondaryColor = darkenColor(color, 10); 
        document.documentElement.style.setProperty('--accent-secondary', secondaryColor);
        if (previewContainer) {
            previewContainer.style.setProperty('--accent-secondary', secondaryColor);
        }
        localStorage.setItem('--accent-secondary', secondaryColor);
        
        // Aplicar a elementos fuera de la preview pero que usan --accent (ej. sidebar)
        document.querySelector('.sidebar').style.backgroundColor = color;
    }
    
    // Si la variable es de mensaje de bot (light), también calculamos y aplicamos la dark
    if (variable === '--bubble-bot-light') {
        const darkColor = darkenColor(color, 20);
        
        // Aplicar a la raíz del documento
        document.documentElement.style.setProperty('--bubble-bot-dark', darkColor);
        
        // Aplicar al contenedor de la vista previa
        if (previewContainer) {
            previewContainer.style.setProperty('--bubble-bot-dark', darkColor);
        }
        localStorage.setItem('--bubble-bot-dark', darkColor);
    }
}

// Función para restablecer
function resetToDefaults() {
    // 1. Limpiar Local Storage de las configuraciones específicas
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        localStorage.removeItem(key);
    });
    localStorage.removeItem("--accent-secondary");
    localStorage.removeItem("--bubble-bot-dark");
    
    // 2. Aplicar los valores por defecto
    loadSettings();
    
    alert("Configuración restablecida a valores predeterminados.");
}


// --- Aplicar configuración guardada y estado activo ---
function loadSettings() {
    // 1. Aplicar Tema
    const savedTheme = localStorage.getItem("theme") || DEFAULT_SETTINGS.theme;
    document.body.dataset.theme = savedTheme;
    themeBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === savedTheme);
    });

    // 2. Aplicar Color de Acento
    const savedAccent = localStorage.getItem("--accent") || DEFAULT_SETTINGS["--accent"];
    applyColor('--accent', savedAccent);
    accentColorBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.color === savedAccent);
    });

    // 3. Aplicar Color de Mensajes del Bot (Claro/Principal)
    const savedBotColor = localStorage.getItem("--bubble-bot-light") || DEFAULT_SETTINGS["--bubble-bot-light"];
    // applyColor para --bubble-bot-light se encarga de calcular y aplicar --bubble-bot-dark
    applyColor('--bubble-bot-light', savedBotColor);
    botMsgColorBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.color === savedBotColor);
    });
    
    // 4. Aplicar Color de Mensajes de Usuario
    const savedUserColor = localStorage.getItem("--bubble-user") || DEFAULT_SETTINGS["--bubble-user"];
    applyColor('--bubble-user', savedUserColor);
    userMsgColorBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.color === savedUserColor);
    });
}


// --- Event Listeners ---

// Cambiar tema
themeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        themeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const theme = btn.dataset.theme;
        document.body.dataset.theme = theme;
        localStorage.setItem("theme", theme);
        
        // Recargar settings para que se aplique correctamente --bubble-bot-dark
        loadSettings(); 
    });
});

// Cambiar color acento
accentColorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        accentColorBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        applyColor(btn.dataset.variable, btn.dataset.color);
    });
});

// Cambiar color mensajes del bot
botMsgColorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        botMsgColorBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const color = btn.dataset.color;
        // applyColor se encarga de aplicar --bubble-bot-light y --bubble-bot-dark
        applyColor('--bubble-bot-light', color); 
    });
});

// Cambiar color mensajes de usuario
userMsgColorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        userMsgColorBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        applyColor(btn.dataset.variable, btn.dataset.color);
    });
});

// Event Listener para el botón de restablecer
resetButton.addEventListener("click", resetToDefaults);

// --- Funcionalidad del botón de Salir (Volver atrás) ---
logoutBtn.addEventListener("click", () => {
    // Guardar los cambios (ya están guardados por applyColor) y redirigir
    // La redirección simula la salida y la aplicación final de los cambios.
    alert("Configuración de apariencia aplicada y saliendo del panel de administración.");
    window.location.href = "index.html"; 
});

// Cargar la configuración al inicio
loadSettings();
