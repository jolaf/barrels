//
// JavaScript code file for Barrels
//
var WELCOME = 'Welcome';
var KNOCK = 'Knock';
var GRANTED = 'Granted';
var DENIED = 'Denied';

var AUDIO_TYPES = {'audio/mpeg': 'mp3', 'audio/ogg': 'ogg'};

var DT = 100;
var PLATE_TIMEOUT = 30 * 1000; // 30 seconds

var ROW_HEIGHT = Math.sin(Math.PI / 3);
var HIGHLIGHT = 0.33;

var NUM_BARRELS = 19;

var PLATE_ASPECT = 4/3;
var PLATE_SIZE = 0.7;
var PLATE_FIELD = 0.05;
var PLATE_PADDING = 0.23;
var FONT_SIZE = 0.035;
var SUCCESS_FONT_SIZE = 0.07;

var TRANSITION_TIMEOUT = 1000;
var TRANSITION_LENGTH = TRANSITION_TIMEOUT / 1000 + 's';

var HOURS = 12;
var CIRCLE = 360;

var IDLE = 0;
var KNOCKING = 1;
var FADEIN = 2;
var WAITING = 3;

var VENDORS = ['', 'ms', 'moz', 'webkit', 'o'];

function debug(message) {
    var date = new Date().toTimeString().split(' ')[0];
    logger.innerHTML += date + '&nbsp;&nbsp;' + message + '<br>';
    logger.scrollTop = logger.scrollHeight;
    if (console) {
        console.log(date + ' ' + message);
    }
}

function getStyle(selector) {
    var rules = document.styleSheets[0].cssRules || document.styleSheets[0].rules; // trying both ways to access CSS
    for (var i = 0, rule; rule = rules[i++];) {
        if (rule.selectorText === selector) {
            return rule.style;
        }
    }
}

function setProperty(style, property, value) {
    for (var i = 0; i < VENDORS.length; i++) {
        var vendor = VENDORS[i];
        style[(vendor ? '-' + vendor + '-' : '') + property] = value;
    }
}

function parseSize(size) {
    return parseInt(size.slice(0, -2));
}

function prevent(e) {
    e = e || window.event;
    if (e) {
        if (e.preventDefault !== undefined) {
            e.preventDefault();
        }
        if (e.stopPropagation !== undefined) {
            e.stopPropagation();
        }
        if (e.returnValue !== undefined) {
            e.returnValue = false;
        }
    }
    return false;
}

function delay(what) {
    return setTimeout(what, DT);
}

function resetPlateTimeout(reset) {
    clearTimeout(plateTimeout);
    plateTimeout = reset ? setTimeout(dismiss, PLATE_TIMEOUT) : null;
}

function createAudio(name) {
    var audio = document.createElement('audio');
    audio.src = 'audio/' + name + '.' + audioType;
    if (isDesktopBrowser) {
        audio.volume = 0;
        audio.play();
    } else { // can't control volume on mobiles
        audio.load();
    }
    return audio;
}

function playAudio(audio, what) {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
        audio.play();
        audio.addEventListener('ended', what, false);
    } else {
        what();
    }
}

function main() {
    // HTML references
    body = document.getElementsByTagName('body')[0];
    body.removeAttribute('onload'); // don't even try to work after saving modified page
    startupBlock = document.getElementById('startupBlockID');
    workingBlock = document.getElementById('workingBlockID');
    loadingProgress = document.getElementById('loadingProgressID');
    logger = document.getElementById('loggerID');
    plate = document.getElementById('plateID');
    prefix = document.getElementById('prefixID');
    header = document.getElementById('headerID');
    details = document.getElementById('detailsID');
    barrelClass = getStyle('div.barrel');
    plateClass = getStyle('#plateID');
    successClass = getStyle('.success');
    plateContentClass = getStyle('#plateContentID');
    plateStyle = plate.style;
    // Setting up audio
    isDesktopBrowser = navigator.userAgent.search(/(ipad)|(iphone)|(ipod)|(android)|(webos)|(mobi)|(mini)/i) < 0;
    properlyLoaded = HTMLMediaElement.HAVE_CURRENT_DATA; // (!isDesktopBrowser && window.opera) ? HTMLMediaElement.HAVE_CURRENT_DATA : HTMLMediaElement.HAVE_ENOUGH_DATA;
    audioType = null;
    var audio = document.createElement('audio');
    for (var type in AUDIO_TYPES) {
        if (audio.canPlayType(type)) {
            audioType = AUDIO_TYPES[type];
            break;
        }
    }
    if (audioType) {
        debug('Supported audio: ' + audioType.toUpperCase());
     } else {
        debug('Audio not supported, aborting');
        return;
    }
    // Loading audio
    welcome = createAudio(WELCOME);
    knock = createAudio(KNOCK);
    granted = createAudio(GRANTED);
    denied = createAudio(DENIED);
    medias = [welcome, knock, granted, denied];
    // Waiting for audio to load
    errors = 0;
    delay(waitForMedia);
}

function waitForMedia(media) {
    var ready = true;
    var loadedMedia = 0;
    var totalMedia = 0;
    for (var i in medias) {
        var media = medias[i];
        totalMedia++;
        if (media && media.readyState < properlyLoaded) {
            ready = false;
            if (media.error) {
                debug('ERROR loading audio from ' + media.src);
                errors++;
                medias[i] = null;
            }
        } else {
            loadedMedia++;
        }
    }
    if (totalMedia) {
        loadingProgress.innerHTML = 'Barrels loading audio... ' + loadedMedia + ' of ' + totalMedia + ' (' + Math.round(loadedMedia * 100 / totalMedia) + '%' + ')';
    }
    if (ready) {
        // Continue with the application startup
        if (errors) {
            startupBlock.onmousedown = start;
            debug(errors + ' errors found, click to continue');
        } else {
            setTimeout(start, 200); // needs to be investigated
        }
    } else {
        delay(waitForMedia);
    }
}

function start() {
    // Configure loaded media
    welcome = medias[0];
    knock = medias[1];
    granted = medias[2];
    denied = medias[3];
    // Configure barrel rows
    var rows = [];
    var remaining = NUM_BARRELS + 1;
    var n = 2 * Math.ceil((Math.sqrt(4 * (NUM_BARRELS + 1) + 1) - 1) / 2);
    numColumns = n - 1;
    while (remaining > 0) {
        n = n > 0 ? Math.min(n, remaining) : remaining;
        rows.push(rows.length ? n : n - 1);
        remaining -= n;
        n -= 2;
    }
    numRows = rows.length;
    // Creating barrels
    barrels = [];
    var barrelCount = 0;
    for (var i = 0; i < numRows; i++) {
        for (var j = 0; j < rows[i]; j++) {
            var mapName = 'barrelMap' + barrelCount;
            var barrel = document.createElement('div');
            barrel.className = 'barrel';
            barrel.number = barrelCount++;
            barrel.row = 2 * i * ROW_HEIGHT;
            barrel.column = i + 2 * j;
            barrels.push(barrel);
            workingBlock.insertBefore(barrel, plate);
            var image = document.createElement('img');
            image.src = 'images/barrel.png';
            image.className = 'barrel';
            barrel.image = image;
            barrel.appendChild(image);
            var highlight = document.createElement('img');
            highlight.src = 'images/highlight.png';
            highlight.className = 'highlight';
            highlight.useMap = '#' + mapName;
            barrel.highlight = highlight;
            barrel.appendChild(highlight);
            var map = document.createElement('map');
            map.name = mapName;
            barrel.map = map;
            barrel.appendChild(map);
            var area = document.createElement('area');
            area.shape = 'circle';
            area.onmousedown = tap;
            area.onmouseover = area.onmousemove = highlightBarrel;
            area.onmouseout = dimBarrel;
            area.barrel = barrel;
            area.highlight = highlight;
            barrel.area = area;
            map.appendChild(area);
        }
    }
    // Last minute changes and go!
    busy = WAITING;
    resize();
    headBarrel = 0;
    theBarrel = 0;
    plateTimeout = null;
    body.onresize = onresize = resize;
    workingBlock.tabIndex = 0; // to enable keypress
    workingBlock.onkeydown = dismiss;
    workingBlock.onmousedown = dismiss;
    body.oncontextmenu = prevent;
    busy = true;
    playAudio(welcome, idle);
}

function resize() {
    radius = Math.round(Math.min(body.offsetWidth / (numColumns + 0.5), body.offsetHeight / ((numRows + 0.5) * ROW_HEIGHT)) / 2);
    barrelClass.width = 2 * radius + 'px';
    barrelClass.height = 2 * radius + 'px';plateStyle
    for (var i = 0, barrel; barrel = barrels[i++];) {
        barrel.style.bottom = Math.round(barrel.row * radius) + 'px';
        barrel.style.left = barrel.column * radius + 'px';
        barrel.area.coords = radius + ',' + radius + ',' + radius;
    }
    var f = Math.min(body.offsetWidth, body.offsetHeight) * PLATE_FIELD;
    var s = Math.min(body.offsetWidth - 2 * f, (body.offsetHeight - 2 * f) * PLATE_ASPECT);
    var w = s * PLATE_SIZE;
    var h = w / PLATE_ASPECT;
    plateClass.width = Math.round(w) + 'px';
    plateClass.height = Math.round(h) + 'px';
    plateClass.margin = '-' + Math.round(h / 2) + 'px -' + Math.round(w / 2) + 'px';
    plateContentClass.padding = '0 ' + Math.round(w * PLATE_PADDING) + 'px';
    plateClass.fontSize = Math.round(w * FONT_SIZE) + 'px';
    successClass.fontSize = Math.round(w * SUCCESS_FONT_SIZE) + 'px';
    plateLeft = Math.round(body.offsetWidth - w - f) + 'px';
    plateBottom = Math.round(body.offsetHeight - h - f) + 'px';
    if (busy == IDLE) {
        plateStyle.left = plateStyle.bottom = null;
        setProperty(plateStyle, 'transition', null);
    } else if (busy >= FADEIN) {
        plateStyle.left = plateLeft;
        plateStyle.bottom = plateBottom;
    }
}

function idle() {
    for (var i = 0; i < barrels.length; i++) {
        var barrel = barrels[i];
        var angle;
        if (i === headBarrel) {
            theBarrel = 1 + Math.floor(Math.random() * HOURS);
            angle = theBarrel * (CIRCLE / HOURS);
        } else {
            angle = Math.floor(Math.random() * CIRCLE);
        }
        setProperty(barrel.image.style, 'transform', 'rotate(' + angle + 'deg)');
        barrel.highlight.style.opacity = 0;
    }
    startupBlock.className = 'invisible';
    workingBlock.className = 'visible';
    workingBlock.focus();
    busy = IDLE;
}

function highlightBarrel(e) {
    if (!busy || e.highlight) {
        e = e || window.event;
        (e.target || e).highlight.style.opacity = HIGHLIGHT;
    }
}

function dimBarrel(e) {
    if (!busy || e.highlight) {
        e = e || window.event;
        (e.target || e).highlight.style.opacity = 0;
    }
}

function tap(e) {
    if (busy != IDLE) {
        return;
    }
    e = e || window.event;
    tappedBarrel = e.target.barrel;
    if (!tappedBarrel) {
        return;
    }
    busy = KNOCKING;
    plateStyle.margin = null;
    setProperty(plateStyle, 'transform', null);
    setProperty(plateStyle, 'transition', null);
    plateStyle.left = parseSize(tappedBarrel.style.left) + radius + 'px';
    plateStyle.bottom = parseSize(tappedBarrel.style.bottom) + radius + 'px';
    playAudio(knock, answer);
}

function answer() {
    if (busy != KNOCKING) {
        return;
    }
    dimBarrel(tappedBarrel);
    var ok = (tappedBarrel.number === theBarrel);
    var angle = parseInt(tappedBarrel.image.style.transform.slice(7, -4));
    var rotate = ok ? CIRCLE : -CIRCLE;
    plateContentID.innerHTML = ok ? SUCCESS : PREFIX + OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
    setProperty(tappedBarrel.image.style, 'transform', 'rotate(' + (angle + rotate) + 'deg)');
    busy = FADEIN;
    setProperty(plateStyle, 'transition', TRANSITION_LENGTH);
    plateStyle.margin = 0;
    plateStyle.left = plateLeft;
    plateStyle.bottom = plateBottom;
    setProperty(plateStyle, 'transform', 'rotate(' + 2 * rotate + 'deg) scale(1)');
    playAudio(ok ? granted : denied);
    resetPlateTimeout(true);
    setTimeout(fadeIn, TRANSITION_TIMEOUT);
}

function fadeIn() {
    if (busy != FADEIN) {
        return;
    }
    busy = WAITING;
    setProperty(plateStyle, 'transition', null);
}

function dismiss(e) {
    if (busy != WAITING) {
        return prevent(e);
    }
    resetPlateTimeout();
    plate.onmousedown = null;
    setProperty(plateStyle, 'transition', TRANSITION_LENGTH + ' ease-in');
    plateStyle.left = body.offsetWidth + 'px';
    idle();
    return prevent(e);
}
