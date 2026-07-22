// ==UserScript==
// @name         DR Live Translate v2
// @namespace    http://mathemaniac.org/
// @version      2.0.0
// @description  Translates subtitles on DR.dk using a LLM.
// @match        https://www.dr.dk/*
// @copyright    2026, Sebastian Paaske Tørholm
// @license      MIT
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==
/* jshint esversion: 11 */
'use strict';

// This userscript deliberately does not alter DR's subtitle requests.  It only
// observes the playlist URL, fetches a second copy for translation, and adds a
// separate English <track> when it is ready.

const SCRIPT_ID = 'DRLiveTranslateV2';
const SETTINGS_KEY = `${SCRIPT_ID}:settings`;
const METRICS_KEY = `${SCRIPT_ID}:metrics`;
const DEFAULTS = {
    providerBaseUrl: 'http://127.0.0.1:1234/v1',
    providerApiKey: '',
    maxContextTokens: 4096,
    retryCount: 3,
    defaultModel: '',
    translationModel: '',
    subtitleStrategy: 'merged', // merged | per-vtt
    subtitleRequestMode: 'ask', // ask | auto
    preserveDanishSubs: true,
    enableSubtitleCache: true,
    autoPruneByCount: false,
    autoPruneByAge: false,
    pruneMaxItems: 100,
    pruneMaxDays: 365,
    developerLogging: false,
    completionSound: false,
    completionVolume: 0.35
};

let settings = loadSettings();
let activePlaylist = '';
let activeTrackUrl = '';
let currentOverlay = null;
let settingsDialog = null;
let translationRunning = false;
let renderedTranslations = new Map();
let subtitleMutationObserver = null;
let subtitlePlayer = null;
let subtitleLibraryDatabase = null;

const LIBRARY_DATABASE = `${SCRIPT_ID}:library`;
const LIBRARY_STORE = 'subtitleSets';

function loadSettings() {
    try {
        return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    } catch (error) {
        console.warn(`${SCRIPT_ID}: unable to read settings`, error);
        return Object.assign({}, DEFAULTS);
    }
}

function saveSettings(nextSettings) {
    settings = Object.assign({}, DEFAULTS, nextSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function normalizeBaseUrl(url) {
    return String(url || '').replace(/\/+$/, '');
}

function logLLM(label, data) {
    if (!settings.developerLogging) return;
    console.groupCollapsed(`%cDR Live Translate v2 · ${label}`, 'color:#ffd78c;font-weight:bold');
    console.log(data);
    console.groupEnd();
}

function getMetrics() {
    try { return JSON.parse(localStorage.getItem(METRICS_KEY) || '{}'); } catch (_) { return {}; }
}

function addUsage(model, usage) {
    if (!usage || !model) return;
    const metrics = getMetrics();
    const previous = metrics[model] || { requests: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    previous.requests += 1;
    previous.prompt_tokens += Number(usage.prompt_tokens || 0);
    previous.completion_tokens += Number(usage.completion_tokens || 0);
    previous.total_tokens += Number(usage.total_tokens || 0);
    metrics[model] = previous;
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

function selectedModel() {
    return settings.translationModel || settings.defaultModel;
}

function apiHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.providerApiKey) headers.Authorization = `Bearer ${settings.providerApiKey}`;
    return headers;
}

async function fetchModels(candidateSettings = settings) {
    const base = normalizeBaseUrl(candidateSettings.providerBaseUrl);
    if (!base) throw new Error('A provider base URL is required.');
    const headers = { 'Content-Type': 'application/json' };
    if (candidateSettings.providerApiKey) headers.Authorization = `Bearer ${candidateSettings.providerApiKey}`;
    const response = await fetch(`${base}/models`, { headers });
    if (!response.ok) throw new Error(`Model request failed (${response.status} ${response.statusText}).`);
    const data = await response.json();
    const models = (data.data || []).map((model) => model.id).filter(Boolean).sort();
    logLLM('models received', { request: { url: `${base}/models` }, response: data });
    return models;
}

function installFetchObserver() {
    const injected = `(${function () {
        const eventName = '${SCRIPT_ID}:subtitle-playlist';
        const isSubtitlePlaylist = (value) => {
            try {
                const url = new URL(typeof value === 'string' ? value : value.url, location.href);
                return /\\.m3u8(?:$|[?#])/i.test(url.pathname) && /(?:subtitle|undertekst|caption)/i.test(url.pathname);
            } catch (_) { return false; }
        };
        const announce = (value) => {
            if (isSubtitlePlaylist(value)) window.postMessage({ source: '${SCRIPT_ID}', type: 'subtitle-playlist', url: new URL(typeof value === 'string' ? value : value.url, location.href).href }, location.origin);
        };
        const originalFetch = window.fetch;
        if (!originalFetch.__drLiveTranslateV2) {
            const wrappedFetch = function (input, init) { announce(input); return originalFetch.call(this, input, init); };
            wrappedFetch.__drLiveTranslateV2 = true;
            window.fetch = wrappedFetch;
        }
        const originalOpen = XMLHttpRequest.prototype.open;
        if (!originalOpen.__drLiveTranslateV2) {
            XMLHttpRequest.prototype.open = function (method, url) { announce(url); return originalOpen.apply(this, arguments); };
            XMLHttpRequest.prototype.open.__drLiveTranslateV2 = true;
        }
    }.toString()})();`;
    try {
        // Tampermonkey's page-realm eval is not governed by the page's inline
        // script CSP.  The script-element fallback supports managers without it.
        if (typeof unsafeWindow.eval === 'function') unsafeWindow.eval(injected);
        else throw new Error('No page-realm eval available');
    } catch (_) {
        const element = document.createElement('script');
        element.textContent = injected;
        const parent = document.documentElement || document.head;
        if (parent) {
            parent.appendChild(element);
            element.remove();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                (document.documentElement || document.head).appendChild(element);
                element.remove();
            }, { once: true });
        }
    }
    // A few userscript managers expose unsafeWindow but do not execute injected
    // inline scripts.  Their direct bridge is an adequate fetch-only fallback.
    try {
        if (unsafeWindow.fetch && !unsafeWindow.fetch.__drLiveTranslateV2) {
            const pageFetch = unsafeWindow.fetch;
            const announce = (input) => {
                const rawUrl = typeof input === 'string' ? input : input && input.url;
                if (rawUrl && /\.m3u8(?:$|[?#])/i.test(rawUrl) && /(?:subtitle|undertekst|caption)/i.test(rawUrl)) {
                    window.postMessage({ source: SCRIPT_ID, type: 'subtitle-playlist', url: new URL(rawUrl, location.href).href }, location.origin);
                }
            };
            const fallbackFetch = function (input, init) { announce(input); return pageFetch.call(this, input, init); };
            fallbackFetch.__drLiveTranslateV2 = true;
            unsafeWindow.fetch = fallbackFetch;
        }
    } catch (error) {
        console.warn(`${SCRIPT_ID}: could not install fetch fallback`, error);
    }
}

function isSubtitlePlaylistUrl(value) {
    try {
        const url = new URL(value, location.href);
        return /\.m3u8(?:$|[?#])/i.test(url.pathname) && /(?:subtitle|undertekst|caption)/i.test(url.pathname);
    } catch (_) {
        return false;
    }
}

function observePlaylistUrl(url, source) {
    if (!isSubtitlePlaylistUrl(url)) return;
    logLLM('subtitle playlist detected', { source, url });
    detectPlaylist(new URL(url, location.href).href);
}

function installResourceObserver() {
    // HLS implementations can fetch subtitle playlists from a Web Worker, where
    // page-level fetch/XHR overrides cannot see them. Resource Timing observes
    // those browser requests as well as native <track> loads.
    const inspect = (entries) => entries.forEach((entry) => observePlaylistUrl(entry.name, 'resource timing'));
    try {
        inspect(performance.getEntriesByType('resource'));
        const observer = new PerformanceObserver((list) => inspect(list.getEntries()));
        observer.observe({ type: 'resource', buffered: true });
    } catch (error) {
        logLLM('resource timing observer unavailable', { error: String(error) });
    }
}

window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    const message = event.data || {};
    if (message.source !== SCRIPT_ID || message.type !== 'subtitle-playlist' || !message.url) return;
    detectPlaylist(message.url);
});

async function detectPlaylist(url) {
    if (url === activePlaylist || translationRunning) return;
    activePlaylist = url;
    pauseVideo();
    if (settings.enableSubtitleCache) {
        try {
            const cached = await getCachedSubtitleSet(getVideoPageUrl(), url);
            if (cached && Array.isArray(cached.cues) && cached.cues.length && cached.cues.every((cue) => cue.englishText)) {
                // A completed cached translation should be shown immediately;
                // asking again would make replaying a video needlessly noisy.
                startTranslation(url);
                return;
            }
        } catch (error) {
            console.warn(`${SCRIPT_ID}: could not check subtitle cache`, error);
        }
    }
    if (settings.subtitleRequestMode === 'auto') {
        startTranslation(url);
        return;
    }
    showDecisionDialog(url);
}

function pauseVideo() {
    const video = document.querySelector('video');
    if (video && !video.paused) video.pause();
}

function resumeVideo() {
    const video = document.querySelector('video');
    if (video) video.play().catch(() => {});
}

function showDecisionDialog(url) {
    removeNode(document.querySelector(`.${SCRIPT_ID}-decision`));
    const dialog = makeDialog('Translate subtitles?', `A Danish subtitle playlist was detected. The video is paused while you decide.`);
    dialog.classList.add(`${SCRIPT_ID}-decision`);
    const detail = document.createElement('p');
    detail.className = 'drlt-muted';
    detail.textContent = new URL(url).pathname.split('/').slice(-2).join('/');
    dialog.querySelector('.drlt-body').appendChild(detail);
    const actions = dialog.querySelector('.drlt-actions');
    addButton(actions, 'Skip this video', 'secondary', () => { removeNode(dialog); resumeVideo(); });
    addButton(actions, 'Translate now', 'primary', () => { removeNode(dialog); startTranslation(url); });
    document.body.appendChild(dialog);
}

async function startTranslation(playlistUrl) {
    if (translationRunning) return;
    translationRunning = true;
    const overlay = createProgressOverlay();
    try {
        const videoPageUrl = getVideoPageUrl();
        let cached = null;
        if (settings.enableSubtitleCache) {
            try { cached = await getCachedSubtitleSet(videoPageUrl, playlistUrl); }
            catch (error) { console.warn(`${SCRIPT_ID}: could not read subtitle cache`, error); }
        }
        if (cached && Array.isArray(cached.cues) && cached.cues.length && cached.cues.every((cue) => cue.englishText)) {
            setProgress(overlay, 'Loading cached translation…', cached.cues.length, cached.cues.length);
            agentNote(overlay, `Loaded ${cached.cues.length} subtitle lines from the local library.`);
            await installTranslatedTrack(cached.cues);
            finishOverlay(overlay, `Loaded cached translation — ${cached.cues.length} subtitle lines ready.`);
            setTimeout(() => removeNode(overlay), 900);
            resumeVideo();
            return;
        }
        if (!selectedModel()) throw new Error('Choose a translation model in the DR Live Translate v2 settings first.');
        setProgress(overlay, 'Fetching subtitle playlist…', 0, 1);
        const segmentUrls = await fetchPlaylistSegments(playlistUrl);
        if (!segmentUrls.length) throw new Error('No .vtt segments were found in this subtitle playlist.');
        agentNote(overlay, `Found ${segmentUrls.length} VTT segment${segmentUrls.length === 1 ? '' : 's'}.`);

        const segments = [];
        for (let index = 0; index < segmentUrls.length; index += 1) {
            setProgress(overlay, `Downloading subtitle segment ${index + 1} of ${segmentUrls.length}…`, index, segmentUrls.length * 2);
            const response = await fetch(segmentUrls[index]);
            if (!response.ok) throw new Error(`Could not load segment ${index + 1} (${response.status}).`);
            const cues = parseVtt(await response.text());
            if (cues.length) segments.push({ url: segmentUrls[index], cues });
        }
        const totalCues = segments.reduce((sum, segment) => sum + segment.cues.length, 0);
        if (!totalCues) throw new Error('The subtitle segments did not contain any timed cues.');
        setProgress(overlay, `Preparing ${totalCues} subtitle lines…`, 0, totalCues);

        let completed = 0;
        if (settings.subtitleStrategy === 'per-vtt') {
            for (let index = 0; index < segments.length; index += 1) {
                const segment = segments[index];
                agentNote(overlay, `Translating segment ${index + 1}/${segments.length} (${segment.cues.length} lines).`);
                await runTranslationAgent(segment.cues, overlay, (done) => setProgress(overlay, `Translating segment ${index + 1}/${segments.length}…`, completed + done, totalCues));
                completed += segment.cues.length;
            }
        } else {
            const cues = segments.flatMap((segment) => segment.cues);
            await runTranslationAgent(cues, overlay, (done) => setProgress(overlay, 'Translating subtitle playlist…', done, totalCues));
        }

        setProgress(overlay, 'Installing translated subtitle track…', totalCues, totalCues);
        const allCues = segments.flatMap((segment) => segment.cues);
        await installTranslatedTrack(allCues);
        if (settings.enableSubtitleCache) {
            try {
                await saveCachedSubtitleSet({ url: videoPageUrl, subtitlePlaylistUrl: playlistUrl, title: getVideoTitle(), cues: allCues });
                if (settings.autoPruneByCount || settings.autoPruneByAge) await pruneSubtitleLibrary();
            } catch (error) {
                console.warn(`${SCRIPT_ID}: translation was ready but could not be cached`, error);
            }
        }
        finishOverlay(overlay, `Translation complete — ${totalCues} subtitle lines ready.`);
        playCompletionSound();
        setTimeout(() => removeNode(overlay), 1200);
        resumeVideo();
    } catch (error) {
        console.error(`${SCRIPT_ID}: translation failed`, error);
        finishOverlay(overlay, `Translation stopped: ${error.message || error}`, true);
    } finally {
        translationRunning = false;
    }
}

async function fetchPlaylistSegments(playlistUrl) {
    const response = await fetch(playlistUrl);
    if (!response.ok) throw new Error(`Could not load subtitle playlist (${response.status}).`);
    const playlist = await response.text();
    return playlist.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && /\.vtt(?:$|[?#])/i.test(line)).map((line) => new URL(line, playlistUrl).href);
}

function parseVtt(text) {
    const blocks = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n{2,}/);
    const cues = [];
    for (const block of blocks) {
        const lines = block.split('\n');
        if (!lines.length || /^WEBVTT|^X-TIMESTAMP-MAP|^NOTE|^STYLE|^REGION/.test(lines[0].trim())) continue;
        const timingIndex = lines.findIndex((line) => /-->/.test(line));
        if (timingIndex < 0) continue;
        const textLines = lines.slice(timingIndex + 1);
        const original = textLines.join('\n').trim();
        if (!original) continue;
        cues.push({ id: timingIndex ? lines.slice(0, timingIndex).join('\n') : '', timing: lines[timingIndex].trim(), original, englishText: '' });
    }
    return cues;
}

const AGENT_SYSTEM_PROMPT = `You are a careful Danish-to-English subtitle translation agent. Your translation buffer is maintained by tools; do not output translations in chat text.

Translate every subtitle line exactly once. Keep subtitle formatting, speaker dashes, casing, tone, and line breaks where sensible. You may call read_chunk to obtain originals, then write_chunk to store English translations. inspect_sample is useful for quality checks; delete_chunk removes a bad range before replacement.

You must not finish your work until every line has a non-empty English translation. Before finishing, use read_chunk or inspect_sample to verify coverage. If a tool reports an error, correct it and retry. Tool arguments use inclusive line-number ranges.`;

const AGENT_TOOLS = [
    { type: 'function', function: { name: 'read_chunk', description: 'Read a contiguous, inclusive range of subtitle lines.', parameters: { type: 'object', properties: { startLineNo: { type: 'integer' }, endLineNo: { type: 'integer' }, includeOriginal: { type: 'boolean' } }, required: ['startLineNo', 'endLineNo', 'includeOriginal'], additionalProperties: false } } },
    { type: 'function', function: { name: 'write_chunk', description: 'Write replacement English translations for every supplied subtitle line.', parameters: { type: 'object', properties: { startLineNo: { type: 'integer' }, endLineNo: { type: 'integer' }, lines: { type: 'array', items: { type: 'object', properties: { lineNo: { type: 'integer' }, englishText: { type: 'string' } }, required: ['lineNo', 'englishText'], additionalProperties: false } } }, required: ['startLineNo', 'endLineNo', 'lines'], additionalProperties: false } } },
    { type: 'function', function: { name: 'delete_chunk', description: 'Remove translations in an inclusive range so they can be replaced.', parameters: { type: 'object', properties: { startLineNo: { type: 'integer' }, endLineNo: { type: 'integer' } }, required: ['startLineNo', 'endLineNo'], additionalProperties: false } } },
    { type: 'function', function: { name: 'inspect_sample', description: 'Return random original/translation pairs from an inclusive range for quality checking.', parameters: { type: 'object', properties: { startLineNo: { type: 'integer' }, endLineNo: { type: 'integer' }, samples: { type: 'integer', minimum: 1 } }, required: ['startLineNo', 'endLineNo', 'samples'], additionalProperties: false } } }
];

async function runTranslationAgent(cues, overlay, onProgress) {
    const state = { cues, translated: () => cues.filter((cue) => cue.englishText.trim()).length };
    let messages = [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: `There are ${cues.length} subtitle lines, numbered 1 through ${cues.length}. Begin translating now. Work in manageable chunks.` }
    ];
    let turnsWithoutProgress = 0;
    const maxTurns = Math.max(30, cues.length * 3);
    for (let turn = 1; state.translated() < cues.length && turn <= maxTurns; turn += 1) {
        if (estimateTokens(messages) > Number(settings.maxContextTokens || DEFAULTS.maxContextTokens) * 0.72) {
            messages = await compactAgentHistory(messages, state, overlay);
        }
        agentNote(overlay, `Agent turn ${turn}: ${state.translated()}/${cues.length} lines translated.`);
        const result = await chatCompletion(messages, AGENT_TOOLS, 'subtitle translation');
        messages.push({ role: 'assistant', content: result.content || null, tool_calls: result.toolCalls.length ? result.toolCalls : undefined });
        if (!result.toolCalls.length) {
            messages.push({ role: 'user', content: `The buffer is only ${state.translated()}/${cues.length} complete. Continue using tools; do not end the session yet.` });
            turnsWithoutProgress += 1;
            if (turnsWithoutProgress > 4) messages.push({ role: 'user', content: 'Call read_chunk for untranslated lines, then write_chunk with a complete translation for each requested line.' });
            continue;
        }
        const before = state.translated();
        for (const call of result.toolCalls) {
            const toolResult = executeSubtitleTool(call, state);
            agentNote(overlay, `Tool ${call.function.name}: ${toolResult.summary}`);
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult) });
        }
        onProgress(state.translated());
        turnsWithoutProgress = state.translated() > before ? 0 : turnsWithoutProgress + 1;
    }
    const missing = cues.map((cue, index) => (!cue.englishText.trim() ? index + 1 : null)).filter(Boolean);
    if (missing.length) throw new Error(`The translation agent ended before translating all lines. Missing line numbers: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? '…' : ''}`);
}

function executeSubtitleTool(call, state) {
    let args;
    try { args = JSON.parse(call.function.arguments || '{}'); } catch (_) { return toolError('The arguments were not valid JSON. Provide valid JSON matching the tool schema.'); }
    const count = state.cues.length;
    const range = validRange(args, count);
    if (!range) return toolError(`startLineNo and endLineNo must be inclusive integers between 1 and ${count}, with startLineNo <= endLineNo.`);
    const [start, end] = range;
    const selected = state.cues.slice(start - 1, end);
    switch (call.function.name) {
    case 'read_chunk':
        if (typeof args.includeOriginal !== 'boolean') return toolError('includeOriginal must be true or false.');
        return toolSuccess('Returned requested subtitle range.', { lines: selected.map((cue, index) => ({ lineNo: start + index, ...(args.includeOriginal ? { originalText: cue.original } : {}), englishText: cue.englishText || null })) });
    case 'delete_chunk':
        selected.forEach((cue) => { cue.englishText = ''; });
        return toolSuccess(`Removed translations for lines ${start}-${end}.`, { deleted: end - start + 1 });
    case 'inspect_sample': {
        if (!Number.isInteger(args.samples) || args.samples < 1) return toolError('samples must be a positive integer.');
        const shuffled = selected.map((cue, index) => ({ cue, lineNo: start + index })).sort(() => Math.random() - 0.5).slice(0, Math.min(args.samples, selected.length));
        return toolSuccess(`Returned ${shuffled.length} random samples.`, { samples: shuffled.map(({ cue, lineNo }) => ({ lineNo, originalText: cue.original, englishText: cue.englishText || null })) });
    }
    case 'write_chunk': {
        if (!Array.isArray(args.lines)) return toolError('lines must be an array of { lineNo, englishText } entries.');
        const expected = new Set(Array.from({ length: end - start + 1 }, (_, index) => start + index));
        const received = new Map();
        const invalid = [];
        args.lines.forEach((line) => {
            if (!line || !Number.isInteger(line.lineNo) || typeof line.englishText !== 'string' || !line.englishText.trim()) invalid.push(line && line.lineNo);
            else if (!expected.has(line.lineNo)) invalid.push(line.lineNo);
            else if (received.has(line.lineNo)) invalid.push(line.lineNo);
            else received.set(line.lineNo, line.englishText.trim());
        });
        const missing = Array.from(expected).filter((lineNo) => !received.has(lineNo));
        if (invalid.length || missing.length) return toolError(`No changes were made. ${invalid.length ? `Invalid/out-of-range/duplicate line numbers: ${invalid.join(', ')}. ` : ''}${missing.length ? `Missing required line numbers: ${missing.join(', ')}.` : ''}`);
        received.forEach((englishText, lineNo) => { state.cues[lineNo - 1].englishText = englishText.replace(/\\n/g, '\n'); });
        return toolSuccess(`Saved translations for lines ${start}-${end}.`, { written: received.size, translated: state.translated(), total: count });
    }
    default: return toolError(`Unknown tool '${call.function.name}'. Available tools: read_chunk, write_chunk, delete_chunk, inspect_sample.`);
    }
}

function validRange(args, count) {
    if (!Number.isInteger(args.startLineNo) || !Number.isInteger(args.endLineNo) || args.startLineNo < 1 || args.endLineNo > count || args.startLineNo > args.endLineNo) return null;
    return [args.startLineNo, args.endLineNo];
}

function toolSuccess(summary, payload) { return Object.assign({ ok: true, summary }, payload); }
function toolError(summary) { return { ok: false, summary }; }

async function compactAgentHistory(messages, state, overlay) {
    // Subtitle data is authoritative in the local tool buffer.  Keeping a small
    // LLM-produced handoff prevents long sessions from overflowing local models.
    agentNote(overlay, 'Context is getting full; creating a compact agent handoff…');
    const progress = `${state.translated()} of ${state.cues.length} lines translated. The translation buffer remains available through the tools.`;
    try {
        const response = await chatCompletion([
            { role: 'system', content: 'Summarize this agent handoff in one concise sentence. Do not translate or invent text.' },
            { role: 'user', content: progress }
        ], [], 'agent context compaction');
        const summary = response.content || progress;
        logLLM('context compacted', { summary });
        return [{ role: 'system', content: AGENT_SYSTEM_PROMPT }, { role: 'user', content: `Resuming subtitle translation. ${summary} Use read_chunk to inspect the buffer and continue until all lines are translated.` }];
    } catch (error) {
        logLLM('context compaction fallback', { error: String(error) });
        return [{ role: 'system', content: AGENT_SYSTEM_PROMPT }, { role: 'user', content: `Resuming subtitle translation. ${progress} Read the buffer and continue until complete.` }];
    }
}

function estimateTokens(messages) {
    return Math.ceil(JSON.stringify(messages).length / 3.5);
}

async function chatCompletion(messages, tools, task) {
    const model = selectedModel();
    const request = { model, messages, stream: true, stream_options: { include_usage: true } };
    if (tools.length) { request.tools = tools; request.tool_choice = 'auto'; }
    Object.keys(request).forEach((key) => request[key] === undefined && delete request[key]);
    let lastError;
    for (let attempt = 0; attempt <= Number(settings.retryCount || 0); attempt += 1) {
        try {
            logLLM(`sending · ${task}`, { attempt: attempt + 1, request });
            const response = await fetch(`${normalizeBaseUrl(settings.providerBaseUrl)}/chat/completions`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(request) });
            if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
            const result = await readStreamingCompletion(response);
            addUsage(model, result.usage);
            logLLM(`received · ${task}`, { response: result, usage: result.usage });
            return result;
        } catch (error) {
            lastError = error;
            logLLM(`failed · ${task}`, { attempt: attempt + 1, error: String(error) });
            if (attempt < Number(settings.retryCount || 0)) {
                logLLM(`retrying · ${task}`, { nextAttempt: attempt + 2 });
                await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
            }
        }
    }
    throw new Error(`LLM request failed after ${Number(settings.retryCount || 0) + 1} attempt(s): ${lastError.message || lastError}`);
}

async function readStreamingCompletion(response) {
    if (!response.body || !/text\/event-stream/i.test(response.headers.get('content-type') || '')) {
        const data = await response.json();
        return { content: data.choices && data.choices[0].message.content, toolCalls: (data.choices && data.choices[0].message.tool_calls) || [], usage: data.usage };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let usage;
    const toolCalls = [];
    const consume = (packet) => {
        if (!packet || packet === '[DONE]') return;
        const data = JSON.parse(packet);
        if (data.usage) usage = data.usage;
        const delta = data.choices && data.choices[0] && data.choices[0].delta;
        if (!delta) return;
        content += delta.content || '';
        (delta.tool_calls || []).forEach((part) => {
            const index = part.index || 0;
            toolCalls[index] = toolCalls[index] || { id: '', type: 'function', function: { name: '', arguments: '' } };
            if (part.id) toolCalls[index].id += part.id;
            if (part.type) toolCalls[index].type = part.type;
            if (part.function) {
                toolCalls[index].function.name += part.function.name || '';
                toolCalls[index].function.arguments += part.function.arguments || '';
            }
        });
    };
    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop();
        events.forEach((event) => event.split(/\r?\n/).filter((line) => line.startsWith('data:')).forEach((line) => consume(line.slice(5).trim())));
        if (done) break;
    }
    if (buffer.trim()) buffer.split(/\r?\n/).filter((line) => line.startsWith('data:')).forEach((line) => consume(line.slice(5).trim()));
    return { content, toolCalls: toolCalls.filter(Boolean), usage };
}

async function installTranslatedTrack(cues) {
    // DR's HLS player already turns its segmented VTT cues into the correctly
    // timed DOM overlay.  Replacing it with one concatenated <track> loses its
    // HLS timestamp mapping.  Keep DR's renderer and insert pre-made English
    // copies as each original cue becomes visible, just like v1 did.
    renderedTranslations = new Map();
    cues.forEach((cue) => {
        const key = normalizeSubtitleText(cue.original);
        if (!renderedTranslations.has(key)) renderedTranslations.set(key, cue.englishText);
    });
    installRenderedSubtitleTranslator();
    translateVisibleSubtitles();
}

function normalizeSubtitleText(text) { return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+$/g, '').replace(/^\s+/gm, ''); }

function installRenderedSubtitleTranslator() {
    if (subtitleMutationObserver) subtitleMutationObserver.disconnect();
    subtitleMutationObserver = new MutationObserver(() => translateVisibleSubtitles());
    subtitleMutationObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    // This is the same player event v1 used.  The observer covers DOM updates
    // too, but the event is the most direct route when DR exposes its player.
    try {
        const player = unsafeWindow.player;
        if (player && player.on && player !== subtitlePlayer) {
            player.on('texttrackchange', translateVisibleSubtitles);
            subtitlePlayer = player;
        }
    } catch (_) { /* The DOM observer remains available. */ }
}

function translateVisibleSubtitles() {
    for (const originalElement of document.querySelectorAll('.vjs-text-track-cue > div')) {
        const sourceText = originalElement.textContent;
        const translatedText = renderedTranslations.get(normalizeSubtitleText(sourceText));
        if (!translatedText || originalElement.dataset.drltV2Source === sourceText) continue;
        originalElement.dataset.drltV2Source = sourceText;
        const originalCue = originalElement.parentElement;
        if (!originalCue) continue;
        const oldEnglishCue = originalCue.previousElementSibling;
        if (oldEnglishCue && oldEnglishCue.classList.contains('drlt-v2-english-cue')) removeNode(oldEnglishCue);
        const englishCue = originalCue.cloneNode(true);
        englishCue.classList.add('drlt-v2-english-cue');
        const englishElement = englishCue.querySelector(':scope > div') || englishCue.firstElementChild;
        if (!englishElement) continue;
        englishElement.textContent = translatedText;
        englishElement.style.setProperty('color', '#FFD78C');
        originalElement.style.setProperty('color', '#FFFFFF');
        originalCue.before(englishCue);
        if (settings.preserveDanishSubs) {
            const inset = englishCue.style.getPropertyValue('inset');
            const match = inset.match(/^([\d.]+)px (.*)$/);
            if (match) {
                const height = Array.from(englishElement.getClientRects()).reduce((sum, rect) => sum + rect.height, 0);
                englishCue.style.setProperty('inset', `${Math.max(0, Number(match[1]) - height)}px ${match[2]}`);
            }
        } else {
            removeNode(originalCue);
        }
    }
}

function getVideoTitle() {
    const title = document.querySelector('.player-metadata__title');
    return title && title.textContent.trim() ? title.textContent.trim() : document.title.replace(/\s*\|\s*DR\.dk.*$/i, '').trim();
}

function getVideoPageUrl() {
    const url = new URL(location.href);
    url.hash = '';
    return url.href;
}

function openSubtitleLibraryDatabase() {
    if (subtitleLibraryDatabase) return subtitleLibraryDatabase;
    subtitleLibraryDatabase = new Promise((resolve, reject) => {
        const request = indexedDB.open(LIBRARY_DATABASE, 2);
        request.onupgradeneeded = () => {
            const store = request.result.objectStoreNames.contains(LIBRARY_STORE) ? request.transaction.objectStore(LIBRARY_STORE) : request.result.createObjectStore(LIBRARY_STORE, { keyPath: 'url' });
            if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
            if (!store.indexNames.contains('subtitlePlaylistUrl')) store.createIndex('subtitlePlaylistUrl', 'subtitlePlaylistUrl');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open the subtitle library.'));
    });
    return subtitleLibraryDatabase;
}

async function libraryRequest(mode, action) {
    const database = await openSubtitleLibraryDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(LIBRARY_STORE, mode);
        const request = action(transaction.objectStore(LIBRARY_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Subtitle library operation failed.'));
    });
}

async function getCachedSubtitleSet(videoPageUrl, subtitlePlaylistUrl) {
    const byPageUrl = await libraryRequest('readonly', (store) => store.get(videoPageUrl));
    if (byPageUrl) return byPageUrl;
    if (!subtitlePlaylistUrl) return null;
    return libraryRequest('readonly', (store) => store.index('subtitlePlaylistUrl').get(subtitlePlaylistUrl));
}

function saveCachedSubtitleSet({ url, subtitlePlaylistUrl, title, cues }) {
    const cueCopies = cues.map((cue) => ({ id: cue.id, timing: cue.timing, original: cue.original, englishText: cue.englishText }));
    return libraryRequest('readwrite', (store) => store.put({
        url,
        subtitlePlaylistUrl,
        title,
        timestamp: new Date().toISOString(),
        danishSubtitles: cueCopies.map((cue) => cue.original),
        translatedSubtitles: cueCopies.map((cue) => cue.englishText),
        cues: cueCopies
    }));
}

async function listSubtitleLibrary() {
    const entries = await libraryRequest('readonly', (store) => store.getAll());
    return entries.sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
}

function deleteSubtitleSet(url) { return libraryRequest('readwrite', (store) => store.delete(url)); }

async function pruneSubtitleLibrary(options = settings) {
    const entries = await listSubtitleLibrary();
    const now = Date.now();
    const remove = new Set();
    if (options.autoPruneByAge || options.forceAgePrune) {
        const cutoff = now - Number(options.pruneMaxDays || 365) * 86400000;
        entries.filter((entry) => Date.parse(entry.timestamp) < cutoff).forEach((entry) => remove.add(entry.url));
    }
    if (options.autoPruneByCount || options.forceCountPrune) {
        entries.slice(Math.max(0, Number(options.pruneMaxItems || 100))).forEach((entry) => remove.add(entry.url));
    }
    await Promise.all(Array.from(remove, (url) => deleteSubtitleSet(url)));
    return remove.size;
}

function formatSrtTimestamp(value) {
    return String(value).replace('.', ',');
}

function cuesToSrt(cues, language) {
    return cues.map((cue, index) => {
        const match = String(cue.timing || '').match(/^([^\s]+)\s+-->\s+([^\s]+)/);
        if (!match) return '';
        return `${index + 1}\n${formatSrtTimestamp(match[1])} --> ${formatSrtTimestamp(match[2])}\n${language === 'danish' ? cue.original : cue.englishText}\n`;
    }).filter(Boolean).join('\n');
}

function downloadSrt(entry, language) {
    const safeTitle = (entry.title || 'DR-subtitles').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
    const blob = new Blob([cuesToSrt(entry.cues || [], language)], { type: 'application/x-subrip;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${safeTitle}.${language === 'danish' ? 'da' : 'en'}.srt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

function makeDialog(title, message) {
    ensureStyles();
    const dialog = document.createElement('section');
    dialog.className = 'drlt-dialog';
    dialog.innerHTML = `<div class="drlt-card"><header><h2></h2><button class="drlt-close" type="button" aria-label="Close">×</button></header><div class="drlt-body"><p></p></div><footer class="drlt-actions"></footer></div>`;
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('.drlt-body > p').textContent = message;
    dialog.querySelector('.drlt-close').addEventListener('click', () => removeNode(dialog));
    return dialog;
}

function addButton(parent, label, kind, action) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `drlt-button ${kind}`; button.textContent = label; button.addEventListener('click', action); parent.appendChild(button); return button;
}

function createProgressOverlay() {
    ensureStyles();
    removeNode(currentOverlay);
    const overlay = document.createElement('aside');
    overlay.className = 'drlt-progress';
    overlay.innerHTML = `<div class="drlt-progress-card"><strong>Preparing English subtitles</strong><span class="drlt-status">Starting…</span><progress value="0" max="1"></progress><button class="drlt-log-toggle" type="button">Show agent activity</button><pre class="drlt-agent-log" hidden></pre></div>`;
    overlay.querySelector('.drlt-log-toggle').addEventListener('click', (event) => { const log = overlay.querySelector('.drlt-agent-log'); log.hidden = !log.hidden; event.currentTarget.textContent = log.hidden ? 'Show agent activity' : 'Hide agent activity'; });
    document.body.appendChild(overlay); currentOverlay = overlay; return overlay;
}

function setProgress(overlay, status, value, max) { if (!overlay.isConnected) return; overlay.querySelector('.drlt-status').textContent = status; const progress = overlay.querySelector('progress'); progress.max = Math.max(1, max); progress.value = Math.min(value, progress.max); }
function agentNote(overlay, message) { if (!overlay.isConnected) return; const log = overlay.querySelector('.drlt-agent-log'); log.textContent += `${new Date().toLocaleTimeString()}  ${message}\n`; log.scrollTop = log.scrollHeight; }
function finishOverlay(overlay, message, isError) { overlay.querySelector('.drlt-status').textContent = message; overlay.querySelector('.drlt-progress-card').classList.toggle('error', Boolean(isError)); }
function removeNode(node) { if (node && node.parentNode) node.parentNode.removeChild(node); }

function playCompletionSound() {
    if (!settings.completionSound) return;
    try {
        const audio = new AudioContext(); const oscillator = audio.createOscillator(); const gain = audio.createGain();
        oscillator.frequency.value = 880; gain.gain.value = Number(settings.completionVolume || 0.35) * 0.08;
        oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.12);
    } catch (_) { /* browser may require a user gesture */ }
}

async function openSubtitleLibrary() {
    ensureStyles();
    const dialog = makeDialog('Translated subtitle library', 'Cached subtitle sets are stored locally in this browser.');
    const body = dialog.querySelector('.drlt-body');
    body.innerHTML = '<p class="drlt-library-status">Loading library…</p>';
    document.body.appendChild(dialog);
    try {
        let entries = await listSubtitleLibrary();
        const render = () => {
            body.innerHTML = '';
            if (!entries.length) { body.textContent = 'No cached subtitle sets yet.'; return; }
            const controls = document.createElement('div'); controls.className = 'drlt-library-controls';
            controls.innerHTML = `<label>Keep newest <input class="drlt-prune-count" type="number" min="1" value="${settings.pruneMaxItems}"> sets</label><label>Remove sets older than <input class="drlt-prune-days" type="number" min="1" value="${settings.pruneMaxDays}"> days</label>`;
            addButton(controls, 'Prune by count', 'secondary', async () => { await pruneSubtitleLibrary({ forceCountPrune: true, pruneMaxItems: Number(controls.querySelector('.drlt-prune-count').value) }); entries = await listSubtitleLibrary(); render(); });
            addButton(controls, 'Prune by age', 'secondary', async () => { await pruneSubtitleLibrary({ forceAgePrune: true, pruneMaxDays: Number(controls.querySelector('.drlt-prune-days').value) }); entries = await listSubtitleLibrary(); render(); });
            body.appendChild(controls);
            const select = document.createElement('select'); select.className = 'drlt-library-list';
            entries.forEach((entry) => select.append(new Option(`${entry.title || 'Untitled video'} — ${new Date(entry.timestamp).toLocaleString()} (${entry.cues.length} cues)`, entry.url)));
            body.appendChild(select);
            const viewer = document.createElement('section'); viewer.className = 'drlt-library-viewer'; body.appendChild(viewer);
            const show = () => {
                const entry = entries.find((item) => item.url === select.value);
                if (!entry) return;
                viewer.innerHTML = `<p><strong>${escapeHtml(entry.title || 'Untitled video')}</strong><br><small>${escapeHtml(entry.url)}<br>Saved ${new Date(entry.timestamp).toLocaleString()}</small></p><div class="drlt-library-actions"></div><div class="drlt-comparison"><strong>Danish</strong><strong>English</strong></div>`;
                const actions = viewer.querySelector('.drlt-library-actions');
                addButton(actions, 'Export Danish .srt', 'secondary', () => downloadSrt(entry, 'danish'));
                addButton(actions, 'Export English .srt', 'secondary', () => downloadSrt(entry, 'english'));
                addButton(actions, 'Delete set', 'secondary', async () => { await deleteSubtitleSet(entry.url); entries = await listSubtitleLibrary(); render(); });
                const comparison = viewer.querySelector('.drlt-comparison');
                entry.cues.forEach((cue, index) => {
                    const number = document.createElement('small'); number.className = 'drlt-cue-number'; number.textContent = `${index + 1} · ${cue.timing}`;
                    const original = document.createElement('div'); original.textContent = cue.original;
                    const english = document.createElement('div'); english.textContent = cue.englishText;
                    comparison.append(number, original, english);
                });
            };
            select.addEventListener('change', show); show();
        };
        render();
    } catch (error) {
        body.textContent = `The subtitle library could not be opened: ${error.message || error}`;
    }
    addButton(dialog.querySelector('.drlt-actions'), 'Close', 'primary', () => removeNode(dialog));
}

function escapeHtml(value) {
    const element = document.createElement('div'); element.textContent = value; return element.innerHTML;
}

function openSettings() {
    ensureStyles(); removeNode(settingsDialog);
    const dialog = makeDialog('DR Live Translate v2 settings', 'Your local provider is used directly from this browser.');
    settingsDialog = dialog;
    const body = dialog.querySelector('.drlt-body'); body.innerHTML = '';
    const form = document.createElement('form'); form.className = 'drlt-settings';
    const fields = [
        ['providerBaseUrl', 'Provider base URL', 'url', 'OpenAI-compatible URL, e.g. http://127.0.0.1:1234/v1'],
        ['providerApiKey', 'Provider API key', 'password', 'Optional — leave blank for LM Studio'],
        ['maxContextTokens', 'Maximum context size (tokens)', 'number', 'Default: 4096'],
        ['retryCount', 'Retry on failure (times)', 'number', 'Set to 0 to disable retries']
    ];
    fields.forEach(([key, label, type, hint]) => addField(form, key, label, type, settings[key], hint));
    const modelRow = document.createElement('label');
    modelRow.innerHTML = '<span>Translation model</span><select name="translationModel"></select><small>Fetched from the provider. The default model is used if blank.</small>';
    // A general default is retained for future LLM tasks, while subtitles may
    // override it.
    const translationSelect = modelRow.querySelector('select');
    translationSelect.append(new Option(settings.translationModel || 'Use default model', settings.translationModel || ''));
    const defaultRow = document.createElement('label');
    defaultRow.innerHTML = '<span>Default model</span><select name="defaultModel"></select><small>Fallback for LLM tasks unless they choose a specific model.</small>';
    const defaultSelect = defaultRow.querySelector('select');
    defaultSelect.append(new Option(settings.defaultModel || 'Fetch models to choose…', settings.defaultModel || ''));
    form.appendChild(defaultRow);
    form.appendChild(modelRow);
    const refresh = addButton(form, 'Refresh models', 'secondary', async () => {
        refresh.disabled = true; refresh.textContent = 'Loading…';
        try { const draft = Object.fromEntries(new FormData(form)); const models = await fetchModels(draft); populateModelSelects(form, models); }
        catch (error) { showFormMessage(form, error.message, true); }
        finally { refresh.disabled = false; refresh.textContent = 'Refresh models'; }
    });
    ['providerBaseUrl', 'providerApiKey'].forEach((name) => form.elements[name].addEventListener('change', () => refresh.click()));
    addSelect(form, 'subtitleStrategy', 'Translation batching', settings.subtitleStrategy, [['merged', 'One merged subtitle job'], ['per-vtt', 'Translate each VTT separately']], 'Merged gives the agent more context; per-VTT uses less context.');
    addSelect(form, 'subtitleRequestMode', 'When a subtitle playlist is detected', settings.subtitleRequestMode, [['ask', 'Ask before translating'], ['auto', 'Translate automatically']], 'The default is to ask.');
    addCheck(form, 'preserveDanishSubs', 'Keep Danish subtitles visible alongside English', settings.preserveDanishSubs);
    addCheck(form, 'enableSubtitleCache', 'Cache completed translations in the subtitle library', settings.enableSubtitleCache);
    addCheck(form, 'autoPruneByCount', 'Automatically prune the library by number of subtitle sets', settings.autoPruneByCount);
    addField(form, 'pruneMaxItems', 'Maximum cached subtitle sets', 'number', settings.pruneMaxItems, 'Default: 100. Used only when automatic count pruning is enabled.');
    addCheck(form, 'autoPruneByAge', 'Automatically prune the library by age', settings.autoPruneByAge);
    addField(form, 'pruneMaxDays', 'Maximum cache age (days)', 'number', settings.pruneMaxDays, 'Default: 365. Used only when automatic age pruning is enabled.');
    addCheck(form, 'developerLogging', 'Developer logging in browser console', settings.developerLogging);
    addCheck(form, 'completionSound', 'Play a short sound when translation finishes', settings.completionSound);
    addField(form, 'completionVolume', 'Completion sound volume', 'number', settings.completionVolume, '0 to 1');
    const usage = document.createElement('details'); usage.innerHTML = '<summary>Per-model token usage</summary><pre></pre>'; usage.querySelector('pre').textContent = JSON.stringify(getMetrics(), null, 2) || '{}'; form.appendChild(usage);
    body.appendChild(form);
    const actions = dialog.querySelector('.drlt-actions');
    addButton(actions, 'Cancel', 'secondary', () => removeNode(dialog));
    addButton(actions, 'Save settings', 'primary', () => { const data = Object.fromEntries(new FormData(form)); ['maxContextTokens', 'retryCount', 'completionVolume', 'pruneMaxItems', 'pruneMaxDays'].forEach((key) => { data[key] = Number(data[key]); }); ['preserveDanishSubs', 'enableSubtitleCache', 'autoPruneByCount', 'autoPruneByAge', 'developerLogging', 'completionSound'].forEach((key) => { data[key] = form.elements[key].checked; }); saveSettings(data); if (settings.autoPruneByCount || settings.autoPruneByAge) pruneSubtitleLibrary().catch((error) => console.warn(`${SCRIPT_ID}: automatic pruning failed`, error)); removeNode(dialog); });
    document.body.appendChild(dialog);
    fetchModels().then((models) => populateModelSelects(form, models)).catch((error) => showFormMessage(form, `Models could not be fetched yet: ${error.message}`, true));
}

function populateModelSelects(form, models) {
    const defaultSelect = form.elements.defaultModel;
    const translationSelect = form.elements.translationModel;
    const previousDefault = defaultSelect.value;
    const previousTranslation = translationSelect.value;
    defaultSelect.innerHTML = '';
    defaultSelect.append(new Option('Choose a default model…', ''));
    models.forEach((model) => defaultSelect.append(new Option(model, model)));
    defaultSelect.value = models.includes(previousDefault) ? previousDefault : '';
    translationSelect.innerHTML = '';
    translationSelect.append(new Option('Use default model', ''));
    models.forEach((model) => translationSelect.append(new Option(model, model)));
    translationSelect.value = models.includes(previousTranslation) ? previousTranslation : '';
}

function addField(form, key, label, type, value, hint) { const wrap = document.createElement('label'); wrap.innerHTML = `<span>${label}</span><input name="${key}" type="${type}"><small>${hint}</small>`; const input = wrap.querySelector('input'); input.value = value === undefined || value === null ? '' : value; if (type === 'number') { input.step = key === 'completionVolume' ? '0.05' : '1'; input.min = '0'; } form.appendChild(wrap); return wrap; }
function addSelect(form, key, label, value, options, hint) { const wrap = document.createElement('label'); wrap.innerHTML = `<span>${label}</span><select name="${key}"></select><small>${hint}</small>`; options.forEach(([optionValue, text]) => wrap.querySelector('select').append(new Option(text, optionValue))); wrap.querySelector('select').value = value; form.appendChild(wrap); return wrap; }
function addCheck(form, key, label, checked) { const wrap = document.createElement('label'); wrap.className = 'drlt-check'; wrap.innerHTML = `<input name="${key}" type="checkbox"><span>${label}</span>`; wrap.querySelector('input').checked = Boolean(checked); form.appendChild(wrap); }
function showFormMessage(form, message, error) { let node = form.querySelector('.drlt-form-message'); if (!node) { node = document.createElement('p'); node.className = 'drlt-form-message'; form.prepend(node); } node.textContent = message; node.classList.toggle('error', Boolean(error)); }

function ensureStyles() {
    if (document.getElementById(`${SCRIPT_ID}-styles`)) return;
    const style = document.createElement('style'); style.id = `${SCRIPT_ID}-styles`;
    style.textContent = `.drlt-dialog,.drlt-progress{position:fixed;z-index:2147483647;font:14px/1.4 system-ui,sans-serif;color:#f7f7f7}.drlt-dialog{inset:0;padding:16px;background:#0009;display:grid;place-items:center}.drlt-card,.drlt-progress-card{background:#20242d;border:1px solid #505969;border-radius:12px;box-shadow:0 14px 50px #0008}.drlt-card{box-sizing:border-box;width:min(900px,100%);max-height:calc(100vh - 32px);padding:20px;display:flex;flex-direction:column}.drlt-card header{display:flex;flex:none;justify-content:space-between;align-items:start}.drlt-card h2{margin:0;font-size:20px}.drlt-card .drlt-body{min-height:0;overflow:auto;padding-right:4px}.drlt-close{border:0;background:none;color:#fff;font-size:28px;line-height:1;cursor:pointer}.drlt-muted,small{color:#bac2d0}.drlt-actions,.drlt-library-actions,.drlt-library-controls{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:20px}.drlt-card>.drlt-actions{flex:none}.drlt-button{border:0;border-radius:7px;padding:9px 13px;cursor:pointer;font-weight:600}.drlt-button.primary{background:#f4ba4d;color:#1b2029}.drlt-button.secondary{background:#3a4352;color:#fff}.drlt-progress{right:18px;bottom:18px;width:min(420px,calc(100vw - 36px))}.drlt-progress-card{padding:15px;display:grid;gap:8px}.drlt-progress-card.error{border-color:#d96a6a}.drlt-progress progress{width:100%;accent-color:#f4ba4d}.drlt-log-toggle{justify-self:start;background:none;color:#ffd78c;border:0;padding:0;cursor:pointer}.drlt-agent-log{max-height:190px;overflow:auto;margin:0;padding:10px;background:#14171d;border-radius:7px;white-space:pre-wrap;font:12px/1.45 ui-monospace,monospace}.drlt-settings{display:grid;gap:13px}.drlt-settings label:not(.drlt-check){display:grid;gap:4px}.drlt-settings input:not([type=checkbox]),.drlt-settings select,.drlt-library-list,.drlt-library-controls input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #596274;border-radius:6px;background:#151921;color:#fff}.drlt-check{display:flex;gap:8px;align-items:center;min-height:20px;line-height:1.2}.drlt-check input{box-sizing:border-box;width:16px;height:16px;margin:0;flex:none;accent-color:#f4ba4d}.drlt-form-message.error{color:#ff9b9b}.drlt-settings details{padding-top:6px}.drlt-settings pre{max-height:140px;overflow:auto;background:#14171d;padding:8px;border-radius:6px}.drlt-library-controls{align-items:end;justify-content:start;margin:10px 0}.drlt-library-controls label{display:grid;gap:4px;flex:1}.drlt-library-viewer{margin-top:14px}.drlt-library-actions{justify-content:start;margin:8px 0}.drlt-comparison{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1px;background:#4b5463;max-height:48vh;overflow:auto}.drlt-comparison>*{padding:8px;background:#171b22;white-space:pre-wrap}.drlt-comparison strong{background:#303846}.drlt-comparison .drlt-cue-number{grid-column:1/-1;padding:5px 8px;background:#252c37}`;
    document.head.appendChild(style);
}

GM_registerMenuCommand('DR Live Translate v2: Settings', openSettings);
GM_registerMenuCommand('DR Live Translate v2: Subtitle library', openSubtitleLibrary);
installFetchObserver();
installResourceObserver();
