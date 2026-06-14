// ==UserScript==
// @name       NYTimes Strands Drawing Overlay
// @namespace  http://mathemaniac.org/
// @version    1.1.1
// @description  Adds a togglable drawing canvas overlay to the NYTimes.com Strands game.
// @match      https://www.nytimes.com/games/strands
// @copyright  2025-2026, Sebastian Paaske Tørholm
// @grant      none
// @license    MIT
// ==/UserScript==

// Changelog:
// 1.1.1 - Refresh letter positions when opening tools and require stroke to pass through letter centres to count.
// 1.1.0 - Moved to vector-based layers that can be deleted/hidden and so on.
// 1.0.0 - Initial release

(function () {
    'use strict';

    // --- Configuration ---
    const DEFAULT_BRUSH_SIZE = 30;
    const MIN_BRUSH_SIZE = 1;
    const MAX_BRUSH_SIZE = 60;
    const COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#000000']; // Red, Blue, Green, Yellow, Black
    const DEFAULT_COLOR = COLORS[0]; // Red
    const OVERLAY_OPACITY = 0.4; // 40%
    const CANVAS_BACKGROUND_COLOR = 'rgba(200, 200, 200, 0.3)'; // Slight gray tinge

    // --- Utility Functions ---
    const log = (...args) => console.log('[StrandsDrawingOverlay]', ...args);

    // --- State Management ---
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentColor = DEFAULT_COLOR;
    let currentBrushSize = DEFAULT_BRUSH_SIZE;
    let isOverlayVisible = false;
    let dpr = window.devicePixelRatio || 1; // Store Device Pixel Ratio

    // --- Layers (vector) ---
    /** @type {{id:string,name:string,visible:boolean,createdAt:number,strokes:Array<{color:string,size:number,points:Array<{nx:number,ny:number}>,letters?:string[]}>}[]} */
    let layers = [];
    /** @type {null|{color:string,size:number,points:Array<{nx:number,ny:number}>,letters:string[]}} */
    let activeStroke = null;
    let selectedLayerIds = new Set();
    let letterGridCache = []; // [{letter, rect:{left,top,right,bottom}, center:{x,y}}...]

    // --- DOM Elements ---
    let gameBoardContainer = null;
    let canvasOverlay = null;
    let ctx = null;
    let controlsContainer = null;
    let toggleButton = null;
    let colorButtons = [];
    let cursorPreview = null;

    // --- Layers UI elements ---
    let layersPanel = null;
    let layersListEl = null;
    let mergeSelectedButton = null;

    // --- Storage ---
    const getGameDate = () => {
        const dateElement = document.getElementById('portal-game-date');
        return dateElement ? dateElement.textContent.trim() : new Date().toDateString();
    };

    const getStorageKey = (suffix) => `strands_drawing_${getGameDate()}_${suffix}`;

    const safeJsonParse = (s, fallback) => {
        try { return JSON.parse(s); } catch { return fallback; }
    };

    const saveCanvasState = () => {
        // Now saves vector layers (not a single raster image)
        try {
            const payload = {
                v: 1,
                layers: layers.map(l => ({
                    id: l.id,
                    name: l.name,
                    visible: !!l.visible,
                    createdAt: l.createdAt,
                    strokes: (l.strokes || []).map(st => ({
                        color: st.color,
                        size: st.size,
                        points: (st.points || []).map(p => ({ nx: p.nx, ny: p.ny })),
                        letters: Array.isArray(st.letters) ? st.letters : undefined
                    }))
                }))
            };
            localStorage.setItem(getStorageKey('layers'), JSON.stringify(payload));
            log('Layers state saved.');
        } catch (e) {
            console.error('Failed to save layers state:', e);
        }
    };

    const loadCanvasState = () => {
        // Now loads vector layers (not a single raster image)
        const raw = localStorage.getItem(getStorageKey('layers'));
        if (!raw) return;

        const parsed = safeJsonParse(raw, null);
        if (!parsed || !Array.isArray(parsed.layers)) return;

        layers = parsed.layers
            .filter(l => l && Array.isArray(l.strokes))
            .map(l => ({
                id: String(l.id || crypto.randomUUID()),
                name: String(l.name || 'Layer'),
                visible: l.visible !== false,
                createdAt: Number(l.createdAt || Date.now()),
                strokes: l.strokes.map(st => ({
                    color: String(st.color || DEFAULT_COLOR),
                    size: Number(st.size || DEFAULT_BRUSH_SIZE),
                    points: Array.isArray(st.points) ? st.points.map(p => ({
                        nx: Math.max(0, Math.min(1, Number(p.nx))),
                        ny: Math.max(0, Math.min(1, Number(p.ny)))
                    })) : [],
                    letters: Array.isArray(st.letters) ? st.letters.map(String) : undefined
                }))
            }));

        log(`Layers state loaded (${layers.length} layers).`);
        renderAllLayers();
        rebuildLayersUI();
    };

    const saveSettings = () => {
        localStorage.setItem(getStorageKey('color'), currentColor);
        localStorage.setItem(getStorageKey('brushSize'), currentBrushSize.toString());
        log('Settings saved.');
    };

    const loadSettings = () => {
        const storedColor = localStorage.getItem(getStorageKey('color'));
        const storedBrushSize = localStorage.getItem(getStorageKey('brushSize'));

        if (storedColor && COLORS.includes(storedColor)) {
            currentColor = storedColor;
        }
        if (storedBrushSize) {
            const size = parseInt(storedBrushSize, 10);
            if (!isNaN(size) && size >= MIN_BRUSH_SIZE && size <= MAX_BRUSH_SIZE) {
                currentBrushSize = size;
            }
        }
        log('Settings loaded.');
    };

    // --- Letter grid cache (for auto layer naming) ---
    const updateLetterGridCache = () => {
        if (!gameBoardContainer) return;
        const buttons = Array.from(gameBoardContainer.querySelectorAll("button[id^='button-']"));
        letterGridCache = buttons
            .map(btn => {
                const letter = (btn.textContent || '').trim();
                if (!letter) return null;
                const r = btn.getBoundingClientRect();
                return {
                    letter,
                    rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
                    center: { x: r.left + (r.width / 2), y: r.top + (r.height / 2) }
                };
            })
            .filter(Boolean);
        log(`Letter grid cached: ${letterGridCache.length} cells.`);
    };

    const getPointToSegmentDistanceSq = (px, py, x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;

        if (dx === 0 && dy === 0) {
            const distX = px - x1;
            const distY = py - y1;
            return { distanceSq: (distX * distX) + (distY * distY), t: 0 };
        }

        const segmentLengthSq = (dx * dx) + (dy * dy);
        const rawT = (((px - x1) * dx) + ((py - y1) * dy)) / segmentLengthSq;
        const t = Math.max(0, Math.min(1, rawT));
        const closestX = x1 + (dx * t);
        const closestY = y1 + (dy * t);
        const distX = px - closestX;
        const distY = py - closestY;

        return { distanceSq: (distX * distX) + (distY * distY), t };
    };

    const getLettersTouchedBySegment = (startClientX, startClientY, endClientX, endClientY, brushSize, visitedCells = null) => {
        const strokeRadius = Math.max(1, brushSize / 2);
        const maxDistanceSq = strokeRadius * strokeRadius;

        return letterGridCache
            .map((cell, cellIndex) => {
                if (visitedCells && visitedCells.has(cellIndex)) return null;

                const hit = getPointToSegmentDistanceSq(
                    cell.center.x,
                    cell.center.y,
                    startClientX,
                    startClientY,
                    endClientX,
                    endClientY
                );

                if (hit.distanceSq > maxDistanceSq) return null;

                return {
                    letter: cell.letter,
                    cellIndex,
                    t: hit.t,
                    distanceSq: hit.distanceSq
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.t - b.t || a.distanceSq - b.distanceSq);
    };

    const makeUniqueLayerName = (base) => {
        const clean = String(base || '').trim() || 'Layer';
        const existing = new Set(layers.map(l => l.name));
        if (!existing.has(clean)) return clean;
        let i = 2;
        while (existing.has(`${clean} (${i})`)) i++;
        return `${clean} (${i})`;
    };

    // --- Rendering (composite visible layers onto single canvas) ---
    const clearCanvas = () => {
        if (!ctx || !canvasOverlay) return;
        ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    };

    const drawStrokeToCtx = (stroke, containerRect) => {
        if (!ctx || !canvasOverlay) return;
        const pts = stroke.points || [];
        if (pts.length < 2) return;

        ctx.globalCompositeOperation = 'source-over';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = (stroke.size || DEFAULT_BRUSH_SIZE) * dpr;
        ctx.globalAlpha = 1;

        ctx.beginPath();
        const first = pts[0];
        ctx.moveTo(first.nx * containerRect.width * dpr, first.ny * containerRect.height * dpr);
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            ctx.lineTo(p.nx * containerRect.width * dpr, p.ny * containerRect.height * dpr);
        }
        ctx.stroke();
    };

    const renderAllLayers = () => {
        if (!ctx || !canvasOverlay || !gameBoardContainer) return;
        const containerRect = gameBoardContainer.getBoundingClientRect();
        clearCanvas();
        for (const layer of layers) {
            if (!layer.visible) continue;
            for (const stroke of (layer.strokes || [])) drawStrokeToCtx(stroke, containerRect);
        }
    };

    // --- Canvas Logic ---
    const startDrawing = (e) => {
        isDrawing = true;
        updateLetterGridCache();

        const [cssX, cssY] = getCanvasCoordinates(e);
        const rect = canvasOverlay.getBoundingClientRect();
        const nx = rect.width ? (cssX / rect.width) : 0;
        const ny = rect.height ? (cssY / rect.height) : 0;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        activeStroke = {
            color: currentColor,
            size: currentBrushSize,
            points: [{ nx, ny }],
            letters: [],
            visitedCells: new Set()
        };

        const hitResults = getLettersTouchedBySegment(
            clientX,
            clientY,
            clientX,
            clientY,
            activeStroke.size,
            activeStroke.visitedCells
        );
        hitResults.forEach(hitResult => {
            activeStroke.letters.push(hitResult.letter);
            activeStroke.visitedCells.add(hitResult.cellIndex);
        });

        lastX = cssX * dpr;
        lastY = cssY * dpr;
    };

    const draw = (e) => {
        if (!isDrawing || !isOverlayVisible || !ctx || !canvasOverlay || !activeStroke) return;

        const [cssX, cssY] = getCanvasCoordinates(e);
        const rect = canvasOverlay.getBoundingClientRect();
        const nx = rect.width ? (cssX / rect.width) : 0;
        const ny = rect.height ? (cssY / rect.height) : 0;
        const previousPoint = activeStroke.points[activeStroke.points.length - 1];

        activeStroke.points.push({ nx, ny });

        // auto-name sampling: collect unique letters in order when the stroke crosses cell centres
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const previousClientX = rect.left + (previousPoint.nx * rect.width);
        const previousClientY = rect.top + (previousPoint.ny * rect.height);
        const hitResults = getLettersTouchedBySegment(
            previousClientX,
            previousClientY,
            clientX,
            clientY,
            activeStroke.size,
            activeStroke.visitedCells
        );
        hitResults.forEach(hitResult => {
            activeStroke.letters.push(hitResult.letter);
            activeStroke.visitedCells.add(hitResult.cellIndex);
        });

        // live draw (only the incremental segment) for responsiveness
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentBrushSize * dpr;
        ctx.globalAlpha = 1;

        const currentX = cssX * dpr;
        const currentY = cssY * dpr;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        lastX = currentX;
        lastY = currentY;
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;

        const stroke = activeStroke;
        activeStroke = null;

        if (!stroke || !stroke.points || stroke.points.length < 2) return;

        const baseName = (stroke.letters && stroke.letters.length)
            ? stroke.letters.join('')
            : `Layer ${layers.length + 1}`;

        layers.push({
            id: crypto.randomUUID(),
            name: makeUniqueLayerName(baseName),
            visible: true,
            createdAt: Date.now(),
            strokes: [{ color: stroke.color, size: stroke.size, points: stroke.points, letters: stroke.letters }]
        });

        renderAllLayers();
        saveCanvasState();
        rebuildLayersUI();
    };

    // --- Coordinate Functions ---
    const getCanvasCoordinates = (e) => {
        const rect = canvasOverlay.getBoundingClientRect();
        let clientX, clientY;
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        // Return coordinates relative to the canvas top-left in CSS pixels
        return [(clientX - rect.left), (clientY - rect.top)];
    };

    // --- UI: Layers panel ---
    const toggleLayerVisibility = (layerId) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        layer.visible = !layer.visible;
        renderAllLayers();
        saveCanvasState();
        rebuildLayersUI();
    };

    const changeLayerColor = (layerId, newColor) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        // Change color of all strokes in this layer
        for (const stroke of (layer.strokes || [])) {
            stroke.color = newColor;
        }
        renderAllLayers();
        saveCanvasState();
        rebuildLayersUI();
    };

    const deleteLayer = (layerId) => {
        layers = layers.filter(l => l.id !== layerId);
        selectedLayerIds.delete(layerId);
        renderAllLayers();
        saveCanvasState();
        rebuildLayersUI();
    };

    const mergeSelectedLayers = () => {
        const ids = Array.from(selectedLayerIds);
        if (ids.length < 2) return;

        const selected = layers.filter(l => selectedLayerIds.has(l.id));
        if (selected.length < 2) return;

        const mergedStrokes = selected.flatMap(l => l.strokes || []);
        const mergedNameBase = selected.map(l => l.name).join(' + ').slice(0, 60) || 'Merged';
        const mergedLayer = {
            id: crypto.randomUUID(),
            name: makeUniqueLayerName(`Merged: ${mergedNameBase}`),
            visible: true,
            createdAt: Date.now(),
            strokes: mergedStrokes
        };

        // keep relative order: insert merged where first selected was
        const firstIdx = layers.findIndex(l => l.id === ids[0]);
        layers = layers.filter(l => !selectedLayerIds.has(l.id));
        layers.splice(Math.max(0, firstIdx), 0, mergedLayer);

        selectedLayerIds.clear();
        renderAllLayers();
        saveCanvasState();
        rebuildLayersUI();
    };

    const rebuildLayersUI = () => {
        if (!layersListEl || !mergeSelectedButton) return;

        layersListEl.innerHTML = '';

        if (!layers.length) {
            const empty = document.createElement('div');
            empty.textContent = 'No layers yet';
            empty.style.fontSize = '12px';
            empty.style.opacity = '0.7';
            empty.style.padding = '4px';
            layersListEl.appendChild(empty);
        } else {
            // newest first
            const ordered = [...layers].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            for (const layer of ordered) {
                const row = document.createElement('div');
                row.style.display = 'grid';
                row.style.gridTemplateColumns = '18px 20px 1fr 28px 28px';
                row.style.alignItems = 'center';
                row.style.gap = '6px';
                row.style.padding = '4px 2px';
                row.style.borderRadius = '3px';
                row.style.transition = 'background-color 0.15s';
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#f5f5f5';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = 'transparent';
                });

                const sel = document.createElement('input');
                sel.type = 'checkbox';
                sel.checked = selectedLayerIds.has(layer.id);
                sel.title = 'Select for merge';
                sel.style.cursor = 'pointer';
                sel.addEventListener('change', (ev) => {
                    if (sel.checked) selectedLayerIds.add(layer.id);
                    else selectedLayerIds.delete(layer.id);
                    mergeSelectedButton.disabled = selectedLayerIds.size < 2;
                });
                sel.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                });

                const swatch = document.createElement('div');
                const uColors = [...new Set((layer.strokes || []).map(s => s.color))];
                swatch.style.width = '18px';
                swatch.style.height = '18px';
                swatch.style.borderRadius = '3px';
                swatch.style.border = '1px solid #ccc';
                swatch.style.boxSizing = 'border-box';
                swatch.style.cursor = 'pointer';
                swatch.title = 'Click to change layer color';
                if (uColors.length === 1) {
                    swatch.style.backgroundColor = uColors[0];
                } else if (uColors.length > 1) {
                    swatch.style.background = `linear-gradient(135deg, ${uColors[0]}, ${uColors[1]})`;
                }

                // Color picker dropdown
                swatch.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    // Create color picker popup
                    const popup = document.createElement('div');
                    popup.style.position = 'absolute';
                    popup.style.backgroundColor = 'white';
                    popup.style.border = '1px solid #ccc';
                    popup.style.borderRadius = '4px';
                    popup.style.padding = '6px';
                    popup.style.display = 'flex';
                    popup.style.gap = '4px';
                    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                    popup.style.zIndex = '10000';

                    const rect = swatch.getBoundingClientRect();
                    popup.style.left = `${rect.right + 5}px`;
                    popup.style.top = `${rect.top}px`;

                    COLORS.forEach(color => {
                        const colorBtn = document.createElement('div');
                        colorBtn.style.width = '20px';
                        colorBtn.style.height = '20px';
                        colorBtn.style.backgroundColor = color;
                        colorBtn.style.border = '1px solid #999';
                        colorBtn.style.borderRadius = '3px';
                        colorBtn.style.cursor = 'pointer';
                        colorBtn.title = color;

                        colorBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            changeLayerColor(layer.id, color);
                            document.body.removeChild(popup);
                        });

                        popup.appendChild(colorBtn);
                    });

                    document.body.appendChild(popup);

                    const closePopup = (e) => {
                        if (!popup.contains(e.target)) {
                            document.body.removeChild(popup);
                            document.removeEventListener('click', closePopup);
                        }
                    };
                    setTimeout(() => document.addEventListener('click', closePopup), 0);
                });

                const name = document.createElement('div');
                name.textContent = layer.name;
                name.title = layer.name;
                name.style.fontSize = '12px';
                name.style.whiteSpace = 'nowrap';
                name.style.overflow = 'hidden';
                name.style.textOverflow = 'ellipsis';
                name.style.opacity = layer.visible ? '1' : '0.5';

                const vis = document.createElement('button');
                vis.type = 'button';
                vis.innerHTML = layer.visible ? '👁️' : '👁️‍🗨️';
                vis.title = layer.visible ? 'Hide layer' : 'Show layer';
                vis.style.fontSize = '16px';
                vis.style.padding = '2px';
                vis.style.border = 'none';
                vis.style.background = 'transparent';
                vis.style.cursor = 'pointer';
                vis.style.opacity = layer.visible ? '1' : '0.5';
                vis.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    toggleLayerVisibility(layer.id);
                }, true);

                const del = document.createElement('button');
                del.type = 'button';
                del.textContent = '🗑️';
                del.title = 'Delete layer';
                del.style.fontSize = '14px';
                del.style.padding = '2px';
                del.style.border = 'none';
                del.style.background = 'transparent';
                del.style.cursor = 'pointer';
                del.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    deleteLayer(layer.id);
                }, true);

                row.appendChild(sel);
                row.appendChild(swatch);
                row.appendChild(name);
                row.appendChild(vis);
                row.appendChild(del);
                layersListEl.appendChild(row);
            }
        }

        mergeSelectedButton.disabled = selectedLayerIds.size < 2;
    };

    // --- UI Creation ---
    const createCanvasOverlay = () => {
        if (canvasOverlay) return;

        canvasOverlay = document.createElement('canvas');
        canvasOverlay.id = 'strands-drawing-overlay';
        canvasOverlay.style.position = 'absolute';
        canvasOverlay.style.top = '0';
        canvasOverlay.style.left = '0';
        canvasOverlay.style.width = '100%';
        canvasOverlay.style.height = '100%';
        canvasOverlay.style.pointerEvents = 'none';
        canvasOverlay.style.opacity = OVERLAY_OPACITY.toString();
        canvasOverlay.style.zIndex = '1000';
        canvasOverlay.style.backgroundColor = 'transparent';
        canvasOverlay.style.display = 'none';
        canvasOverlay.style.boxSizing = 'border-box';
        canvasOverlay.style.cursor = 'none';

        ctx = canvasOverlay.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context for the drawing canvas.');
            canvasOverlay = null;
            return;
        }

        // Event listeners for drawing
        const handleEvent = (handler) => (e) => {
            if (isOverlayVisible) {
                handler(e);
                // Aggressively prevent default and stop propagation for drawing events
                e.preventDefault();
                e.stopPropagation();
            }
        };

        canvasOverlay.addEventListener('mousedown', handleEvent(startDrawing));
        canvasOverlay.addEventListener('mousemove', handleEvent(draw));
        canvasOverlay.addEventListener('mouseup', handleEvent(stopDrawing));
        canvasOverlay.addEventListener('mouseout', handleEvent(stopDrawing));
        canvasOverlay.addEventListener('touchstart', handleEvent(startDrawing), { passive: false });
        canvasOverlay.addEventListener('touchmove', handleEvent(draw), { passive: false });
        canvasOverlay.addEventListener('touchend', handleEvent(stopDrawing), { passive: false });
        canvasOverlay.addEventListener('touchcancel', handleEvent(stopDrawing), { passive: false });

        gameBoardContainer.style.position = 'relative';
        gameBoardContainer.appendChild(canvasOverlay);
        log('Canvas overlay created.');
    };

    const createCursorPreview = () => {
        if (cursorPreview) return;

        cursorPreview = document.createElement('div');
        cursorPreview.id = 'strands-drawing-cursor-preview';
        cursorPreview.style.position = 'absolute';
        cursorPreview.style.pointerEvents = 'none';
        cursorPreview.style.zIndex = '1001'; // Above canvas, below controls
        cursorPreview.style.borderRadius = '50%';
        cursorPreview.style.transform = 'translate(-50%, -50%)';
        cursorPreview.style.display = 'none';
        cursorPreview.style.boxSizing = 'border-box';

        updateCursorPreviewStyle();
        gameBoardContainer.appendChild(cursorPreview);

        const handleMove = (e) => {
            if (isOverlayVisible) {
                const [x, y] = getCanvasCoordinates(e);
                const rect = gameBoardContainer.getBoundingClientRect();
                const isInBounds = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

                if (isInBounds) {
                    cursorPreview.style.display = 'block';
                    cursorPreview.style.left = `${x}px`;
                    cursorPreview.style.top = `${y}px`;
                } else {
                    cursorPreview.style.display = 'none';
                }
            }
        };

        canvasOverlay.addEventListener('mousemove', handleMove);
        canvasOverlay.addEventListener('touchmove', (e) => { handleMove(e); e.preventDefault(); }, { passive: false });
        canvasOverlay.addEventListener('mouseleave', () => {
             if (isOverlayVisible) cursorPreview.style.display = 'none';
        });
        canvasOverlay.addEventListener('touchcancel', () => {
             if (isOverlayVisible) cursorPreview.style.display = 'none';
        });
        canvasOverlay.addEventListener('touchend', () => {
             if (isOverlayVisible) cursorPreview.style.display = 'none';
        });
    };

    const updateCursorPreviewStyle = () => {
        if (!cursorPreview) return;
        cursorPreview.style.width = `${currentBrushSize}px`;
        cursorPreview.style.height = `${currentBrushSize}px`;
        cursorPreview.style.border = `2px solid ${currentColor}`;
        cursorPreview.style.backgroundColor = `${currentColor}`;
        cursorPreview.style.opacity = '0.7';
    };

    const createControls = () => {
        if (controlsContainer) return;

        controlsContainer = document.createElement('div');
        controlsContainer.id = 'strands-drawing-controls';
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.top = '10px';
        controlsContainer.style.right = '-240px';
        controlsContainer.style.zIndex = '1002';
        controlsContainer.style.display = 'none';
        controlsContainer.style.fontFamily = 'Arial, sans-serif';
        controlsContainer.style.fontSize = '14px';
        controlsContainer.style.minWidth = '220px';
        controlsContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.97)';
        controlsContainer.style.border = '1px solid #bbb';
        controlsContainer.style.borderRadius = '6px';
        controlsContainer.style.padding = '12px';
        controlsContainer.style.boxShadow = '0 3px 12px rgba(0,0,0,0.25)';

        // Close button in top-right corner
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.textContent = '✕';
        closeButton.title = 'Hide overlay';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '4px';
        closeButton.style.right = '4px';
        closeButton.style.padding = '4px 7px';
        closeButton.style.fontSize = '14px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.color = '#666';
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = '#f0f0f0';
            closeButton.style.color = '#000';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
            closeButton.style.color = '#666';
        });
        closeButton.addEventListener('click', (event) => {
             event.preventDefault();
             event.stopPropagation();
             event.stopImmediatePropagation();
             log("Hiding overlay...");
             toggleOverlay();
        }, true);
        closeButton.addEventListener('mousedown', (event) => {
             event.stopPropagation();
        }, true);
        closeButton.addEventListener('mouseup', (event) => {
             event.stopPropagation();
        }, true);

        // Title
        const title = document.createElement('div');
        title.textContent = 'Drawing Tools';
        title.style.fontSize = '14px';
        title.style.fontWeight = '700';
        title.style.marginBottom = '12px';
        title.style.color = '#333';
        title.style.paddingRight = '20px';

        // Color Section
        const colorSection = document.createElement('div');
        colorSection.style.marginBottom = '12px';

        const colorLabel = document.createElement('div');
        colorLabel.textContent = 'Color';
        colorLabel.style.fontSize = '12px';
        colorLabel.style.fontWeight = '600';
        colorLabel.style.marginBottom = '6px';
        colorLabel.style.color = '#555';

        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.id = 'drawing-color-picker';
        colorPickerContainer.style.display = 'flex';
        colorPickerContainer.style.gap = '6px';
        colorPickerContainer.style.flexWrap = 'wrap';

        colorButtons = [];

        COLORS.forEach(color => {
            const colorButton = document.createElement('button');
            colorButton.type = 'button';
            colorButton.className = 'drawing-color-button';
            colorButton.setAttribute('data-color', color);
            colorButton.style.width = '32px';
            colorButton.style.height = '32px';
            colorButton.style.border = '2px solid #ddd';
            colorButton.style.borderRadius = '4px';
            colorButton.style.backgroundColor = color;
            colorButton.style.cursor = 'pointer';
            colorButton.style.padding = '0';
            colorButton.style.boxSizing = 'border-box';
            colorButton.style.transition = 'all 0.15s';

            if (color === currentColor) {
                colorButton.style.border = '3px solid #333';
                colorButton.style.transform = 'scale(1.1)';
            }

            colorButton.addEventListener('mouseenter', () => {
                if (color !== currentColor) {
                    colorButton.style.transform = 'scale(1.05)';
                }
            });
            colorButton.addEventListener('mouseleave', () => {
                if (color !== currentColor) {
                    colorButton.style.transform = 'scale(1)';
                }
            });

            colorButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                currentColor = color;
                colorButtons.forEach(btn => {
                    if (btn.getAttribute('data-color') === color) {
                        btn.style.border = '3px solid #333';
                        btn.style.transform = 'scale(1.1)';
                    } else {
                        btn.style.border = '2px solid #ddd';
                        btn.style.transform = 'scale(1)';
                    }
                });
                saveSettings();
                updateCursorPreviewStyle();
            });

            colorButtons.push(colorButton);
            colorPickerContainer.appendChild(colorButton);
        });

        colorSection.appendChild(colorLabel);
        colorSection.appendChild(colorPickerContainer);

        // Brush Size Section
        const sizeSection = document.createElement('div');
        sizeSection.style.marginBottom = '12px';

        const sizeLabel = document.createElement('div');
        sizeLabel.textContent = 'Brush Size';
        sizeLabel.style.fontSize = '12px';
        sizeLabel.style.fontWeight = '600';
        sizeLabel.style.marginBottom = '6px';
        sizeLabel.style.color = '#555';

        const sizeSliderContainer = document.createElement('div');
        sizeSliderContainer.style.display = 'flex';
        sizeSliderContainer.style.alignItems = 'center';
        sizeSliderContainer.style.gap = '8px';

        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.id = 'drawing-brush-size';
        sizeSlider.min = MIN_BRUSH_SIZE;
        sizeSlider.max = MAX_BRUSH_SIZE;
        sizeSlider.value = currentBrushSize;
        sizeSlider.style.flex = '1';
        sizeSlider.style.cursor = 'pointer';

        const sizeValue = document.createElement('span');
        sizeValue.id = 'drawing-brush-size-value';
        sizeValue.textContent = currentBrushSize;
        sizeValue.style.fontSize = '12px';
        sizeValue.style.fontWeight = '600';
        sizeValue.style.minWidth = '25px';
        sizeValue.style.textAlign = 'right';
        sizeValue.style.color = '#333';

        sizeSlider.addEventListener('input', () => {
            currentBrushSize = parseInt(sizeSlider.value, 10);
            sizeValue.textContent = currentBrushSize;
            saveSettings();
            updateCursorPreviewStyle();
        });

        sizeSliderContainer.appendChild(sizeSlider);
        sizeSliderContainer.appendChild(sizeValue);

        sizeSection.appendChild(sizeLabel);
        sizeSection.appendChild(sizeSliderContainer);

        // Clear Button
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.textContent = '🗑️ Clear All Layers';
        clearButton.title = 'Clear all layers';
        clearButton.style.width = '100%';
        clearButton.style.marginBottom = '12px';
        clearButton.style.padding = '8px';
        clearButton.style.fontSize = '13px';
        clearButton.style.fontWeight = '600';
        clearButton.style.cursor = 'pointer';
        clearButton.style.border = '1px solid #ddd';
        clearButton.style.borderRadius = '4px';
        clearButton.style.backgroundColor = '#fff';
        clearButton.style.color = '#d32f2f';
        clearButton.style.transition = 'all 0.15s';
        clearButton.addEventListener('mouseenter', () => {
            clearButton.style.backgroundColor = '#ffebee';
            clearButton.style.borderColor = '#d32f2f';
        });
        clearButton.addEventListener('mouseleave', () => {
            clearButton.style.backgroundColor = '#fff';
            clearButton.style.borderColor = '#ddd';
        });
        clearButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.target !== clearButton) return;
            if (!confirm('Clear all layers? This cannot be undone.')) return;
            log('Clearing all layers...');
            layers = [];
            selectedLayerIds.clear();
            renderAllLayers();
            saveCanvasState();
            rebuildLayersUI();
        }, true);

        // --- Layers panel ---
        layersPanel = document.createElement('div');
        layersPanel.style.paddingTop = '12px';
        layersPanel.style.borderTop = '1px solid #e0e0e0';

        const layersTitle = document.createElement('div');
        layersTitle.textContent = 'Layers';
        layersTitle.style.fontSize = '12px';
        layersTitle.style.fontWeight = '600';
        layersTitle.style.marginBottom = '8px';
        layersTitle.style.color = '#555';

        layersListEl = document.createElement('div');
        layersListEl.id = 'drawing-layers-list';
        layersListEl.style.display = 'block';
        layersListEl.style.maxHeight = '180px';
        layersListEl.style.overflow = 'auto';
        layersListEl.style.border = '1px solid #e0e0e0';
        layersListEl.style.borderRadius = '4px';
        layersListEl.style.padding = '4px';
        layersListEl.style.background = '#fafafa';
        layersListEl.style.marginBottom = '8px';

        mergeSelectedButton = document.createElement('button');
        mergeSelectedButton.type = 'button';
        mergeSelectedButton.textContent = '⚙️ Merge Selected';
        mergeSelectedButton.title = 'Merge selected layers into one';
        mergeSelectedButton.style.width = '100%';
        mergeSelectedButton.style.padding = '6px 8px';
        mergeSelectedButton.style.fontSize = '12px';
        mergeSelectedButton.style.fontWeight = '600';
        mergeSelectedButton.style.cursor = 'pointer';
        mergeSelectedButton.style.border = '1px solid #ddd';
        mergeSelectedButton.style.borderRadius = '4px';
        mergeSelectedButton.style.backgroundColor = '#fff';
        mergeSelectedButton.style.transition = 'all 0.15s';
        mergeSelectedButton.disabled = true;
        mergeSelectedButton.addEventListener('mouseenter', () => {
            if (!mergeSelectedButton.disabled) {
                mergeSelectedButton.style.backgroundColor = '#f0f0f0';
            }
        });
        mergeSelectedButton.addEventListener('mouseleave', () => {
            mergeSelectedButton.style.backgroundColor = '#fff';
        });
        mergeSelectedButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            mergeSelectedLayers();
        }, true);

        layersPanel.appendChild(layersTitle);
        layersPanel.appendChild(layersListEl);
        layersPanel.appendChild(mergeSelectedButton);

        controlsContainer.appendChild(closeButton);
        controlsContainer.appendChild(title);
        controlsContainer.appendChild(colorSection);
        controlsContainer.appendChild(sizeSection);
        controlsContainer.appendChild(clearButton);
        controlsContainer.appendChild(layersPanel);

        gameBoardContainer.appendChild(controlsContainer);
        log('Controls created.');
        rebuildLayersUI();
    };

    // --- Canvas Size Update ---
    const updateCanvasSize = () => {
        if (!canvasOverlay || !gameBoardContainer) return;

        const containerRect = gameBoardContainer.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;

        canvasOverlay.width = Math.floor(containerRect.width * dpr);
        canvasOverlay.height = Math.floor(containerRect.height * dpr);

        canvasOverlay.style.width = `${containerRect.width}px`;
        canvasOverlay.style.height = `${containerRect.height}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        updateLetterGridCache();
        renderAllLayers();

        log(`Canvas updated: Display(${containerRect.width}x${containerRect.height}), Internal(${canvasOverlay.width}x${canvasOverlay.height}), DPR(${dpr})`);
    };

    // --- Main Logic ---
    const toggleOverlay = () => {
        if (!canvasOverlay || !controlsContainer || !cursorPreview) return;

        isOverlayVisible = !isOverlayVisible;

        if (isOverlayVisible) {
            canvasOverlay.style.pointerEvents = 'auto';
            canvasOverlay.style.backgroundColor = CANVAS_BACKGROUND_COLOR;
            canvasOverlay.style.display = 'block';
            controlsContainer.style.display = 'block';
            updateCanvasSize();
            requestAnimationFrame(() => {
                if (isOverlayVisible) updateLetterGridCache();
            });
            toggleButton.setAttribute('aria-label', 'Hide drawing notes overlay');
            cursorPreview.style.display = 'none'; // Start hidden, shown on move
        } else {
            canvasOverlay.style.pointerEvents = 'none';
            canvasOverlay.style.backgroundColor = 'transparent';
            canvasOverlay.style.display = 'none';
            controlsContainer.style.display = 'none';
            toggleButton.setAttribute('aria-label', 'Show drawing notes overlay');
            cursorPreview.style.display = 'none';
        }
        log(`Overlay ${isOverlayVisible ? 'shown' : 'hidden'}.`);
    };

    const createToggleButton = () => {
        if (toggleButton) return;

        const toolbar = document.querySelector('.pz-module.pz-flex-row.pz-game-toolbar-content');
        if (!toolbar) {
            log('Toolbar not found, retrying...');
            setTimeout(createToggleButton, 1000);
            return;
        }

        toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'ToolbarItem-module_toolbar_item__xrBr_ ToolbarItem-module_toolbar_itemDesktop__jFTZJ';
        toggleButton.id = 'drawing-overlay-toggle';
        toggleButton.setAttribute('aria-label', 'Show drawing notes overlay');

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'Icon-module_iconWrapper__ZfKPm';

        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgIcon.setAttribute('aria-hidden', 'true');
        svgIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgIcon.setAttribute('height', '24');
        svgIcon.setAttribute('viewBox', '0 0 24 24');
        svgIcon.setAttribute('width', '24');
        svgIcon.setAttribute('class', 'game-icon');
        svgIcon.setAttribute('data-testid', 'icon-drawing-overlay');
        svgIcon.innerHTML = `
            <path fill="var(--text)" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 5.63l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83a.9959.9959 0 0 0 0-1.41z"/>
            <path fill="none" d="M0 0h24v24H0z"/>
        `;

        iconWrapper.appendChild(svgIcon);
        toggleButton.appendChild(iconWrapper);

        // --- Robust click handler for toggle button ---
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            log("Toggle button clicked.");
            toggleOverlay();
        }, true); // Use capture phase

        const helpButton = document.getElementById('help-button');
        if (helpButton && helpButton.parentNode) {
            helpButton.parentNode.parentNode.insertBefore(toggleButton, helpButton.parentNode);
        } else {
            const toolbarSection = toolbar.querySelector('section');
            if (toolbarSection) {
                toolbarSection.appendChild(toggleButton);
            } else {
                toolbar.appendChild(toggleButton);
            }
        }
        log('Toggle button created.');
    };

    const init = () => {
        log('Initializing...');

        gameBoardContainer = document.querySelector("form[data-testid='strands-board'] > div:first-child > div:first-child");
        if (!gameBoardContainer) {
            log('Game board container not found, retrying...');
            setTimeout(init, 1000);
            return;
        }

        loadSettings();
        createCanvasOverlay();
        createControls();
        createToggleButton();
        createCursorPreview();

        if (canvasOverlay) {
            setTimeout(() => {
                updateCanvasSize();
                loadCanvasState(); // now loads layers + renders + UI
                // ...existing colorButtons highlight code...
                updateCursorPreviewStyle();

                window.addEventListener('resize', () => {
                    clearTimeout(window.strandsResizeTimeout);
                    window.strandsResizeTimeout = setTimeout(updateCanvasSize, 100);
                });
                const resizeObserver = new ResizeObserver(() => {
                    clearTimeout(window.strandsResizeObserverTimeout);
                    window.strandsResizeObserverTimeout = setTimeout(updateCanvasSize, 100);
                });
                resizeObserver.observe(gameBoardContainer);
            }, 100);
        }
    };

    // --- Keyboard Shortcut ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 't' && e.ctrlKey === false && e.altKey === false && e.shiftKey === false) {
             if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                 e.preventDefault();
                 log("T key pressed, toggling overlay.");
                 toggleOverlay();
             }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
