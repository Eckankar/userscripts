// ==UserScript==
// @name         Add markdown editor to cronnit
// @namespace    http://mathemaniac.org/
// @version      1.0.0
// @description  Adds a markdown editor to cronnit.us.
// @match        https://cronnit.us/submit
// @copyright    2020, Sebastian Paaske Tørholm
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @require      https://uicdn.toast.com/editor/latest/toastui-jquery-editor.min.js
// @grant none
// ==/UserScript==

/* jshint -W097 */
/* eslint-env jquery */
'use strict';

$( function () {
    let $body = $('#body');
    if ($body.hasClass('upgraded-md-editor')) return;

    $('body').append(`
<link rel="stylesheet" href="https://uicdn.toast.com/tui-editor/latest/tui-editor.css"></link>
<link rel="stylesheet" href="https://uicdn.toast.com/tui-editor/latest/tui-editor-contents.css"></link>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.48.4/codemirror.css"></link>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/github.min.css"></link>
`);

    $body.after('<div id="body-md-editor"></div>');
    $body.css({ "display": "none" });

    $('#body-md-editor').toastuiEditor({
        //initialEditType: 'wysiwyg',
        usageStatistics: false,
        previewStyle: 'vertical',
        initialValue: $body.val(),
        events: {
            change: function () {
                $body.val( $('#body-md-editor').toastuiEditor('getMarkdown') );
            },
        }
    });

    $body.addClass('upgraded-md-editor');
} );
