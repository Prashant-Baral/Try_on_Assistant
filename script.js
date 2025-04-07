// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const startCameraButton = document.getElementById('start-camera');
const userVideo = document.getElementById('user-video');
const overlayCanvas = document.getElementById('overlay-canvas');
const ctx = overlayCanvas.getContext('2d');
const cameraStatus = document.querySelector('.camera-status');

// Global Variables
let currentStream = null;
let currentMode = null; // 'makeup' or 'clothes'
let currentOverlay = null;
let savedLooks = [];
let isProcessing = false;
let availableCameras = [];
let currentCameraIndex = 0;
let currentZoom = 1;
let isFlipped = false;

// L'Oreal Modiface API Configuration
const MODIFACE_API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
const MODIFACE_API_ENDPOINT = 'https://api.modiface.com/v1';

// Chatbot State
const chatbotState = {
    currentContext: null,
    lastIntent: null,
    userPreferences: {
        skinTone: null,
        stylePreference: null,
        occasion: null
    }
};

// Initialize the chatbot
function init() {
    setupEventListeners();
    loadSavedLooks();
    showWelcomeMessage();
    setupCameraControls();
    checkCameraPermissions();
}

// Check camera permissions
async function checkCameraPermissions() {
    try {
        const result = await navigator.permissions.query({ name: 'camera' });
        if (result.state === 'granted') {
            updateCameraStatus('Camera permission granted');
        } else if (result.state === 'prompt') {
            updateCameraStatus('Camera permission needed');
        } else {
            updateCameraStatus('Camera permission denied');
        }
    } catch (error) {
        console.error('Error checking camera permissions:', error);
        updateCameraStatus('Camera permission check failed');
    }
}

// Update camera status display
function updateCameraStatus(message) {
    const statusDot = cameraStatus.querySelector('.status-dot');
    const statusText = cameraStatus.querySelector('span:not(.status-dot)');
    
    if (message.includes('granted') || message.includes('ready')) {
        statusDot.classList.add('active');
        statusText.textContent = 'Camera Ready';
    } else if (message.includes('needed')) {
        statusDot.classList.remove('active');
        statusText.textContent = 'Camera Permission Needed';
    } else if (message.includes('denied')) {
        statusDot.classList.remove('active');
        statusText.textContent = 'Camera Permission Denied';
    } else if (message.includes('error')) {
        statusDot.classList.remove('active');
        statusText.textContent = 'Camera Error';
    }
}

// Show welcome message
function showWelcomeMessage() {
    const welcomeMessage = {
        text: "Hello! I'm your Virtual Try-On Assistant powered by L'Oreal Modiface. I can help you try on makeup and clothes virtually. What would you like to try today?",
        options: ["Try Makeup", "Try Clothes", "View Saved Looks"]
    };
    addBotMessage(welcomeMessage);
}

// Add message to chat
function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    if (typeof message === 'string') {
        messageDiv.textContent = message;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">${message.text}</div>
            ${message.options ? `
                <div class="message-options">
                    ${message.options.map(option => `
                        <button class="option-btn" onclick="handleOptionClick('${option}')">${option}</button>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(message) {
    addMessage(message, true);
}

function addBotMessage(message) {
    addMessage(message, false);
}

// Handle user input
async function handleUserInput() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    isProcessing = true;
    addUserMessage(message);
    userInput.value = '';

    try {
        const response = await processUserMessage(message);
        addBotMessage(response);
    } catch (error) {
        console.error('Error processing message:', error);
        addBotMessage("I'm sorry, I encountered an error. Please try again.");
    } finally {
        isProcessing = false;
    }
}

// Process user message using natural language processing
async function processUserMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Basic intent recognition
    if (lowerMessage.includes('makeup') || lowerMessage.includes('cosmetics')) {
        return handleMakeupIntent(message);
    } else if (lowerMessage.includes('clothes') || lowerMessage.includes('outfit')) {
        return handleClothesIntent(message);
    } else if (lowerMessage.includes('save') || lowerMessage.includes('store')) {
        return handleSaveIntent();
    } else if (lowerMessage.includes('clear') || lowerMessage.includes('remove')) {
        return handleClearIntent();
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
        return handleHelpIntent();
    } else if (lowerMessage.includes('camera') || lowerMessage.includes('start') || lowerMessage.includes('stop')) {
        return handleCameraIntent(message);
    } else {
        return {
            text: "I'm not sure I understand. Would you like to try on makeup or clothes? You can also ask for help!",
            options: ["Try Makeup", "Try Clothes", "Help"]
        };
    }
}

// Handle camera-related intents
function handleCameraIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('start') || lowerMessage.includes('turn on')) {
        startCamera();
        return "Starting the camera for you. You should see your video feed shortly.";
    } else if (lowerMessage.includes('stop') || lowerMessage.includes('turn off')) {
        stopCamera();
        return "Camera stopped. You can start it again when you're ready.";
    } else if (lowerMessage.includes('switch') || lowerMessage.includes('change')) {
        switchCamera();
        return "Switching to the next available camera.";
    } else if (lowerMessage.includes('flip') || lowerMessage.includes('mirror')) {
        flipCamera();
        return "Flipping the camera view.";
    } else if (lowerMessage.includes('zoom')) {
        if (lowerMessage.includes('in')) {
            adjustZoom(0.1);
            return "Zooming in.";
        } else if (lowerMessage.includes('out')) {
            adjustZoom(-0.1);
            return "Zooming out.";
        }
    } else {
        return "I can help you with the camera. You can ask me to start, stop, switch, flip, or zoom the camera.";
    }
}

// Handle makeup-related intents
async function handleMakeupIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('lipstick') || lowerMessage.includes('lips')) {
        return await applyMakeupStyle('lipstick');
    } else if (lowerMessage.includes('eyes') || lowerMessage.includes('eyeshadow')) {
        return await applyMakeupStyle('eyeshadow');
    } else if (lowerMessage.includes('foundation') || lowerMessage.includes('base')) {
        return await applyMakeupStyle('foundation');
    } else {
        return {
            text: "What type of makeup would you like to try? I can help you with lipstick, eyeshadow, foundation, and more!",
            options: ["Lipstick", "Eyeshadow", "Foundation", "View All"]
        };
    }
}

// Handle clothes-related intents
async function handleClothesIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('dress') || lowerMessage.includes('gown')) {
        return await applyClothingStyle('dress');
    } else if (lowerMessage.includes('top') || lowerMessage.includes('shirt')) {
        return await applyClothingStyle('top');
    } else if (lowerMessage.includes('bottom') || lowerMessage.includes('pants')) {
        return await applyClothingStyle('bottom');
    } else {
        return {
            text: "What type of clothing would you like to try? I can help you with dresses, tops, bottoms, and more!",
            options: ["Dresses", "Tops", "Bottoms", "View All"]
        };
    }
}

// Apply makeup style using Modiface API
async function applyMakeupStyle(style) {
    try {
        const response = await fetch(`${MODIFACE_API_ENDPOINT}/makeup/${style}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MODIFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: await captureCurrentFrame(),
                style: style,
                preferences: chatbotState.userPreferences
            })
        });

        if (!response.ok) throw new Error('Failed to apply makeup style');

        const result = await response.json();
        applyOverlay(result.overlay);
        
        return {
            text: `I've applied the ${style} style. How does it look? You can try different variations or ask me to adjust it.`,
            options: ["Try Another Style", "Adjust Current", "Save Look"]
        };
    } catch (error) {
        console.error('Error applying makeup:', error);
        return "I'm sorry, I couldn't apply the makeup style. Please try again.";
    }
}

// Apply clothing style using Modiface API
async function applyClothingStyle(style) {
    try {
        const response = await fetch(`${MODIFACE_API_ENDPOINT}/clothing/${style}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MODIFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: await captureCurrentFrame(),
                style: style,
                preferences: chatbotState.userPreferences
            })
        });

        if (!response.ok) throw new Error('Failed to apply clothing style');

        const result = await response.json();
        applyOverlay(result.overlay);
        
        return {
            text: `I've applied the ${style} style. How does it look? You can try different variations or ask me to adjust it.`,
            options: ["Try Another Style", "Adjust Current", "Save Look"]
        };
    } catch (error) {
        console.error('Error applying clothing:', error);
        return "I'm sorry, I couldn't apply the clothing style. Please try again.";
    }
}

// Capture current frame from video
async function captureCurrentFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = userVideo.videoWidth;
    canvas.height = userVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(userVideo, 0, 0);
    return canvas.toDataURL('image/jpeg');
}

// Apply overlay to canvas
function applyOverlay(overlayData) {
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        ctx.drawImage(img, 0, 0, overlayCanvas.width, overlayCanvas.height);
        currentOverlay = overlayData;
    };
    img.src = overlayData;
}

// Handle option clicks
function handleOptionClick(option) {
    userInput.value = option;
    handleUserInput();
}

// Setup camera controls
function setupCameraControls() {
    // Create camera controls container
    const cameraControls = document.createElement('div');
    cameraControls.className = 'camera-controls';
    cameraControls.innerHTML = `
        <button id="switch-camera" class="camera-btn" title="Switch Camera">
            <i class="fas fa-sync-alt"></i>
        </button>
        <button id="zoom-in" class="camera-btn" title="Zoom In">
            <i class="fas fa-search-plus"></i>
        </button>
        <button id="zoom-out" class="camera-btn" title="Zoom Out">
            <i class="fas fa-search-minus"></i>
        </button>
        <button id="flip-camera" class="camera-btn" title="Flip Camera">
            <i class="fas fa-undo"></i>
        </button>
    `;
    
    // Add camera controls to video container
    document.querySelector('.video-container').appendChild(cameraControls);
    
    // Add event listeners for camera controls
    document.getElementById('switch-camera').addEventListener('click', switchCamera);
    document.getElementById('zoom-in').addEventListener('click', () => adjustZoom(0.1));
    document.getElementById('zoom-out').addEventListener('click', () => adjustZoom(-0.1));
    document.getElementById('flip-camera').addEventListener('click', flipCamera);
}

// Switch between available cameras
async function switchCamera() {
    try {
        // Get list of available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        if (availableCameras.length <= 1) {
            addBotMessage("No additional cameras found.");
            return;
        }
        
        // Switch to next camera
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        
        // Stop current stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        // Start new stream
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: availableCameras[currentCameraIndex].deviceId }
            }
        });
        
        userVideo.srcObject = newStream;
        currentStream = newStream;
        
        addBotMessage(`Switched to camera ${currentCameraIndex + 1} of ${availableCameras.length}`);
    } catch (error) {
        console.error('Error switching camera:', error);
        addBotMessage("Sorry, I couldn't switch the camera. Please try again.");
    }
}

// Adjust zoom level
function adjustZoom(delta) {
    currentZoom = Math.max(1, Math.min(3, currentZoom + delta));
    userVideo.style.transform = `scale(${currentZoom})`;
    addBotMessage(`Zoom level: ${currentZoom.toFixed(1)}x`);
}

// Flip camera view
function flipCamera() {
    isFlipped = !isFlipped;
    userVideo.style.transform = `scaleX(${isFlipped ? -1 : 1}) scale(${currentZoom})`;
    addBotMessage(`Camera view ${isFlipped ? 'flipped' : 'normal'}`);
}

// Event Listeners
function setupEventListeners() {
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

    startCameraButton.addEventListener('click', () => {
        if (currentStream) {
            stopCamera();
        } else {
            startCamera();
        }
    });

    // Add event listener for photo upload
    document.getElementById('upload-photo').addEventListener('click', handlePhotoUpload);
    
    // Add event listener for clear overlay
    document.getElementById('clear-overlay').addEventListener('click', clearOverlay);
    
    // Add event listener for save look
    document.getElementById('save-look').addEventListener('click', saveLook);
    
    // Add event listener for share look
    document.getElementById('share-look').addEventListener('click', shareLook);
    
    // Add event listeners for filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Filter functionality would go here
        });
    });
}

// Handle photo upload
function handlePhotoUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Stop camera if running
                    if (currentStream) {
                        stopCamera();
                    }
                    
                    // Draw image on canvas
                    overlayCanvas.width = img.width;
                    overlayCanvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Apply overlay if exists
                    if (currentOverlay) {
                        applyOverlay(currentOverlay);
                    }
                    
                    addBotMessage("Photo uploaded successfully! You can now try on makeup or clothes.");
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading photo:', error);
            addBotMessage("Sorry, I couldn't upload your photo. Please try again.");
        }
    };
    
    input.click();
}

// Clear overlay
function clearOverlay() {
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    currentOverlay = null;
    addBotMessage("Overlay cleared. You can try a new style now!");
}

// Save look
function saveLook() {
    if (!currentOverlay) {
        addBotMessage("There's nothing to save right now. Try applying a style first!");
        return;
    }
    
    const look = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        overlay: currentOverlay,
        mode: currentMode
    };
    
    savedLooks.push(look);
    localStorage.setItem('savedLooks', JSON.stringify(savedLooks));
    
    addBotMessage("Look saved successfully! You can view it in your saved looks.");
}

// Load saved looks
function loadSavedLooks() {
    const saved = localStorage.getItem('savedLooks');
    if (saved) {
        savedLooks = JSON.parse(saved);
    }
}

// Share look
function shareLook() {
    if (!currentOverlay) {
        addBotMessage("There's nothing to share right now. Try applying a style first!");
        return;
    }
    
    // In a real app, this would generate a shareable link
    const shareUrl = `${window.location.origin}${window.location.pathname}?look=${btoa(JSON.stringify(currentOverlay))}`;
    
    addBotMessage({
        text: `Here's your shareable link: ${shareUrl}`,
        options: ["Copy Link"]
    });
}

// Camera Controls
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        });
        
        userVideo.srcObject = stream;
        currentStream = stream;
        startCameraButton.textContent = 'Stop Camera';
        startCameraButton.classList.add('active');
        
        // Set canvas dimensions to match video
        overlayCanvas.width = userVideo.videoWidth;
        overlayCanvas.height = userVideo.videoHeight;
        
        updateCameraStatus('Camera Ready');
        addBotMessage("Camera started! You can now try on makeup and clothes.");
    } catch (error) {
        console.error('Error accessing camera:', error);
        updateCameraStatus('Camera Error');
        addBotMessage("I'm sorry, I couldn't access your camera. Please make sure you've granted camera permissions.");
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        userVideo.srcObject = null;
        currentStream = null;
        startCameraButton.textContent = 'Start Camera';
        startCameraButton.classList.remove('active');
        updateCameraStatus('Camera Stopped');
        addBotMessage("Camera stopped.");
    }
}

// Handle help intent
function handleHelpIntent() {
    return {
        text: "I can help you try on makeup and clothes virtually. Here are some things you can ask me:",
        options: [
            "Start Camera",
            "Try Makeup",
            "Try Clothes",
            "Save Look",
            "Share Look"
        ]
    };
}

// Handle save intent
function handleSaveIntent() {
    if (!currentOverlay) {
        return "There's nothing to save right now. Try applying a style first!";
    }
    
    saveLook();
    return "Look saved successfully! You can view it in your saved looks.";
}

// Handle clear intent
function handleClearIntent() {
    clearOverlay();
    return "Overlay cleared. You can try a new style now!";
}

// Initialize the application
window.addEventListener('load', init); 