// ==UserScript==
// @name       Fredericia Dagblad unlock
// @namespace  http://mathemaniac.org/
// @version    1.0.0
// @description  Removes the overlay frdb.dk puts on the page to prevent people from disabling cookies.
// @match        https://frdb.dk/*
// @copyright  2021, Sebastian Paaske Tørholm
// @grant none
// ==/UserScript==
/* jshint -W097 */
/* eslint-env jquery */
'use strict';

document.head.insertAdjacentHTML('beforeend', `
<style>
#__tealiumModalParent, #tDrkDiv { display: none !important; }
body { overflow: inherit !important; }
</style>
`);
