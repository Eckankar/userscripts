// ==UserScript==
// @name       Dailymotion video exporter
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Exports a list of videos matching a given criterion
// @match        https://www.dailymotion.com/*/videos
// @copyright  2018, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @grant none
// ==/UserScript==
/* jshint -W097 */
/* eslint-env jquery */
'use strict';

window.extractVideos = function (selector) {
    var vs = $(selector);
    var vids = $.map(vs, function (e) {
        var t = $(e).attr('title');
        var m = t.match(/S(?:eason)?\s*(\d+)\s*E(?:pisode)?\s*(\d+)/);
        return 'https://www.dailymotion.com'+$(e).attr('href') + " S" + m[1].padStart(2, '0') + "E" + m[2].padStart(2, '0');
    });
    vids.sort(function (a, b) {
        var ma = a.match(/^\S+\s+(.*)/);
        var mb = b.match(/^\S+\s+(.*)/);
        return ma[1].localeCompare(mb[1]);
    });
    console.log( vids.join("\n") );
};
