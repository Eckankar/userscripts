// ==UserScript==
// @name           Neopets Sidebar Quicklinks
// @version        1.1
// @author         Sebastian Paaske Tørholm
// @namespace      http://www.mathemaniac.org
// @include        http://www.neopets.com/*
// @include        http://neopets.com/*
// ==/UserScript==

// Downloaded from: http://userscripts.org/scripts/show/29918

// Thanks to PinkPT.com for the quicklinks. :)
// If anything is missing, please contact me.

var quicklinks = new Array(
    ['Advent Calendar','http://neopets.com/winter/adventcalendar.phtml'],
    ['Altador Plot Daily','http://www.neopets.com/altador/council.phtml'],
    ['Buried Treasure','http://www.neopets.com/pirates/buriedtreasure/index.phtml'],
    ['Deadly Dice','http://neopets.com/worlds/deadlydice.phtml'],
    ['Deserted Tomb','http://www.neopets.com/worlds/geraptiku/tomb.phtml'],
    ['Fruit Machine','http://www.neopets.com/desert/fruitmachine.phtml'],
    ['Giant Jelly','http://www.neopets.com/jelly/jelly.phtml'],
    ['Grumpy Old King','http://www.neopets.com/medieval/grumpyking.phtml'],
    ['Healing Springs','http://www.neopets.com/faerieland/springs.phtml'],
    ['Haunted Kiosk','http://www.neopets.com/halloween/scratch.phtml'],
    ['Kiosk','http://www.neopets.com/winter/kiosk.phtml'],
    ['Laboratory Ray','http://www.neopets.com/lab.phtml'],
    ['Lever of Doom','http://www.neopets.com/space/strangelever.phtml'],
    ['Lost Desert Scratchcards','http://www.neopets.com/desert/sc/kiosk.phtml'],
    ['Lunar Temple','http://www.neopets.com/shenkuu/lunar/?show=puzzle'],
    ['Marrow Guess','http://www.neopets.com/medieval/guessmarrow.phtml'],
    ['Mysterious Symol Hole','http://www.neopets.com/medieval/symolhole.phtml'],
    ['Meteor Crash Site 725-XZ','http://www.neopets.com/moon/meteor.phtml'],
    ['Omelette','http://www.neopets.com/prehistoric/omelette.phtml'],
    ['Pick Your Own','http://www.neopets.com/medieval/pickyourown_index.phtml'],
    ['Qasalan Expellibox','http://www.neopets.com/games/play.phtml?game_id=905'],
    ['Shop Of Offers','http://www.neopets.com/shop_of_offers.phtml?slorg_payout=yes'],
    ['Shrine','http://www.neopets.com/desert/shrine.phtml'],
    ['Snowager','http://www.neopets.com/winter/snowager.phtml'],
    ['Test Your Strength','http://www.neopets.com/halloween/strtest/index.phtml'],
    ['TDMBGPOP','http://www.neopets.com/faerieland/tdmbgpop.phtml'],
    ['The Petpet Laboratory','http://www.neopets.com/petpetlab.phtml'],
    ['Tombola','http://www.neopets.com/island/tombola.phtml'],
    ['Turmaculus','http://neopets.com/medieval/turmaculus.phtml'],
    ['Weltrude\'s Toy Chest','http://www.neopets.com/petpetpark/daily.phtml'],
    ['Wheel of Excitement','http://www.neopets.com/faerieland/wheel.phtml'],
    ['Wheel of Knowledge','http://www.neopets.com/medieval/knowledge.phtml'],
    ['Wheel of Mediocrity','http://www.neopets.com/prehistoric/mediocrity.phtml'],
    ['Wheel of Misfortune','http://www.neopets.com/halloween/wheel/index.phtml'],
    ['Wheel of Monotony','http://www.neopets.com/prehistoric/monotony/monotony.phtml'],
    ['Wheel of Slime','http://www.neopets.com/games/play.phtml?game_id=807'],
    ['Underwater Fishing','http://www.neopets.com/water/fishing.phtml'],
    ['Wise Old King','http://www.neopets.com/medieval/wiseking.phtml']
);

var nfbox = document.evaluate('//div[contains(@class,"sidebarModule") and descendant::a[contains(@href,"neofriends")]]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

if (nfbox) {
    var qlbox = document.createElement('div');
    qlbox.className = 'sidebarModule';
    var qlboxtable = document.createElement('table');
    qlboxtable.cellpadding = 2;
    qlboxtable.cellspacing = 0;
    qlboxtable.border = 0;
    qlboxtable.className = 'sidebarTable';
    qlboxtable.setAttribute('width',158);
    var headertr = document.createElement('tr');
    var headertd = document.createElement('td');
    headertd.className = 'sidebarHeader medText';
    headertd.appendChild(document.createTextNode('Quicklinks'));
    headertr.appendChild(headertd);
    qlboxtable.appendChild(headertr);
    var bodytr = document.createElement('tr');
    var bodytd = document.createElement('td');
    bodytd.className = 'activePet sf';
    for(var i = 0; i < quicklinks.length; i++) {
        var qlink = quicklinks[i]
        var linka = document.createElement('a');
        linka.setAttribute('style','font-weight: bold');
        console.log(qlink);
        linka.href = qlink[1];
        linka.appendChild(document.createTextNode(qlink[0]));
        bodytd.appendChild(linka);
        bodytd.appendChild(document.createElement('br'));
    }
    bodytr.appendChild(bodytd);
    qlboxtable.appendChild(bodytr);
    qlbox.appendChild(qlboxtable);

    nfbox.parentNode.insertBefore(qlbox,nfbox.nextSibling);
}
