'use strict';

var say = require('say');

var speaking = false;
var queue = [];

function nextSentence() {
    var next = queue.shift();
    if (next) {
        speaking = true;
        var voice = next[0];
        var sentence = next[1];
        if (!sentence) {
            sentence = voice;
            voice = null;
        }
        say.speak(voice, sentence, nextSentence);
    } else {
        speaking = false;
    }
}

function speakInTurn(voice, sentence) {
    queue.push([voice, sentence]);
    if (!speaking) {
        nextSentence();
    }
}

module.exports = speakInTurn;
