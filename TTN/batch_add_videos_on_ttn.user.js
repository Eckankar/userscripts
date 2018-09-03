// ==UserScript==
// @name       Batch-add videos on Trees Network
// @namespace  http://mathemaniac.org/
// @version    1.1.0
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

    var title;
    var videosToAdd;

    var addSingleVideo;
    var addSingleVideoPt2;

    addSingleVideo = function () {
        var vid = videosToAdd.shift();
        if (! vid) return;

        title = "";
        var url;
        if (typeof vid === 'object') {
            url = vid.url;
            title = vid.title;
        }

        var $field = $('input[placeholder="To add a video, paste a supported URL here..."]');
        var $btn = $field.next();
        nativeInputValueSetter.call($field[0], url);

        var ev2 = new Event('input', { bubbles: true });
        $field[0].dispatchEvent(ev2);

        $btn.click();
        setTimeout(addSingleVideoPt2, 5000);
    };

    addSingleVideoPt2 = function () {
        if (title) {
            var $field = $('input[placeholder="Type a name for the video..."]');

            nativeInputValueSetter.call($field[0], title);

            var ev2 = new Event('input', { bubbles: true });
            $field[0].dispatchEvent(ev2);
        }

        setTimeout(addSingleVideoPt3, 2 * 60 * 1000);
    };

    addSingleVideoPt3 = function () {
        var submit = $('button:contains("Submit Video")');
        submit.click();

        setTimeout(addSingleVideo, 2000);
    };

    window.batchAddVideos = function(videos) {
        videosToAdd = videos;
        addSingleVideo();
    };

    window.parseAndBatchAddVideos = function (showTitle, episodes) {
        var videos = [];
        var eps = episodes.split(/\n/);
        for (var i = 0; i < eps.length; i++) {
            var m = eps[i].match(/^(https?\S+)(?:[\s-]+)(.*)$/);
            if (!m) continue;

            videos.push( { url: m[1], title: showTitle + " - " + m[2] } );
        }

        batchAddVideos(videos);
    };

})();
