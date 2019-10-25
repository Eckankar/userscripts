// ==UserScript==
// @name       Redirect to old reddit
// @namespace  http://mathemaniac.org/
// @version    1.1.0
// @description  Redirect to old reddit
// @match        https://www.reddit.com/*
// @copyright  2018-2019, Sebastian Paaske Tørholm
// @grant none
// ==/UserScript==
/* jshint -W097 */
'use strict';

document.location = (document.location+"").replace(/https:\/\/www./,'https://old.');
