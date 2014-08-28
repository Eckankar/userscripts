// ==UserScript==
// @name            Politiken Freeloader
// @namespace       http://mathemaniac.org
// @icon            http://politiken.dk/favicon.ico
// @description     Removes paywall on Politiken.dk
// @include         http://politiken.dk/*
// @match           http://politiken.dk/*
// @version         3.0.1
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// ==/UserScript==

jQuery('<style>#teaserwrapper, #meteroverlay { display: none !important; } body { overflow: visible !important; }</style>').appendTo('head');
