// ==UserScript==
// @name         Fancy notes for Clues by Sam
// @namespace    https://mathemaniac.org/
// @version      1.0.0
// @description  Feel limited by corner notes? This adds a fancier note-taking system on top of Clues by Sam.
// @match        https://cluesbysam.com/*
// @match        https://www.cluesbysam.com/*
// @copyright    2026, Sebastian Paaske Tørholm
// @grant        none
// @license      MIT
// ==/UserScript==
/* jshint -W097 */
'use strict';

const _wrap_ident = (name) => `xx-fancynotes-${name}-xx`;

const STATE_VERSION = 1;
const STORAGE_PREFIX = 'cluesbysam:fancy-notes:v1:';

const TOOL_ROW_ID = _wrap_ident('tool-row');
const STYLE_ID = _wrap_ident('style');
const EDIT_PANEL_ID = _wrap_ident('edit-panel');
const MANAGE_DIALOG_ID = _wrap_ident('manage-dialog');
const OPTIONS_DIALOG_ID = _wrap_ident('options-dialog');

const ADD_NOTE_BUTTON_ID = _wrap_ident('add-note-button');
const MANAGE_NOTES_BUTTON_ID = _wrap_ident('manage-notes-button');
const OPTIONS_BUTTON_ID = _wrap_ident('options-button');

const OWN_CLASS = _wrap_ident('owned');
const MARKER_LAYER_CLASS = _wrap_ident('marker-layer');
const TARGET_MARKER_LAYER_CLASS = _wrap_ident('target-marker-layer');
const SOURCE_MARKER_LAYER_CLASS = _wrap_ident('source-marker-layer');
const MARKER_CLASS = _wrap_ident('marker');
const CELL_EDITOR_CLASS = _wrap_ident('cell-editor');
const EDITING_GRID_CLASS = _wrap_ident('editing-grid');
const ACTIVE_CELL_CLASS = _wrap_ident('active-cell');
const SOURCE_SELECTED_CLASS = _wrap_ident('source-selected');
const TARGET_SELECTED_CLASS = _wrap_ident('target-selected');
const PREVIEW_SOURCE_CLASS = _wrap_ident('preview-source');
const PREVIEW_TARGET_CLASS = _wrap_ident('preview-target');
const EDIT_PANEL_CLASS = _wrap_ident('edit-panel');
const DIALOG_BACKDROP_CLASS = _wrap_ident('dialog-backdrop');
const DIALOG_CLASS = _wrap_ident('dialog');
const DIALOG_NOTE_CLASS = _wrap_ident('dialog-note');

const OWN_MUTATED_CLASSES = new Set([
    EDITING_GRID_CLASS,
    ACTIVE_CELL_CLASS,
    SOURCE_SELECTED_CLASS,
    TARGET_SELECTED_CLASS,
]);

const DEFAULT_SETTINGS = Object.freeze({
    autoPrune: true,
    popSound: true,
    popVolume: 0.35,
    markerStyle: 'tabs',
});

const NOTE_COLORS = Object.freeze([
    '#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9',
    '#F0E442', '#6A3D9A', '#E7298A', '#66A61E', '#A6761D', '#1B9E77',
]);

let storageKey = null;
let state = null;
let currentDraft = null;
let mutationObserver = null;
let renderQueued = false;
let pruneQueued = false;

function installStyling() {
    if (document.getElementById(STYLE_ID)) return;

    document.head.insertAdjacentHTML('beforeend', `
        <style id="${STYLE_ID}" class="${OWN_CLASS}">
            .card-container { position: relative; }

            .${MARKER_LAYER_CLASS} {
                position: absolute; left: 7px; right: 7px; display: flex; gap: 3px;
                pointer-events: none; z-index: 12;
            }
            .${TARGET_MARKER_LAYER_CLASS} { top: 5px; }
            .${SOURCE_MARKER_LAYER_CLASS} { bottom: 5px; justify-content: flex-end; }
            .${MARKER_CLASS} {
                --note-color: #777; min-width: 14px; height: 7px; flex: 0 1 28px;
                border-radius: 999px; background: var(--note-color);
                border: 1px solid rgba(255,255,255,.82); box-shadow: 0 1px 2px rgba(0,0,0,.45);
                pointer-events: auto; cursor: pointer; touch-action: manipulation; padding: 0; min-height: 0; box-sizing: border-box; appearance: none;
            }
            .${SOURCE_MARKER_LAYER_CLASS} .${MARKER_CLASS} {
                height: 10px; min-width: 10px; max-width: 10px; border-radius: 50%;
                outline: 1px solid rgba(0,0,0,.28);
            }

            .${EDITING_GRID_CLASS} .card { filter: brightness(.62); }
            .${EDITING_GRID_CLASS} .card-container.${SOURCE_SELECTED_CLASS} .card,
            .${EDITING_GRID_CLASS} .card-container.${TARGET_SELECTED_CLASS} .card,
            .${EDITING_GRID_CLASS} .card-container.${ACTIVE_CELL_CLASS} .card { filter: brightness(.88); }
            .${EDITING_GRID_CLASS} .card-container.${SOURCE_SELECTED_CLASS} .card { box-shadow: inset 0 0 0 4px var(--current-note-color, #fff); }
            .${EDITING_GRID_CLASS} .card-container.${TARGET_SELECTED_CLASS} .card { outline: 4px solid var(--current-note-color, #fff); outline-offset: -4px; }
            .card-container.${PREVIEW_SOURCE_CLASS} .card { box-shadow: inset 0 0 0 4px var(--current-note-color, #fff); }
            .card-container.${PREVIEW_TARGET_CLASS} .card { outline: 4px solid var(--current-note-color, #fff); outline-offset: -4px; }

            .${CELL_EDITOR_CLASS} {
                position: absolute; inset: 6px; z-index: 25; display: grid; grid-template-columns: minmax(0, 1fr);
                gap: 3px; align-content: center; opacity: 0; pointer-events: none;
            }
            .${EDITING_GRID_CLASS} .card-container:hover .${CELL_EDITOR_CLASS},
            .${EDITING_GRID_CLASS} .card-container:focus-within .${CELL_EDITOR_CLASS},
            .${EDITING_GRID_CLASS} .card-container.${ACTIVE_CELL_CLASS} .${CELL_EDITOR_CLASS} { opacity: 1; pointer-events: auto; }
            .${CELL_EDITOR_CLASS} button {
                min-height: 27px; padding: 2px 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,.7);
                background: rgba(20,20,20,.9); color: white; font-size: 10px; font-weight: 700; line-height: 1;
                box-shadow: 0 2px 8px rgba(0,0,0,.35); touch-action: manipulation;
            }
            .${CELL_EDITOR_CLASS} button[aria-pressed="true"] { background: var(--current-note-color, #0072B2); color: white; }

            .${EDIT_PANEL_CLASS} {
                position: sticky; bottom: 0; z-index: 40; margin: 6px auto; padding: 8px; display: grid; grid-template-columns: 1fr;
                gap: 6px; max-width: min(96vw, 520px); border-radius: 12px; background: rgba(18,18,18,.92); color: white;
                box-shadow: 0 3px 16px rgba(0,0,0,.4);
            }
            .${EDIT_PANEL_CLASS} .${_wrap_ident('edit-panel-title')} { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
            .${EDIT_PANEL_CLASS} .${_wrap_ident('swatch')} { width: 18px; height: 18px; border-radius: 50%; display: inline-block; border: 2px solid white; background: var(--current-note-color, #0072B2); flex: 0 0 auto; vertical-align: middle; }
            .${EDIT_PANEL_CLASS} .${_wrap_ident('edit-actions')} { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
            .${EDIT_PANEL_CLASS} button, .${DIALOG_CLASS} button { min-height: 38px; border-radius: 9px; touch-action: manipulation; }
            .${EDIT_PANEL_CLASS} .${_wrap_ident('danger')}, .${DIALOG_CLASS} .${_wrap_ident('danger')} { color: #fff; background: #a02525; border-color: #a02525; }

            .${DIALOG_BACKDROP_CLASS} { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 12px; background: rgba(0,0,0,.55); }
            .${DIALOG_CLASS} { width: min(94vw, 520px); max-height: min(86vh, 720px); overflow: auto; padding: 14px; border-radius: 14px; background: #181818; color: #f5f5f5; box-shadow: 0 8px 30px rgba(0,0,0,.6); }
            .${DIALOG_CLASS} h2 { margin: 0 0 10px; font-size: 20px; }
            .${DIALOG_CLASS} label { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin: 10px 0; }
            .${DIALOG_CLASS} input[type="range"] { width: 100%; }
            .${DIALOG_CLASS} select { background: #292929; color: #f5f5f5; border: 1px solid #666; border-radius: 6px; padding: 4px; }
            .${DIALOG_CLASS} option { background: #292929; color: #f5f5f5; }
            .${DIALOG_CLASS} button { background: #303030; color: #f5f5f5; border: 1px solid #777; }
            .${DIALOG_CLASS} .${_wrap_ident('dialog-actions')} { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
            .${DIALOG_NOTE_CLASS} { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: start; padding: 9px 0; border-top: 1px solid #444; }
            .${DIALOG_NOTE_CLASS}:first-of-type { border-top: 0; }
            .${DIALOG_NOTE_CLASS} .${_wrap_ident('note-summary')} { font-size: 13px; line-height: 1.35; }
            .${DIALOG_NOTE_CLASS} .${_wrap_ident('note-actions')} { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
            .${DIALOG_NOTE_CLASS} .${_wrap_ident('swatch')} { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(0,0,0,.35); background: var(--note-color, #777); }

            @media (max-width: 430px) {
                .${CELL_EDITOR_CLASS} { inset: 4px; gap: 3px; }
                .${CELL_EDITOR_CLASS} button { min-height: 25px; padding: 2px 4px; font-size: 10px; }
                .${EDIT_PANEL_CLASS} .${_wrap_ident('edit-actions')} { grid-template-columns: repeat(2, 1fr); }
            }
        </style>
    `);
}

function installGUI() {
    const bottomSection = document.querySelector('#root > .bottom');
    if (!bottomSection) return false;

    if (!document.getElementById(TOOL_ROW_ID)) {
        bottomSection.insertAdjacentHTML('afterbegin', `
            <div class="row ${OWN_CLASS}" id="${TOOL_ROW_ID}">
                <button id="${ADD_NOTE_BUTTON_ID}" type="button">Add note</button>
                <button id="${MANAGE_NOTES_BUTTON_ID}" type="button">Manage notes</button>
                <button id="${OPTIONS_BUTTON_ID}" type="button">Note options</button>
            </div>
        `);
        document.getElementById(ADD_NOTE_BUTTON_ID).addEventListener('click', () => enterEditMode(null));
        document.getElementById(MANAGE_NOTES_BUTTON_ID).addEventListener('click', openManageDialog);
        document.getElementById(OPTIONS_BUTTON_ID).addEventListener('click', openOptionsDialog);
    }

    return true;
}

function initializeModule() {
    installStyling();
    if (!getGrid() || !installGUI()) {
        window.setTimeout(initializeModule, 250);
        return;
    }

    storageKey = buildStorageKey();
    state = loadState();
    installMutationObserver();
    renderNotes();
    queuePrune();
}

function getGrid() { return document.querySelector('#grid.card-grid') || document.querySelector('#grid'); }
function getCardContainers() {
    const grid = getGrid();
    if (!grid) return [];
    return Array.from(grid.children).filter((child) => child.classList && child.classList.contains('card-container'));
}
function getCard(container) { return container ? container.querySelector('.card') : null; }
function getCoord(container) { const coord = container ? container.querySelector('.coord') : null; return coord ? coord.textContent.trim() : null; }
function getName(container) { const name = container ? container.querySelector('.name h3, h3.name') : null; return name ? name.textContent.trim() : ''; }
function getProfession(container) { const profession = container ? container.querySelector('.profession') : null; return profession ? profession.textContent.trim() : ''; }
function getContainerByCoord(coord) { return getCardContainers().find((container) => getCoord(container) === coord) || null; }
function isFlippedCoord(coord) { const card = getCard(getContainerByCoord(coord)); return Boolean(card && card.classList.contains('flipped')); }

function buildStorageKey() {
    const roster = getCardContainers().map((container) => `${getCoord(container)}:${getName(container)}:${getProfession(container)}`).join('|');
    const dailyText = Array.from(document.querySelectorAll('#root p')).map((node) => node.textContent.trim()).find((text) => text.includes('Daily Clues by Sam')) || location.pathname;
    return `${STORAGE_PREFIX}${hashString(`${location.host}|${dailyText}|${roster}`)}`;
}

function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function loadState() {
    const fallback = { version: STATE_VERSION, notes: [], settings: { ...DEFAULT_SETTINGS } };
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return {
            version: STATE_VERSION,
            notes: Array.isArray(parsed.notes) ? parsed.notes.map(normalizeNote).filter(Boolean) : [],
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
    } catch (error) {
        console.warn('FancyNotes: failed to load saved notes', error);
        return fallback;
    }
}

function normalizeNote(note) {
    if (!note || typeof note !== 'object') return null;
    const colorIndex = Number.isInteger(note.colorIndex) ? note.colorIndex : 0;
    return {
        id: String(note.id || createId()),
        colorIndex,
        color: NOTE_COLORS[colorIndex % NOTE_COLORS.length],
        sources: uniqueCoordList(note.sources),
        targets: uniqueCoordList(note.targets),
        createdAt: Number(note.createdAt || Date.now()),
        updatedAt: Number(note.updatedAt || Date.now()),
    };
}

function uniqueCoordList(values) {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.map(String).filter((value) => /^[A-D][1-5]$/.test(value))));
}
function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function createId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

function chooseNextColorIndex() {
    const active = new Set(state.notes.map((note) => note.colorIndex % NOTE_COLORS.length));
    for (let index = 0; index < NOTE_COLORS.length; index += 1) {
        if (!active.has(index)) return index;
    }
    return state.notes.length % NOTE_COLORS.length;
}

function getRenderableNotes() {
    if (!currentDraft) return state.notes;
    const draftNote = draftToNote(currentDraft);
    return [...state.notes.filter((note) => note.id !== currentDraft.id), draftNote];
}

function renderNotes() {
    const grid = getGrid();
    if (!grid || !state) return;

    getCardContainers().forEach((container) => {
        container.querySelectorAll(`.${MARKER_LAYER_CLASS}, .${CELL_EDITOR_CLASS}`).forEach((node) => node.remove());
        container.classList.remove(ACTIVE_CELL_CLASS, SOURCE_SELECTED_CLASS, TARGET_SELECTED_CLASS, PREVIEW_SOURCE_CLASS, PREVIEW_TARGET_CLASS);
        container.style.removeProperty('--current-note-color');
    });

    const notes = getRenderableNotes();
    getCardContainers().forEach((container) => {
        const coord = getCoord(container);
        const targetNotes = notes.filter((note) => note.targets.includes(coord));
        const sourceNotes = notes.filter((note) => note.sources.includes(coord));

        if (targetNotes.length > 0) container.appendChild(createMarkerLayer(targetNotes, TARGET_MARKER_LAYER_CLASS, coord, 'target'));
        if (sourceNotes.length > 0) container.appendChild(createMarkerLayer(sourceNotes, SOURCE_MARKER_LAYER_CLASS, coord, 'source'));
        if (currentDraft) renderCellEditor(container, coord);
    });

    grid.classList.toggle(EDITING_GRID_CLASS, Boolean(currentDraft));
    if (currentDraft) grid.style.setProperty('--current-note-color', currentDraft.color);
    else grid.style.removeProperty('--current-note-color');
    updateEditPanel();
}

function createMarkerLayer(notes, layerClass, coord, role) {
    const layer = document.createElement('div');
    layer.className = `${MARKER_LAYER_CLASS} ${layerClass} ${OWN_CLASS}`;
    notes.forEach((note) => {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = `${MARKER_CLASS} ${OWN_CLASS}`;
        marker.style.setProperty('--note-color', note.color);
        marker.title = describeNote(note, coord, role);
        marker.setAttribute('aria-label', `Edit FancyNotes note for ${coord}`);
        marker.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            enterEditMode(note.id);
        });
        marker.addEventListener('pointerenter', () => showNotePreview(note));
        marker.addEventListener('pointerleave', clearNotePreview);
        marker.addEventListener('focus', () => showNotePreview(note));
        marker.addEventListener('blur', clearNotePreview);
        layer.appendChild(marker);
    });
    return layer;
}

function describeNote(note, coord, role) {
    const sources = note.sources.length > 0 ? note.sources.join(', ') : 'none';
    const targets = note.targets.length > 0 ? note.targets.join(', ') : 'none';
    return `${role === 'source' ? 'Source' : 'Target'} ${coord}. Sources: ${sources}. Targets: ${targets}.`;
}

function showNotePreview(note) {
    if (currentDraft) return;
    getCardContainers().forEach((container) => {
        const coord = getCoord(container);
        const isSource = note.sources.includes(coord);
        const isTarget = note.targets.includes(coord);
        container.classList.toggle(PREVIEW_SOURCE_CLASS, isSource);
        container.classList.toggle(PREVIEW_TARGET_CLASS, isTarget);
        if (isSource || isTarget) container.style.setProperty('--current-note-color', note.color);
        else container.style.removeProperty('--current-note-color');
    });
}

function clearNotePreview() {
    if (currentDraft) return;
    getCardContainers().forEach((container) => {
        container.classList.remove(PREVIEW_SOURCE_CLASS, PREVIEW_TARGET_CLASS);
        container.style.removeProperty('--current-note-color');
    });
}

function renderCellEditor(container, coord) {
    const sourceSelected = currentDraft.sources.has(coord);
    const targetSelected = currentDraft.targets.has(coord);
    container.classList.toggle(SOURCE_SELECTED_CLASS, sourceSelected);
    container.classList.toggle(TARGET_SELECTED_CLASS, targetSelected);
    container.style.setProperty('--current-note-color', currentDraft.color);

    const editor = document.createElement('div');
    editor.className = `${CELL_EDITOR_CLASS} ${OWN_CLASS}`;
    editor.innerHTML = `
        <button type="button" data-role="source" aria-pressed="${sourceSelected ? 'true' : 'false'}">Source</button>
        <button type="button" data-role="target" aria-pressed="${targetSelected ? 'true' : 'false'}">Target</button>
    `;
    editor.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-role]');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveCell(coord);
        toggleDraftCoord(button.dataset.role, coord);
    });

    container.removeEventListener('click', handleEditCellActivation, { capture: true });
    container.addEventListener('click', handleEditCellActivation, { capture: true });
    container.addEventListener('pointerenter', handleEditCellPointerEnter);
    container.appendChild(editor);
}

function handleEditCellPointerEnter(event) {
    if (!currentDraft) return;
    const coord = getCoord(event.currentTarget);
    if (coord) setActiveCell(coord);
}

function handleEditCellActivation(event) {
    if (!currentDraft) return;
    if (event.target.closest(`.${MARKER_CLASS}, .${CELL_EDITOR_CLASS} button`)) return;
    const coord = getCoord(event.currentTarget);
    if (!coord) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveCell(coord);
}

function setActiveCell(coord) {
    getCardContainers().forEach((container) => container.classList.toggle(ACTIVE_CELL_CLASS, getCoord(container) === coord));
}

function toggleDraftCoord(role, coord) {
    const bucket = role === 'source' ? currentDraft.sources : currentDraft.targets;
    if (bucket.has(coord)) bucket.delete(coord);
    else bucket.add(coord);
    currentDraft.updatedAt = Date.now();
    renderNotes();
}

function enterEditMode(noteId) {
    const existing = noteId ? state.notes.find((note) => note.id === noteId) : null;
    const colorIndex = existing ? existing.colorIndex : chooseNextColorIndex();
    currentDraft = {
        id: existing ? existing.id : createId(),
        isNew: !existing,
        colorIndex,
        color: NOTE_COLORS[colorIndex % NOTE_COLORS.length],
        sources: new Set(existing ? existing.sources : []),
        targets: new Set(existing ? existing.targets : []),
        createdAt: existing ? existing.createdAt : Date.now(),
        updatedAt: Date.now(),
    };
    closeDialog(MANAGE_DIALOG_ID);
    installEditPanel();
    renderNotes();
}

function installEditPanel() {
    if (document.getElementById(EDIT_PANEL_ID)) return;
    const bottomSection = document.querySelector('#root > .bottom') || document.querySelector('#root');
    if (!bottomSection) return;
    bottomSection.insertAdjacentHTML('afterbegin', `
        <div id="${EDIT_PANEL_ID}" class="${EDIT_PANEL_CLASS} ${OWN_CLASS}">
            <div class="${_wrap_ident('edit-panel-title')}">
                <span><span class="${_wrap_ident('swatch')}"></span> <span data-field="title"></span></span>
                <span data-field="counts"></span>
            </div>
            <div class="${_wrap_ident('edit-actions')}">
                <button type="button" data-action="save">Save</button>
                <button type="button" data-action="cancel">Cancel</button>
                <button type="button" data-action="clear-targets">Clear targets</button>
                <button type="button" data-action="delete" class="${_wrap_ident('danger')}">Delete</button>
            </div>
        </div>
    `);
    document.getElementById(EDIT_PANEL_ID).addEventListener('click', handleEditPanelClick);
}

function updateEditPanel() {
    const panel = document.getElementById(EDIT_PANEL_ID);
    if (!panel) return;
    if (!currentDraft) { panel.remove(); return; }
    panel.style.setProperty('--current-note-color', currentDraft.color);
    panel.querySelector('[data-field="title"]').textContent = currentDraft.isNew ? 'New note' : 'Edit note';
    panel.querySelector('[data-field="counts"]').textContent = `${currentDraft.sources.size} source${currentDraft.sources.size === 1 ? '' : 's'} · ${currentDraft.targets.size} target${currentDraft.targets.size === 1 ? '' : 's'}`;
    panel.querySelector('[data-action="delete"]').textContent = currentDraft.isNew ? 'Scrap' : 'Delete';
}

function handleEditPanelClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !currentDraft) return;
    if (button.dataset.action === 'save') saveDraft();
    else if (button.dataset.action === 'cancel') exitEditMode();
    else if (button.dataset.action === 'clear-targets') { currentDraft.targets.clear(); renderNotes(); }
    else if (button.dataset.action === 'delete') deleteCurrentDraft();
}

function saveDraft() {
    if (currentDraft.targets.size === 0) {
        window.alert('A FancyNotes note needs at least one target cell.');
        return;
    }
    const note = draftToNote(currentDraft);
    const index = state.notes.findIndex((candidate) => candidate.id === note.id);
    if (index >= 0) state.notes[index] = note;
    else state.notes.push(note);
    saveState();
    exitEditMode();
    queuePrune();
}

function draftToNote(draft) {
    return {
        id: draft.id,
        colorIndex: draft.colorIndex,
        color: draft.color,
        sources: Array.from(draft.sources).sort(compareCoords),
        targets: Array.from(draft.targets).sort(compareCoords),
        createdAt: draft.createdAt,
        updatedAt: Date.now(),
    };
}

function compareCoords(a, b) {
    const rowA = Number(a.slice(1));
    const rowB = Number(b.slice(1));
    if (rowA !== rowB) return rowA - rowB;
    return a.charCodeAt(0) - b.charCodeAt(0);
}

function deleteCurrentDraft() {
    if (!currentDraft) return;
    if (!currentDraft.isNew) {
        state.notes = state.notes.filter((note) => note.id !== currentDraft.id);
        saveState();
    }
    exitEditMode();
}

function exitEditMode() {
    currentDraft = null;
    const panel = document.getElementById(EDIT_PANEL_ID);
    if (panel) panel.remove();
    const grid = getGrid();
    if (grid) {
        grid.classList.remove(EDITING_GRID_CLASS);
        grid.style.removeProperty('--current-note-color');
    }
    getCardContainers().forEach((container) => {
        container.classList.remove(ACTIVE_CELL_CLASS, SOURCE_SELECTED_CLASS, TARGET_SELECTED_CLASS);
        container.style.removeProperty('--current-note-color');
    });
    renderNotes();
}

function openManageDialog() {
    closeDialog(MANAGE_DIALOG_ID);
    const body = state.notes.length === 0 ? '<p>No FancyNotes notes saved for this puzzle.</p>' : state.notes.map((note) => `
        <div class="${DIALOG_NOTE_CLASS}" style="--note-color: ${escapeAttr(note.color)}">
            <span class="${_wrap_ident('swatch')}" aria-hidden="true"></span>
            <div>
                <div class="${_wrap_ident('note-summary')}">
                    <div><strong>Sources:</strong> ${escapeHtml(note.sources.join(', ') || 'none')}</div>
                    <div><strong>Targets:</strong> ${escapeHtml(note.targets.join(', ') || 'none')}</div>
                </div>
                <div class="${_wrap_ident('note-actions')}">
                    <button type="button" data-action="edit" data-note-id="${escapeAttr(note.id)}">Edit</button>
                    <button type="button" data-action="delete" data-note-id="${escapeAttr(note.id)}" class="${_wrap_ident('danger')}">Delete</button>
                </div>
            </div>
        </div>
    `).join('');

    openDialog(MANAGE_DIALOG_ID, `
        <h2>Manage FancyNotes</h2>
        ${body}
        <div class="${_wrap_ident('dialog-actions')}">
            <button type="button" data-action="add">Add note</button>
            <button type="button" data-action="close">Close</button>
        </div>
    `);
    document.getElementById(MANAGE_DIALOG_ID).addEventListener('click', handleManageDialogClick);
}

function handleManageDialogClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const noteId = button.dataset.noteId;
    if (action === 'add') enterEditMode(null);
    else if (action === 'edit') enterEditMode(noteId);
    else if (action === 'delete') {
        state.notes = state.notes.filter((note) => note.id !== noteId);
        saveState();
        renderNotes();
        openManageDialog();
    } else if (action === 'close') closeDialog(MANAGE_DIALOG_ID);
}

function openOptionsDialog() {
    closeDialog(OPTIONS_DIALOG_ID);
    const settings = state.settings;
    openDialog(OPTIONS_DIALOG_ID, `
        <h2>FancyNotes options</h2>
        <label><input type="checkbox" name="autoPrune" ${settings.autoPrune ? 'checked' : ''}><span>Automatically remove flipped target cells from notes</span></label>
        <label><input type="checkbox" name="popSound" ${settings.popSound ? 'checked' : ''}><span>Play a small pop when a note disappears</span></label>
        <label><span>Pop volume</span><input type="range" name="popVolume" min="0" max="1" step="0.05" value="${escapeAttr(String(settings.popVolume))}"></label>
        <label><span>Marker style</span><select name="markerStyle"><option value="tabs" ${settings.markerStyle === 'tabs' ? 'selected' : ''}>Cell tabs</option></select></label>
        <div class="${_wrap_ident('dialog-actions')}"><button type="button" data-action="save">Save</button><button type="button" data-action="close">Cancel</button></div>
    `);
    document.getElementById(OPTIONS_DIALOG_ID).addEventListener('click', handleOptionsDialogClick);
}

function handleOptionsDialogClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'close') { closeDialog(OPTIONS_DIALOG_ID); return; }
    const dialog = document.getElementById(OPTIONS_DIALOG_ID);
    const popVolume = Number(dialog.querySelector('[name="popVolume"]').value);
    state.settings = {
        autoPrune: dialog.querySelector('[name="autoPrune"]').checked,
        popSound: dialog.querySelector('[name="popSound"]').checked,
        popVolume: Number.isFinite(popVolume) ? Math.max(0, Math.min(1, popVolume)) : DEFAULT_SETTINGS.popVolume,
        markerStyle: dialog.querySelector('[name="markerStyle"]').value || DEFAULT_SETTINGS.markerStyle,
    };
    saveState();
    closeDialog(OPTIONS_DIALOG_ID);
    queuePrune();
}

function openDialog(id, innerHtml) {
    document.body.insertAdjacentHTML('beforeend', `<div id="${id}" class="${DIALOG_BACKDROP_CLASS} ${OWN_CLASS}"><div class="${DIALOG_CLASS}" role="dialog" aria-modal="true">${innerHtml}</div></div>`);
    document.getElementById(id).addEventListener('click', (event) => {
        if (event.target.id === id) closeDialog(id);
    });
}
function closeDialog(id) { const dialog = document.getElementById(id); if (dialog) dialog.remove(); }

function queuePrune() {
    if (pruneQueued || !state || !state.settings.autoPrune) return;
    pruneQueued = true;
    window.setTimeout(() => { pruneQueued = false; pruneFlippedTargets(); }, 120);
}

function pruneFlippedTargets() {
    if (!state || !state.settings.autoPrune || currentDraft) return;
    let changed = false;
    let removedNoteCount = 0;
    state.notes = state.notes.map((note) => {
        const previousTargetCount = note.targets.length;
        const targets = note.targets.filter((coord) => !isFlippedCoord(coord));
        if (targets.length !== previousTargetCount) changed = true;
        if (previousTargetCount > 0 && targets.length === 0) {
            removedNoteCount += 1;
            changed = true;
            return null;
        }
        return { ...note, targets };
    }).filter(Boolean);

    if (changed) { saveState(); renderNotes(); }
    if (removedNoteCount > 0) playPop(removedNoteCount);
}

function playPop(count) {
    if (!state.settings.popSound || state.settings.popVolume <= 0) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const context = new AudioContext();
        const gain = context.createGain();
        const oscillator = context.createOscillator();
        const now = context.currentTime;
        const volume = Math.min(.8, state.settings.popVolume) * Math.min(1.4, .9 + (count * .12));
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(520, now);
        oscillator.frequency.exponentialRampToValueAtTime(180, now + .07);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + .1);
        oscillator.addEventListener('ended', () => context.close());
    } catch (error) {
        console.warn('FancyNotes: failed to play pop sound', error);
    }
}

function installMutationObserver() {
    if (mutationObserver) return;
    const root = document.getElementById('root');
    if (!root) return;
    mutationObserver = new MutationObserver((mutations) => {
        const hasExternalStructureChange = mutations.some((mutation) => mutation.type === 'childList' && !isOwnMutation(mutation));
        const hasCardClassChange = mutations.some((mutation) => mutation.type === 'attributes' && mutation.target instanceof Element && mutation.target.matches('.card'));

        // The site changes classes for transient UI state. Redrawing our marker
        // layers for those changes replaces the element under the pointer and
        // causes flickering. Only a structural grid change needs a redraw.
        if (hasExternalStructureChange && !currentDraft) queueRender();
        if (hasCardClassChange) queuePrune();
    });
    mutationObserver.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
    });
}

function isOwnMutation(mutation) {
    if (mutation.target instanceof Element && mutation.target.closest(`.${OWN_CLASS}`)) return true;
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const oldClasses = new Set((mutation.oldValue || '').split(/\s+/).filter(Boolean));
        const newClasses = new Set(mutation.target.classList);
        const changedClasses = new Set([
            ...Array.from(oldClasses).filter((className) => !newClasses.has(className)),
            ...Array.from(newClasses).filter((className) => !oldClasses.has(className)),
        ]);
        if (changedClasses.size > 0 && Array.from(changedClasses).every((className) => OWN_MUTATED_CLASSES.has(className))) return true;
    }
    const changedNodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
    if (changedNodes.length === 0) return false;
    return changedNodes.every((node) => node instanceof Element && (node.classList.contains(OWN_CLASS) || Boolean(node.querySelector(`.${OWN_CLASS}`))));
}

function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(() => {
        renderQueued = false;
        installGUI();
        renderNotes();
    }, 80);
}

function escapeHtml(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function escapeAttr(value) { return escapeHtml(value); }

initializeModule();
