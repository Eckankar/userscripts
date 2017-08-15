// ==UserScript==
// @name       Gaia Ad Remover
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Removes ads from Gaia Online
// @match      http://www.gaiaonline.com/*
// @copyright  2015-2017, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js
// @grant none
// ==/UserScript==

$('.bannerads, .gaia-ad').remove();
