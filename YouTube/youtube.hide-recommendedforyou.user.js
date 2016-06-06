// ==UserScript==
// @name        YouTube Hide "Recommended for you" from related videos
// @namespace   http://mathemaniac.org/
// @version     1.0b
// @description Hides videos marked as "Recommended for you" from the related videos on YouTube video pages.
// @include     http://youtube.com/watch*
// @include     http://www.youtube.com/watch*
// @include     https://youtube.com/watch*
// @include     https://www.youtube.com/watch*
// @grant       none
// @copyright   2013, Sebastian Paaske Tørholm
// @require     http://code.jquery.com/jquery-latest.min.js
// ==/UserScript==

function hideRecommended() {
    $('#watch-related li').each( function () {
        if ($("span:contains('Recommended for you')", this).length > 0) {
            $(this).remove();
        }
    });
    $('#watch-related').one('DOMSubtreeModified', hideRecommended);
}

hideRecommended();
