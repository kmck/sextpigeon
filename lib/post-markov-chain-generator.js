/* globals Promise */

'use strict';

var fs = require('fs');

var _ = require('lodash');
var htmlStrip = require('htmlstrip-native').html_strip;
var MarkovChain = require('markovchain').MarkovChain;

/**
 * Various utilities
 */

function randomPunctuation(sentence) {
    if (sentence.match(/^(who|what|where|when|why|how|are|did)/i)) {
        return '?';
    }
    return _('..........!!!!!'.split('')).sample();
}

function cleanUpSentence(sentence) {
    var lastChar = sentence.substr(-1);

    // Trim off any weird characters at the end
    if (lastChar.match(/[,:;]$/)) {
        sentence = sentence.substr(0, sentence.length - 1);
    }

    // End in punctuation
    if (!lastChar.match(/[!\.\?]$/)) {
        sentence += randomPunctuation(sentence);
    }

    // Remove stupid last words
    sentence = sentence.replace(/\s(and|a|or|the)(\W+)$/i, '$2');

    // Capitalize the first word
    return _.capitalize(sentence);
}

/**
 * # PostMarkovChainGenerator
 *
 * A Markov Chain Text Generator that can be connected to posts in a Database instance
 */
function PostMarkovChainGenerator(options) {
    options = options || {};
    this.database = options.database;
    this.blogName = options.blogName || '';
    this.postFilterSentence = options.postFilterSentence || cleanUpSentence;
}

/**
 * ## getPosts
 */
PostMarkovChainGenerator.prototype.getPosts = function(blogName) {
    blogName = blogName || this.blogName;
    return this.database.getCollectionDocs('posts', {
        'blog_name': blogName,
        '$or': [
            // Has a reblog trail with a comment
            {
                'reblog.comment': {
                    '$exists': true,
                    '$nin': [''],
                },
            },
            // Original quote or chat posts
            {
                'type': {
                    '$in': ['quote', 'chat'],
                },
                'reblogged_root_id': {
                    '$exists': false,
                },
            },
        ],
    }, {
        id: 1,
    });
};

/**
 * ## generateFilename
 *
 * Generate the filename for the blog content text output
 */
PostMarkovChainGenerator.prototype.generateFilename = function(blogName) {
    blogName = blogName || this.blogName;
    return 'blogtext/' + blogName + '.txt';
};

/**
 * ## databasePostsToFile
 *
 * Take the posts from the database and process them into a text file of only body content
 */
PostMarkovChainGenerator.prototype.databasePostsToFile = function(blogName, filename) {
    blogName = blogName || this.blogName;
    filename = filename || this.generateFilename(blogName);

    return this.getPosts(blogName).then(function(posts) {
        var postText = _.transform(posts, function(posts, post) {
            var comment = _.get(post, 'reblog.comment') || '';

            if (post.type === 'chat' && post.body) {
                comment = '<p>' + post.body + '</p>';
            }
            if (post.type === 'quote' && post.text) {
                comment += '<p>' + post.text + '</p>';
            }

            if (post.title) {
                comment = '<h1>' + post.title + '</h1>' + comment;
            }

            // Push the comment if we have one
            if (comment) {
                posts.push(htmlStrip(comment, {
                    compact_whitespace: true
                }));
            }
        }, []).join('\n\n');

        return new Promise(function(resolve, reject) {
            fs.writeFile(filename, postText, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(filename);
                }
            });
        });
    });
};

/**
 * ## markovChainStart
 *
 * Default Markov Chain start function for this instance
 * Starts with a random word from the word list.
 */
PostMarkovChainGenerator.prototype.markovChainStart = function(wordList) {
    return _(wordList).keys().sample();
};

/**
 * ## markovChainEnd
 *
 * Default Markov Chain end function for this instance
 * Stops after a word with punctuation or a certain number of words.
 */
PostMarkovChainGenerator.prototype.markovChainEnd = function(sentence) {
    var words = sentence.split(' ');
    if (words.length > 5 && words[words.length - 1].match(/[!\.\?]$/)) {
        return true;
    }
    if (words.length >= 5 + _.random(15)) {
        return true;
    }
    return false;
};

/**
 * ## createGenerator
 *
 * Create a Markov Chain text generator for the blog with the specified start and end functions
 */
PostMarkovChainGenerator.prototype.createGenerator = function(blogName, start, end) {
    blogName = blogName || this.blogName;
    start = start || this.markovChainStart;
    end = end || this.markovChainEnd;

    var filename = this.generateFilename(blogName);

    this.generator = new MarkovChain({
        files: filename
    }).start(start).end(end);

    return this.generator;
};

/**
 * ## generateSentence
 *
 * Creates a sentence using the current Markov Chain text generator
 */
PostMarkovChainGenerator.prototype.generateSentence = function(postFilter) {
    if (postFilter !== false && !_.isFunction(postFilter)) {
        postFilter = this.postFilterSentence;
    }

    var generator = this.generator || this.createGenerator();

    return new Promise(function(resolve, reject) {
        generator.process(function(err, sentence) {
            if (err) {
                reject(err);
            } else {
                if (postFilter) {
                    resolve(postFilter(sentence));
                } else {
                    resolve(sentence);
                }
            }
        });
    });
};

module.exports = PostMarkovChainGenerator;
