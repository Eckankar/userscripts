// ==UserScript==
// @name           Better editor on HOT.dk
// @description    Improves the HOT.dk editor
// @author         Sebastian Paaske Tørholm
// @include        https://www.hot.dk/Message*
// @include        https://www.hot.dk/Profile*
// @version        1.1
// ==/UserScript==

setTimeout(function() {
var s = document.createElement("script");
s.innerHTML = "CKEDITOR.instances.text.destroy(); CKEDITOR.replace( 'text', { toolbar : [\
    ['Source'],\
    ['Cut','Copy','Paste','PasteText'],\
    ['Undo','Redo','-','Find','Replace','-','SelectAll','RemoveFormat'],\
    '/',\
    ['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],\
    ['NumberedList','BulletedList','-','Outdent','Indent','Blockquote'],\
    ['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock'],\
    ['Link'],\
    ['Image','Flash','Table','HorizontalRule','SpecialChar'],\
    '/',\
    ['Styles','Format','Font','FontSize'],\
    ['TextColor','BGColor'],\
    ['Maximize', 'ShowBlocks']\
] } )";
document.body.appendChild(s);
}, 1000);
