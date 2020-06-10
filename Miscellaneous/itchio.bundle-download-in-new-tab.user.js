// ==UserScript==
// @name       itch.io bundle open in new tab
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Makes the "Download" button on the itch.io bundle pages open in a new tab.
// @match        https://itch.io/bundle/download/*
// @copyright  2020, Sebastian Paaske Tørholm
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @grant none
// ==/UserScript==

/* jshint -W097 */
/* eslint-env jquery */
'use strict';

$(function () {
    $('.game_row .button_row form').attr('target', '_blank');
});
