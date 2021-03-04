// ==UserScript==
// @name         Hide offline presence dot on old reddit
// @namespace    https://mathemaniac.org
// @version      1.0
// @description  Hides the offline presence dot from old reddit. Only hides offline presence, so you notice if you're displayed as online. https://old.reddit.com/r/changelog/comments/lx08r2/announcing_online_presence_indicators/
// @author       Sebastian Paaske Tørholm
// @match        https://old.reddit.com/*
// @icon         https://www.google.com/s2/favicons?domain=reddit.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    document.head.insertAdjacentHTML('beforeend', `
<style>#header-bottom-right .presence_circle.offline { display: none !important; }</style>
    `);
})();
