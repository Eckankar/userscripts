// ==UserScript==
// @name         DR Live Translate
// @namespace    http://mathemaniac.org/
// @version      1.2.2
// @description  Live-translates subtitles on DR.dk using a LLM.
// @match        https://www.dr.dk/*
// @copyright    2025, Sebastian Paaske Tørholm
// @license      MIT
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// ==/UserScript==
/* jshint -W097 */
'use strict';

let gmc = new GM_config({
    "id": "DRLiveTranslateConfig",
    "title": "Configure DR Live Translate",
    "fields": {
        "llmProviderBase": {
            "label": "LLM Provider API base URL",
            "type": "text",
            "default": "http://localhost:1234/v1"
        },
        "llmModel": {
            "label": "LLM model used for translation",
            "type": "text",
            "default": 'gemma-3-4b-it'
        },
        "modelTemperature": {
            "label": "Temperature (for LLM)",
            "type": "float",
            "default": 0.0
        },
        "preserveDanishSubs": {
            "label": "Preserve Danish subtitles?",
            "type": 'checkbox',
            "default": true
        },
        "subtitleColorDanish": {
            "label": "Color of Danish subtitles",
            "type": "text",
            "default": "#FFFFFF"
        },
        "subtitleColorEnglish": {
            "label": "Color of English subtitles",
            "type": "text",
            "default": "#FFD78C"
        }
    }
});

GM_registerMenuCommand("Configure", (event) => {
    gmc.open();
});

const systemPrompt = `
You are a translation service.
Your job is to translate sentences, or sentence fragments, from Danish to English.
Try to preserve the original casing and formatting, as they might be partial fragments.

Give your result as a single JSON object in the following format:

{ "englishText": "English translation goes here\\nwith linebreaks if multiple lines" }
`;

async function queryLLM(model, systemPrompt, userPrompt, maxTokens=100, temperature=gmc.get('modelTemperature')) {
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const response = await fetch(gmc.get('llmProviderBase') + "/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": maxTokens,
        })
    });

    const data = await response.json();
    console.log("Response from LLM:", data);
    return data.choices[0].message.content;
}

setInterval(setupTranslation, 250);

let oldPage = "";
let lastLines = [];

function setupTranslation() {
    const newPage = document.location + "";
    if (newPage === oldPage || newPage.match(/dr.dk\/download/)) return;

    if (! unsafeWindow.hasOwnProperty('player')) return;

    const player = unsafeWindow.player;
    if (! player || ! player.player_ || ! player.isReady_) {
        return;
    }

    // player is a Video.js object

    try {
        player.on('texttrackchange', async () => {
            for (const elm of document.querySelectorAll('.vjs-text-track-cue > div')) {
                const sourceText = elm.textContent;
                if (! sourceText) continue;

                let systemPromptWithLog = systemPrompt + `

The last lines of subtitles before this one were:

${lastLines.join("\n")}
`;
                lastLines.push(sourceText);
                while (lastLines.length > 5) lastLines.shift();

                queryLLM(gmc.get('llmModel'), systemPromptWithLog, sourceText).then(
                    (response) => {
                        response = response.replace(/^\s*(?:```(?:json)?)?\s*/, "").replace(/\s*(?:```)?\s*$/, "");
                        const data = JSON.parse(response);
                        if (! data) {
                            console.log('error with response json', response, sourceText);
                            return;
                        }
                        const translatedText = data.englishText;
                        if (! translatedText) {
                            console.log('error with translated text', data, sourceText, response);
                        }

                        if (elm.textContent !== sourceText) return;

                        let parent = elm.parentNode;
                        let parent2 = parent.cloneNode(true);
                        parent2.className = parent2.className.replace(/-da/, '-en');
                        parent.before(parent2);

                        if (gmc.get('preserveDanishSubs')) {
                            // Reposition the English subtitles to be above the Danish ones
                            let enSubStyles = parent2.style;
                            let height = enSubStyles.getPropertyValue('height').replace(/px/, '');
                            let inset = enSubStyles.getPropertyValue('inset');

                            let match = inset.match(/^([\d.]+)px (.*)$/);
                            let newOffset = match[1] - height;
                            enSubStyles.setProperty('inset', `${newOffset}px ${match[2]}`);
                        }

                        let elm2 = parent2.querySelector('& > div');
                        elm2.textContent = translatedText;

                        elm.style.setProperty('color', gmc.get('subtitleColorDanish'));
                        elm2.style.setProperty('color', gmc.get('subtitleColorEnglish'));

                        if (! gmc.get('preserveDanishSubs')) {
                            parent.remove();
                        }
                    },
                    (error) => {
                        console.log("rejected llm check", error, sourceText);
                    }
                );
            }
        });

        oldPage = newPage;
    } catch (error) {
        console.log("got error:", error, player);
    }
};

setupTranslation();
