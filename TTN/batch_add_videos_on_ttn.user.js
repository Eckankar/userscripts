// ==UserScript==
// @name       Batch-add videos on Trees Network
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Allows batch-adding videos on Trees Network
// @match        https://www.treesnetwork.com/*
// @copyright  2018, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js
// @grant none
// ==/UserScript==
/* jshint -W097 */
'use strict';

(function () {
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

    var videosToAdd;

    var addSingleVideo;
    var addSingleVideoPt2;

    addSingleVideo = function () {
        var url = videosToAdd.shift();
        if (! url) return;

        var $field = $('input[placeholder="To add a video, paste a supported URL here..."]');
        var $btn = $field.next();
        nativeInputValueSetter.call($field[0], url);

        var ev2 = new Event('input', { bubbles: true});
        $field[0].dispatchEvent(ev2);

        $btn.click();
        setTimeout(addSingleVideoPt2, 2000);
    };

    addSingleVideoPt2 = function () {
        var submit = $('button:contains("Submit Video")');
        submit.click();

        setTimeout(addSingleVideo, 2000);
    };

    window.batchAddVideos = function(videos) {
        videosToAdd = videos;
        addSingleVideo();
    };

})();
