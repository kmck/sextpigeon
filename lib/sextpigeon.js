'use strict';

var Database = require('./database');
var TumblrScraper = require('./tumblr-scraper');
var PostMarkovChainGenerator = require('./post-markov-chain-generator');

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

module.exports = SextPigeon;
