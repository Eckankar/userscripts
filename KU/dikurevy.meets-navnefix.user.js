// ==UserScript==
// @name        DIKUrevy mødekalender navnefix
// @description Viser fulde navne pr. default inde på møder.dikurevy.dk, frem for nicknames.
// @namespace   mathemaniac.org
// @include     http://møder.dikurevy.dk/*
// @version     1
// @grant       none
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// ==/UserScript==
$( function () {
    $('table tbody tr td.user span.username').each( function () {
        var nick = $(this).text();
        $(this).text($(this).attr('title')).attr('title', nick);
    } );
} );
