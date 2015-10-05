/* globals Promise */

'use strict';

var _ = require('lodash');

var Database = require('./lib/database');
var TumblrScraper = require('./lib/tumblr-scraper');
var PostMarkovChainGenerator = require('./lib/post-markov-chain-generator');
var speakInTurn = require('./lib/speak-in-turn');

/**
 * # SextPigeon
 *
 * A thing that can scrape blogs for content and generate sentences
 */
function SextPigeon(options) {
    this.blogName = options.blogName || 'sexpigeon';

    this.database = new Database({
        url: options.databaseUrl || 'mongodb://localhost:27017/sextpigeon',
    });
    this.scraper = new TumblrScraper({
        database: this.database,
        blogName: this.blogName,
        clientOptions: options.tumblrClientOptions,
    });
    this.generator = new PostMarkovChainGenerator({
        database: this.database,
        blogName: this.blogName,
    });
}

/**
 * ## scrapeBlog
 *
 * Reset the post collection and scrape the posts from the blog
 */
SextPigeon.prototype.scrapeBlog = function() {
    var blogName = this.blogName;
    var scraper = this.scraper;
    var database = this.database;

    return database.connect()
        .then(function() {
            return scraper.resetPostStore();
        })
        .then(function() {
            return scraper.scrape(blogName, {
                logging: true,
            });
        })
        .then(function() {
            return scraper.getPostsCollection();
        })
        .then(function() {
            return database.close();
        })
        .catch(function(err) {
            console.error(err);
        });
};

/**
 * ## generateSentence
 *
 * Generate a single sentence from the scraped blog data
 */
SextPigeon.prototype.generateSentence = function(postFilter) {
    return this.generator.generateSentence(postFilter);
};

module.exports = {
    SextPigeon: SextPigeon,
    PostMarkovChainGenerator: PostMarkovChainGenerator,
    TumblrScraper: TumblrScraper,
    Database: Database,
};

function parseArgs() {
    var options = {};
    process.argv.slice(2).forEach(function(arg) {
        var match = arg.match(/--([^=]+)(?:=(.*))?/);
        if (match) {
            var key = match[1];
            var value = match[2];
            if (value) {
                value = value.replace(/'^(.*)'$/, '$1').replace(/"^(.*)"$/, '$1');
            } else if (value !== '') {
                value = true;
            }
            if (key) {
                options[key] = value;
            }
        }
    });
    return options;
}

/**
 * Handle command line behavior
 */
(function() {
    // Bail if this is loaded via `require()`
    if (module.parent) return;

    var options = parseArgs();

    // Grab basic options
    var blogName = options.blogName;
    var voice = _.isString(options.sayIt) ? options.sayIt : null;

    // Create SexPigion instance
    var sextpigeon = new SextPigeon(_.pick(options, [
        'blogName',
        'databaseUrl',
    ]));

    // Do the routing
    if (options.scrape) {
        // Scrape posts from the blog, and optionally generate the post content file
        console.log('Generating a fresh post dump from %s. This will probably take a sec...', blogName);
        sextpigeon.scrapeBlog()
            .then(function() {
                if (options.processPosts) {
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
    } else if (options.processPosts) {
        // Generate the post content file, assuming the database already has posts
        console.log('Generating post content file...');
        sextpigeon.generator.databasePostsToFile(blogName)
            .then(function(filename) {
                console.log('Wrote posts to %s', filename);
            })
            .catch(function(err) {
                console.error(err);
            });
    } else if (options.generateSentences) {
        // Generate multiple sentences and optionally say them
        var numSentences = Math.max(1, _.parseInt(options.generateSentences));
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
                        if (options.sayIt) {
                            speakInTurn(voice, sentence);
                        }
                    });
            })
        );
    } else {
        sextpigeon.generateSentence(blogName)
            .then(function(sentence) {
                console.log(sentence);
                if (options.sayIt) {
                    speakInTurn(voice, sentence);
                }
            });
    }

})();
