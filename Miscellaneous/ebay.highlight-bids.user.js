// ==UserScript==
// @name           eBay - Hilight Items With Bids
// @namespace      http://mathemaniac.org
// @include        http://*.ebay.*/*
// @grant      none
// @version    2.3.3
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// @description    Hilights items that have bids with a red border and yellow background.
// ==/UserScript==

// Based on http://userscripts.org/users/126140 v.2.2.1
// Updated for newer eBay layout.

$('document').ready(function() {
    $(".lvprices .lvformat").each(function() {
        // Skip listings with no bids.
        if ($(this).text().match(/\b0 bids/) || !$(this).text().match(/\d+ bids?/)) return;

        $(this).closest('li[listingid]').css({
            "border": "3px solid red",
            "background-color": "yellow"
        });
    });

});

