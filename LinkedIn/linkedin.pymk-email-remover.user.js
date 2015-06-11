// ==UserScript==
// @name       LinkedIn hide email contacts from "People You May Know"
// @namespace  http://mathemaniac.org
// @version    1.1.0
// @description  Hides those annoying email contacts from PYMK
// @match      http://www.linkedin.com/people/pymk*
// @match      https://www.linkedin.com/people/pymk*
// @copyright  2015, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js
// ==/UserScript==

$(function () {
    $('ul.people-cards-list li[id*="@"]').remove();

    // Remove when autoloading new ones
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var config = { childList: true, characterData: false, attributes: false, subtree: true };
    var observer = new MutationObserver( function (mutations) {
        mutations.forEach( function (mutation) {
            if (mutation.addedNodes) {
                $(mutation.addedNodes).each( function () {
                    if ($(this).attr('id').match(/card-.*@.*/)) {
                        console.log("removing ", $(this).attr('id'));
                        $(this).remove();
                    }
                } );
            }
        });
    });

    $('ul.people-cards-list').each( function () { observer.observe(this, config); } );
});
