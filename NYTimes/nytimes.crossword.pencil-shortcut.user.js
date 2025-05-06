// ==UserScript==
// @name       New York Times Crossword - Keyboard shortcut for pencil
// @namespace  https://mathemaniac.org/
// @version    1.0.0
// @description  Lets you press the shift key to toggle the pencil tool on the crossword.
// @match        https://www.nytimes.com/crosswords/game/*
// @copyright  2025, Sebastian Paaske Tørholm
// @grant none
// ==/UserScript==
/* jshint -W097 */
'use strict';

document.onkeydown = (e) => {
    if (e.key === 'Shift') {
        document.querySelector('button:has(.xwd__toolbar_icon--pencil, .xwd__toolbar_icon--pencil-active)').click();
    }
};
