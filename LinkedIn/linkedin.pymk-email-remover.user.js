// ==UserScript==
// @name       LinkedIn hide email contacts from "People You May Know"
// @namespace  http://mathemaniac.org
// @version    1.2.0
// @description  Hides those annoying email contacts from PYMK
// @match      https://www.linkedin.com/mynetwork*
// @copyright  2015-2017, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js
// ==/UserScript==

$(function () {
    $('.mn-pymk-list__card:has(.mn-person-info__guest-handle)').remove();

    // Remove when autoloading new ones
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var config = { childList: true, characterData: false, attributes: false, subtree: true };
    var observer = new MutationObserver( function (mutations) {
        mutations.forEach( function (mutation) {
            if (mutation.addedNodes) {
                $(mutation.addedNodes).each( function () {
                    if ($(this).hasClass('mn-person-info__guest-handle')) {
                        console.log("removing card for ", $(this).text());
                        $(this).parents('.mn-pymk-list__card').remove();
                    }
                } );
            }
        });
    });

    $('.mn-pymk-list__cards').each( function () { observer.observe(this, config); } );
});
