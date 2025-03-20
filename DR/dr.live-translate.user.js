// ==UserScript==
// @name         DR Live Translate
// @namespace    http://mathemaniac.org/
// @version      1.1.0
// @description  Live-translates subtitles on DR.dk using a LLM.
// @match        https://www.dr.dk/*
// @copyright    2025, Sebastian Paaske Tørholm
// @grant        unsafeWindow
// @license      MIT
// ==/UserScript==
/* jshint -W097 */
'use strict';

// Set your AI provider here. It has to have an OpenAI compatible interface. I use LM Studio to host my own locally. (Remember to enable CORS.)
const LLM_PROVIDER_BASE = "http://localhost:1234/v1";
// Set the AI model you wanna use to transcribe here. I feel like gemma-3-4b seems to do an alright job while being small.
const LLM_MODEL = 'gemma-3-4b-it';
// Should the originial Danish subtitles be preserved?
const PRESERVE_DANISH_SUBS = true;
// Subtitle color for the Danish subtitles
const SUBTITLE_COLOR_DANISH = '#ffffff';
// Subtitle color for the English subtitles
const SUBTITLE_COLOR_ENGLISH = '#ffd78c';

/// You shouldn't need to change below this point. ///

const systemPrompt = `
You are a translation service.
Your job is to translate sentences, or sentence fragments, from Danish to English.
Try to preserve the original casing, as they might be partial fragments.

Give your result in the following JSON format:

{ translatedText: "translated text goes here" }
`;

async function queryLLM(model, systemPrompt, userPrompt, maxTokens=100, temperature=0) {
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const response = await fetch(LLM_PROVIDER_BASE + "/chat/completions", {
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

                queryLLM(LLM_MODEL, systemPrompt, sourceText).then(
                    (response) => {
                        response = response.replace(/^\s*(?:```(?:json)?)?\s*/, "").replace(/\s*(?:```)?\s*$/, "");
                        const data = JSON.parse(response);
                        if (! data) {
                            console.log('error with response json', response, sourceText);
                            return;
                        }
                        const translatedText = data.translatedText;
                        if (! translatedText) {
                            console.log('error with translated text', data, sourceText, response);
                        }

                        if (elm.textContent !== sourceText) return;

                        let parent = elm.parentNode;
                        let parent2 = parent.cloneNode(true);
                        parent2.className = parent2.className.replace(/-da/, '-en');
                        parent.before(parent2);

                        if (PRESERVE_DANISH_SUBS) {
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

                        elm.style.setProperty('color', SUBTITLE_COLOR_DANISH);
                        elm2.style.setProperty('color', SUBTITLE_COLOR_ENGLISH);

                        if (! PRESERVE_DANISH_SUBS) {
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
