// --- PRO VOICE COMMANDS SCRIPT ---

let recognition;
let isRecognizing = false;

function initializeVoiceCommands(app) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition not supported by this browser.");
        document.getElementById('voice-btn').style.display = 'none'; // Hide button if not supported
        return;
    }

    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isRecognizing = true;
            document.getElementById('listening-indicator').style.opacity = '0.7';
        };

        recognition.onend = () => {
            isRecognizing = false;
            document.getElementById('listening-indicator').style.opacity = '0';
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            isRecognizing = false;
        };

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase().trim();
            console.log("Command received:", command);
            processCommand(command, app);
        };
    }

    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.onclick = () => {
        if (!isRecognizing) {
            try {
                recognition.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
                isRecognizing = false; // Reset state on error
            }
        }
    };
     document.getElementById('action-buttons').classList.remove('hidden');
}

function disableVoiceCommands() {
    if (recognition && isRecognizing) {
        recognition.stop();
    }
     document.getElementById('action-buttons').classList.add('hidden');
}


// Reusable text-to-speech function
function speak(text, callback) {
    if (!('speechSynthesis' in window)) {
        console.log("Speech synthesis not supported.");
        if (callback) callback();
        return;
    }
    speechSynthesis.cancel(); // Cancel any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
        if (callback) callback();
    };
    speechSynthesis.speak(utterance);
}

// Helper to parse day names from commands
function getDayKeyFromCommand(command) {
    const dayMap = {
        'today': new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        'tomorrow': new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
    };
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const key in dayMap) {
        if (command.includes(key)) return dayMap[key];
    }
    return dayOrder.find(day => command.includes(day));
}

// Processes the recognized voice command
function processCommand(command, app) {
    const dayKey = getDayKeyFromCommand(command);

    // Navigation Commands
    if (command.includes('dashboard')) {
        speak("Showing the dashboard.", () => app.changeTab('dashboard'));
    } else if (command.includes('calendar') || command.includes('canvas')) {
        speak("Opening your weekly calendar.", () => app.changeTab('calendar'));
    } else if (command.includes('analytics')) {
        speak("Here are your analytics.", () => app.changeTab('analytics'));
    } else if (command.includes('journal')) {
        speak("Opening your journal.", () => app.changeTab('journal'));
    } else if (command.includes('assistant')) {
        speak("How can I help you?", () => app.changeTab('assistant'));
    } else if (command.includes('settings')) {
        speak("Opening settings.", () => app.changeTab('settings'));

    // Theme Commands
    } else if (command.includes('change theme to')) {
        const themes = ['dark', 'light', 'matrix', 'sunset', 'cyberpunk', 'oceanic', 'rose gold', 'dracula', 'cosmic', 'synthwave'];
        const requestedTheme = themes.find(theme => command.includes(theme));
        if (requestedTheme) {
            app.setTheme(requestedTheme.replace(' ', '-')); // handle "rose gold"
            speak(`Theme changed to ${requestedTheme}.`);
        } else {
            speak("I couldn't find that theme. Please try again.");
        }

    // Schedule & Progress Query Commands
    } else if (command.includes("what's on my schedule for") || command.includes("what do i have on")) {
        if (dayKey) {
            const summary = app.getScheduleSummaryForDay(dayKey);
            speak(summary);
        } else {
            speak("Sorry, I didn't recognize that day.");
        }
    } else if (command.includes("what is my attendance") || command.includes("how am i doing with classes")) {
        speak(`Your class attendance is ${app.getProgressText('class')}.`);
    } else if (command.includes("what is my gym consistency") || command.includes("how am i doing with the gym")) {
        speak(`Your gym consistency is ${app.getProgressText('gym')}.`);
    
    // Action Commands
    } else if (command.startsWith('check off') || command.startsWith('check')) {
        const taskQuery = command.replace('check off', '').replace('check', '').replace(/ for .*/, '').trim();
        const targetDay = dayKey || getDayKeyFromCommand('today');
        const success = app.updateTask(taskQuery, targetDay, true);
        if (success) {
            speak(`Okay, I've checked off ${taskQuery} for ${targetDay}.`);
        } else {
            speak(`Sorry, I couldn't find ${taskQuery} on ${targetDay}'s list.`);
        }
    } else if (command.startsWith('uncheck')) {
        const taskQuery = command.replace('uncheck', '').replace(/ for .*/, '').trim();
        const targetDay = dayKey || getDayKeyFromCommand('today');
        const success = app.updateTask(taskQuery, targetDay, false);
        if (success) {
            speak(`Okay, I've unchecked ${taskQuery} for ${targetDay}.`);
        } else {
            speak(`Sorry, I couldn't find ${taskQuery} on ${targetDay}'s list.`);
        }
    } else if (command.includes('confirm progress reset')) {
        app.resetProgress(true); // Call with bypass
        speak("Your progress has been reset.");
    } else if (command.includes('reset progress')) {
        speak("This is permanent. To continue, please say 'confirm progress reset'.");
        app.showConfirmation("Reset all progress and data?", () => app.resetProgress(true));
        
    // UI & Utility Commands
    } else if (command.includes('scroll down')) {
        speak("Scrolling down.", () => app.scrollWindow(1));
    } else if (command.includes('scroll up')) {
        speak("Scrolling up.", () => app.scrollWindow(-1));
    } else if (command.includes('good morning') || command.includes('good afternoon')) {
        const todayKey = getDayKeyFromCommand('today');
        const summary = app.getScheduleSummaryForDay(todayKey);
        speak(`Good ${command.split(' ')[1]}. ${summary} Have a great day!`);
    } else if (command.includes('sign out') || command.includes('log out')) {
        speak("Signing you out. Goodbye.", () => app.signOut());

    // Fallback
    } else {
        speak("Sorry, I didn't understand that command.");
    }
}
