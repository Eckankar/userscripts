// ==UserScript==
// @name       Redirect to old reddit in incognito mode
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Redirect to old reddit in incognito mode
// @match        https://www.reddit.com/*
// @copyright  2018, Sebastian Paaske Tørholm
// @grant none
// ==/UserScript==
/* jshint -W097 */
'use strict';

if (GM_info.isIncognito) {
    document.location = (document.location+"").replace(/https:\/\/www./,'https://old.');
}
