import { Frame } from '@brilliantlabs/frame-sdk';

// ВСТАВЬ СЮДА СВОЙ КЛЮЧ
const GEMINI_API_KEY = "ТВОЙ_КЛЮЧ_GEMINI";
const PROMPT = "Ты решаешь тест. На картинке вопрос. Выведи ТОЛЬКО одну букву правильного ответа (А, Б, В, Г или Д). Никаких точек, скобок и пояснений. Ответ должен состоять из 1 символа.";

const connectBtn = document.getElementById('connectBtn');
const solveBtn = document.getElementById('solveBtn');
const logDiv = document.getElementById('log');

let frame = null;

function log(msg) {
    logDiv.innerText = msg + "\n" + logDiv.innerText;
}

connectBtn.addEventListener('click', async () => {
    try {
        log("[SYS] Ищу очки...");
        frame = new Frame();
        await frame.connect();
        log("[SYS] Подключено!");
        await frame.display.clear();
        await frame.display.show();
        solveBtn.disabled = false;
        connectBtn.disabled = true;
    } catch (e) {
        log(`[ОШИБКА] ${e.message}`);
    }
});

async function askGemini(base64Image) {
    const url = https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY};
    const payload = {
        contents: [{
            parts: [
                { text: PROMPT },
                { inline_data: { mime_type: "image/jpeg", data: base64Image } }
            ]
        }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 1 }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("API не отвечает");
    const data = await res.json();
    let answer = data.candidates[0].content.parts[0].text.trim().toUpperCase();
    return ["А", "Б", "В", "Г", "Д", "A", "B", "C", "D"].includes(answer) ? answer : "?";
}

function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function runProcess() {
    if (!frame) return;
    solveBtn.disabled = true;
    try {
        log("[FRAME] Делаю фото...");
        const imageBytes = await frame.camera.takePhoto();
        log(`[FRAME] Фото готово (${imageBytes.byteLength} байт)`);
        
        const base64Img = bufferToBase64(imageBytes);
        log("[API] Отправляю в Gemini...");
        
        const answer = await askGemini(base64Img);
        log(`[ОТВЕТ] ${answer}`);

        const luaCmd = `
            frame.display.text('${answer}', 320, 200, {color='white'})
            frame.display.show()
        `;
        await frame.bluetooth.sendLua(luaCmd);
        log("[FRAME] Буква на экране!");
    } catch (e) {
        log(`[ОШИБКА] ${e.message}`);
    } finally {
        solveBtn.disabled = false;
    }
}

solveBtn.addEventListener('click', runProcess);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !solveBtn.disabled) runProcess();
});
