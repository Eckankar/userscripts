// ==UserScript==
// @name        SPOJ add profile link
// @namespace   spt.jobsafari.dk
// @description Adds profile links to group listings
// @include     http://www.spoj.com/*/groups/*
// @version     1
// @grant       none
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// ==/UserScript==
$('.problems .problemrow a').each( function () {
    var link = $(this);
    var profilelink = $('<a>Profile</a>');
    profilelink.prop('href', 'http://www.spoj.com/users/' + link.text());
    link.after(profilelink);
    link.after(' - ');
} );
