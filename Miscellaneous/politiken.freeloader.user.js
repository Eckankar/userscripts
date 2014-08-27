// ==UserScript==
// @name            Politiken Freeloader
// @namespace       http://mathemaniac.org
// @icon            http://politiken.dk/favicon.ico
// @description     Removes paywall on Politiken.dk
// @include         http://politiken.dk/*
// @match           http://politiken.dk/*
// @version         3
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// ==/UserScript==

// Inspired by Politiken Freeloader by Kristian Thy: http://userscripts-mirror.org/scripts/show/168318.html

jQuery('<style>#teaserwrapper, #meteroverlay { display: none !important; }</style>').appendTo('head');
