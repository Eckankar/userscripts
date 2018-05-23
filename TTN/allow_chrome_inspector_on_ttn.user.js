// ==UserScript==
// @name       Allow use of Chrome inspector on TreesNetwork.com
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Allow use of Chrome inspector on TreesNetwork.com
// @match        https://www.treesnetwork.com/*
// @copyright  2018, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js
// @grant none
// ==/UserScript==
/* jshint -W097 */
'use strict';

function set_key() {
    if (! window._state) {
        return;
    }
    if (! window._state.config) window._state.config = {};
    window._state.config._t = "18cfi2xzk";
}

setInterval(set_key, 100);
