// ==UserScript==
// @name           eBay - Hilight Items With Bids
// @namespace      http://mathemaniac.org
// @include        http://*.ebay.*/*
// @include        https://*.ebay.*/*
// @grant      none
// @version    2.3.4
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// @description    Hilights items that have bids with a red border and yellow background.
// @downloadURL https://update.greasyfork.org/scripts/4578/eBay%20-%20Hilight%20Items%20With%20Bids.user.js
// @updateURL https://update.greasyfork.org/scripts/4578/eBay%20-%20Hilight%20Items%20With%20Bids.meta.js
// ==/UserScript==

// Based on http://userscripts.org/users/126140 v.2.2.1
// Updated for newer eBay layout.
// Updated 2024/02/08 to match correctly https://github.com/zackramjan

$(function() {
   $(".s-item__bidCount").each(function() {
        // Skip listings with no bids.
        if ($(this).text().match(/\b0 bids/) || !$(this).text().match(/\d+ bids?/)) return;

        $(this).closest('li').css({
            "border": "3px solid red",
            "background-color": "yellow"
        });
    });
});
