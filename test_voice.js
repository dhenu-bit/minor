/**
 * Comprehensive Automated Test Suite for EV Voice Assistant (ev-bot.js)
 */

const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🧪 STARTING EV VOICE ASSISTANT VALIDATION SUITE");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`✅ PASS: ${testName}`);
        testsPassed++;
    } else {
        console.error(`❌ FAIL: ${testName}`);
        testsFailed++;
    }
}

// 1. Verify all pages include ev-bot.js
const pagesDir = path.join(__dirname, 'pages');
const htmlFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

console.log(`\n📁 Checking script inclusion across ${htmlFiles.length} HTML files...`);
htmlFiles.forEach(file => {
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    const hasScript = content.includes('ev-bot.js');
    assert(hasScript, `${file} includes ev-bot.js`);
});

// 2. Set up Browser Mock Environment for Node.js
class MockClassList {
    constructor() { this.classes = new Set(); }
    add(c) { this.classes.add(c); }
    remove(c) { this.classes.delete(c); }
    toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); return this.classes.has(c); }
    contains(c) { return this.classes.has(c); }
}

class MockElement {
    constructor(tag) {
        this.tagName = tag.toUpperCase();
        this.classList = new MockClassList();
        this.children = [];
        this.attributes = {};
        this.style = {};
        this._innerHTML = "";
        this.value = "";
        this.listeners = {};
    }

    set innerHTML(val) {
        this._innerHTML = val;
        // Basic parser to discover elements with IDs
        const idMatches = val.matchAll(/id=["']([^"']+)["']/g);
        for (const m of idMatches) {
            const id = m[1];
            if (!global.elementsById[id]) {
                const el = new MockElement("div");
                el.id = id;
                global.elementsById[id] = el;
            }
        }
    }
    get innerHTML() { return this._innerHTML; }

    get innerText() {
        return this._innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    set textContent(val) { this._innerHTML = val; }
    get textContent() { return this.innerText; }

    appendChild(child) {
        this.children.push(child);
        if (child.id) global.elementsById[child.id] = child;
        return child;
    }

    addEventListener(event, handler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
    }

    trigger(event, eventObj = {}) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(h => h(eventObj));
        }
    }

    focus() {}
    closest(selector) {
        return this; // mock
    }
    querySelector(selector) {
        return new MockElement("div");
    }
}

global.elementsById = {};
const mockHead = new MockElement("head");
const mockBody = new MockElement("body");

global.window = {
    location: {
        pathname: "/pages/home.html",
        href: "http://localhost:8000/pages/home.html"
    },
    speechSynthesis: {
        speaking: false,
        spokenTexts: [],
        speak(utterance) {
            this.speaking = true;
            this.spokenTexts.push(utterance.text);
            if (utterance.onstart) utterance.onstart();
            setTimeout(() => {
                this.speaking = false;
                if (utterance.onend) utterance.onend();
            }, 10);
        },
        cancel() {
            this.speaking = false;
        },
        getVoices() {
            return [
                { name: "Google Hindi", lang: "hi-IN" },
                { name: "Google English India", lang: "en-IN" },
                { name: "Google US English", lang: "en-US" }
            ];
        }
    },
    SpeechSynthesisUtterance: function(text) {
        this.text = text;
        this.lang = "en-IN";
        this.rate = 1.0;
        this.pitch = 1.0;
    },
    SpeechRecognition: function() {
        this.lang = "en-IN";
        this.continuous = false;
        this.interimResults = true;
        this.start = function() {
            if (this.onstart) this.onstart();
        };
        this.stop = function() {
            if (this.onend) this.onend();
        };
    }
};

global.document = {
    head: mockHead,
    body: mockBody,
    createElement(tag) {
        return new MockElement(tag);
    },
    getElementById(id) {
        if (!global.elementsById[id]) {
            const el = new MockElement("div");
            el.id = id;
            global.elementsById[id] = el;
        }
        return global.elementsById[id];
    }
};

const storageMap = { "ev_wallet_balance": "1450" };
global.localStorage = {
    getItem(k) { return storageMap[k] || null; },
    setItem(k, v) { storageMap[k] = v.toString(); },
    removeItem(k) { delete storageMap[k]; }
};

// 3. Load and execute ev-bot.js
console.log("\n📦 Loading and executing ev-bot.js in sandbox...");
const evBotCode = fs.readFileSync(path.join(__dirname, 'js', 'ev-bot.js'), 'utf8');
eval(evBotCode);

// 4. Test DOM initialization
assert(typeof global.window.EVBot === 'object', "EVBot global object is registered");
assert(elementsById["evBotWindow"] !== undefined, "EV Bot Window element is created");
assert(elementsById["evBotToggleBtn"] !== undefined, "Floating Toggle button is created");
assert(elementsById["evVoiceQuickBtn"] !== undefined, "Floating Quick Voice button is created");
assert(elementsById["evBotMicBtn"] !== undefined, "Microphone button is created inside input area");
assert(elementsById["evVoiceBanner"] !== undefined, "Voice Wave visualizer banner is created");
assert(elementsById["evLangToggleBtn"] !== undefined, "Voice Language toggle button is created");
assert(elementsById["evVoiceAudioToggleBtn"] !== undefined, "Voice Audio narration toggle button is created");

// 5. Test Speech-to-Text (STT) Trigger
console.log("\n🎤 Testing Speech Recognition (STT)...");
global.window.EVBot.startListening();
assert(elementsById["evVoiceBanner"].classList.contains("active"), "Voice listening banner activates when listening starts");
assert(elementsById["evBotMicBtn"].classList.contains("listening"), "Mic button has 'listening' pulsing animation class");

global.window.EVBot.stopListening();
assert(!elementsById["evVoiceBanner"].classList.contains("active"), "Voice listening banner hides when listening stops");
assert(!elementsById["evBotMicBtn"].classList.contains("listening"), "Mic button removes 'listening' class when stopped");

// 6. Test Text-to-Speech (TTS)
console.log("\n🔊 Testing Text-to-Speech (TTS) SpeechSynthesis...");
global.window.EVBot.speak("GreenCharge Hub is 1.2 kilometers away.");
assert(global.window.speechSynthesis.spokenTexts.length > 0, "SpeechSynthesis.speak was called with audio narration");
assert(global.window.speechSynthesis.spokenTexts[0].includes("GreenCharge Hub"), "TTS spoken text contains clean station name");

// 7. Test Language Toggle
console.log("\n🌐 Testing Language Switcher...");
const initialLang = localStorage.getItem("ev_voice_lang") || "en-IN";
elementsById["evLangToggleBtn"].trigger("click");
const newLang = localStorage.getItem("ev_voice_lang");
assert(newLang !== initialLang, `Language changed successfully to: ${newLang}`);

// 8. Test Command Intents & Responses
console.log("\n🧠 Testing Voice Command Understanding & Responses...");

const testQueries = [
    { query: "Which stations are empty now?", expectedKeywords: ["GreenCharge Hub", "Torrent Green Hub", "vacant"] },
    { query: "Khali station batao", expectedKeywords: ["Vacant", "Empty"] },
    { query: "Station full hai wait time kitna hai?", expectedKeywords: ["Virtual Queue", "Bopal"] },
    { query: "Nearest fast charger?", expectedKeywords: ["1.2 km", "GreenCharge Hub"] },
    { query: "Pass ka charger", expectedKeywords: ["GreenCharge", "EcoVolt"] },
    { query: "Cost 20% to 80%?", expectedKeywords: ["₹437.40", "24.3 kWh"] },
    { query: "Kitna kharcha aayega charging ka?", expectedKeywords: ["₹437.40", "Cost"] },
    { query: "Can I charge Tata Nexon EV?", expectedKeywords: ["CCS2", "Compatible"] },
    { query: "Mera wallet balance kitna hai?", expectedKeywords: ["1450", "Wallet"] },
    { query: "Emergency roadside assistance", expectedKeywords: ["1800-384-357", "1800-EV-HELP"] },
    { query: "Ahmedabad to Surat highway trip", expectedKeywords: ["Bharuch", "265 km"] },
    { query: "Open map", expectedKeywords: ["Map", "map.html"] },
    { query: "My bookings", expectedKeywords: ["profile.html", "Profile"] },
    { query: "Find stations", expectedKeywords: ["stationFinder.html", "Station Finder"] },
    { query: "Start charging", expectedKeywords: ["charging-session.html", "Session"] },
    { query: "Settings kholo", expectedKeywords: ["settings.html", "Settings"] },
    { query: "Home page", expectedKeywords: ["home.html", "Home"] },
    { query: "Namaste", expectedKeywords: ["EV Smart Voice Assistant"] }
];

let queryIndex = 0;
function runNextQuery() {
    if (queryIndex >= testQueries.length) {
        console.log("\n==================================================");
        console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
        console.log("==================================================");
        process.exit(testsFailed > 0 ? 1 : 0);
    }

    const { query, expectedKeywords } = testQueries[queryIndex];
    queryIndex++;

    const messagesContainer = elementsById["evBotMessages"];
    const initialCount = messagesContainer.children.length;

    global.window.EVBot.respond(query);

    setTimeout(() => {
        const lastChild = messagesContainer.children[messagesContainer.children.length - 1];
        const lastText = lastChild ? (lastChild.innerHTML || lastChild._innerHTML) : "";

        let match = false;
        for (const kw of expectedKeywords) {
            if (lastText.toLowerCase().includes(kw.toLowerCase())) {
                match = true;
                break;
            }
        }

        assert(match, `Query: "${query}" -> Response matched keywords [${expectedKeywords.join(', ')}]`);
        runNextQuery();
    }, 450);
}

runNextQuery();
