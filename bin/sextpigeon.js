#!/usr/bin/env node

'use strict';

var _ = require('lodash');
var minimist = require('minimist');

var SextPigeon = require('../lib/sextpigeon');
var speakInTurn = require('../lib/speak-in-turn');

var argv = minimist(process.argv.slice(2));

// Grab basic options
var blogName = argv.blogName;
var voice = _.isString(argv.sayIt) ? argv.sayIt : null;

// Create SexPigion instance
var options = _.pick(argv, 'blogName', 'databaseUrl');
var tumblrClientOptions = _.transform(_.pick(argv, [
    'consumerKey',
    'consumerSecret',
    'token',
    'tokenSecret',
]), function(clientOptions, value, key) {
    clientOptions[_.snakeCase(key)] = value;
});
if (!_.isEmpty(tumblrClientOptions)) {
    options.tumblrClientOptions = tumblrClientOptions;
}
var sextpigeon = new SextPigeon(options);
var blogName = sextpigeon.blogName;

// Do the routing
if (argv.scrape) {
    // Scrape posts from the blog, and optionally generate the post content file
    console.log('Generating a fresh post dump from %s. This will probably take a sec...', blogName);
    sextpigeon.scrapeBlog()
        .then(function() {
            if (argv.processPosts) {
                console.log('Generating post content file...');
                return sextpigeon.generator.databasePostsToFile(blogName);
            }
        })
        .then(function(filename) {
            console.log('Wrote posts to %s', filename);
        })
        .catch(function(err) {
            console.error(err);
        });
} else if (argv.processPosts) {
    // Generate the post content file, assuming the database already has posts
    console.log('Generating post content file...');
    sextpigeon.generator.databasePostsToFile(blogName)
        .then(function(filename) {
            console.log('Wrote posts to %s', filename);
        })
        .catch(function(err) {
            console.error(err);
        });
} else if (argv.generateSentences) {
    // Generate multiple sentences and optionally say them
    var numSentences = Math.max(1, _.parseInt(argv.generateSentences));
    var first = true;
    Promise.all(
        _.map(_.range(numSentences), function() {
            return sextpigeon.generateSentence(blogName)
                .then(function(sentence) {
                    if (!first) {
                        console.log('');
                    }
                    first = false;
                    console.log(sentence);
                    if (argv.sayIt) {
                        speakInTurn(voice, sentence);
                    }
                });
        })
    );
} else {
    sextpigeon.generateSentence(blogName)
        .then(function(sentence) {
            console.log(sentence);
            if (argv.sayIt) {
                speakInTurn(voice, sentence);
            }
        });
}
