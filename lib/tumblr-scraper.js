/* globals Promise */

'use strict';

var _ = require('lodash');
var tumblr = require('tumblr.js');

var Database = require('./database');

/**
 * # TumblrBlogScraper
 *
 * Scrapes all the posts from a given blog using the Tumblr API and puts them into MongoDB
 */
function TumblrBlogScraper(options) {
    options = options || {};
    this.client = options.client || tumblr.createClient(options.clientOptions || {});
    this.database = options.database || new Database(options.databaseOptions || {});
    this.blogName = options.blogName || '';
}

/**
 * ## databaseConnect
 */
TumblrBlogScraper.prototype.databaseConnect = function() {
    return this.database.connect();
};

/**
 * ## databaseClose
 */
TumblrBlogScraper.prototype.databaseClose = function() {
    return this.database.close();
};

/**
 * ## getPostsCollection
 *
 * Connect the database and get the posts collection
 */
TumblrBlogScraper.prototype.getPostsCollection = function() {
    return this.databaseConnect()
        .then(function(db) {
            return db.collection('posts');
        });
};

/**
 * ## fetchPosts
 *
 * Grab the posts for a blog from the API
 */
TumblrBlogScraper.prototype.fetchPosts = function(blogName, options) {
    if (!_.isString(blogName)) {
        options = blogName;
        blogName = options.blogName || this.blogName;
    }

    if (!blogName) {
        throw new Error('Must provide a blogName');
    }

    return new Promise(function(resolve, reject) {
        this.client.posts(blogName, _.extend({
            reblog_info: true
        }, options), function(err, response) {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    }.bind(this));
};

/**
 * ## resetPostStore
 *
 * Reset and reindex the posts table in the database
 */
TumblrBlogScraper.prototype.resetPostStore = function() {
    return this.database.resetCollection('posts', {
        id: -1,
        blog_name: 1,
    }, {
        unique: true
    });
};

/**
 * ## fetchPostsAndStore
 *
 * Fetch posts from the Tumblr API and store them in the database
 */
TumblrBlogScraper.prototype.fetchPostsAndStore = function(blogName, options) {
    return this.fetchPosts(blogName, options)
        .then(function(response) {
            return this.getPostsCollection()
                .then(function(posts) {
                    posts.insert(response.posts);
                    return response;
                });
        }.bind(this));
};

/**
 * ## scrape
 *
 * Fetch batches of posts from the Tumblr API until the end and store them in the database
 */
TumblrBlogScraper.prototype.scrape = function(blogName, options) {
    if (!_.isString(blogName)) {
        options = blogName;
        blogName = options.blogName || this.blogName;
    }

    var offset = _.parseInt(options.offset || 0);
    var limit = _.parseInt(options.limit || 20);
    var logging = options.logging || false;

    if (logging) {
        console.log('Scraping %s for %d posts after %d', blogName, limit, offset);
    }

    var scrape = this.scrape.bind(this);

    return this.fetchPostsAndStore(blogName, options)
        .then(function(response) {
            var posts = response.posts;
            if (logging) {
                console.log('Got %d posts!', posts.length);
            }

            if (posts.length >= limit) {
                offset += limit;
                return new Promise(function(resolve, reject) {
                    _.delay(function() {
                        scrape(blogName, _.defaults({
                            offset: offset,
                            limit: limit,
                        }, options)).then(resolve, reject);
                    }, 200);
                });
            } else {
                if (logging) {
                    console.log('Got all the posts.');
                }
                return true;
            }
        }, function(err) {
            console.error(err);
        });
};

module.exports = TumblrBlogScraper;
