/* globals Promise */

'use strict';

var MongoClient = require('mongodb').MongoClient;


/**
 * # Database
 *
 * A wrapper for an instance of MongoDB connection.
 */
function Database(options) {
    options = options || {};
    this.isConnected = false;
    this.url = options.url || 'mongodb://localhost:27017';
    this.database = false;
}

/**
 * ## connect
 *
 * @return Promise
 */
Database.prototype.connect = function() {
    return new Promise(function(resolve, reject) {
        if (this.database) {
            resolve(this.database);
        } else {
            console.log('Opening connection...');
            MongoClient.connect(this.url, function(err, database) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    this.database = database;
                    resolve(database);
                }
            }.bind(this));
        }
    }.bind(this));
};

/**
 * ## close
 */
Database.prototype.close = function() {
    if (this.database) {
        this.database.close();
        this.database = false;
        console.log('Closed connection.');
    }
};

/**
 * ## getCollectionDocs
 *
 * Get the contents of a collection as an array
 */
Database.prototype.getCollectionDocs = function(name, filter, sort) {
    filter = filter || {};
    sort = sort || {};

    // If we're not already connected, close the connection afterwards
    var afterResolve = this.database ? function() {} : this.close.bind(this);

    return this.connect().then(function(db) {
        return new Promise(function(resolve, reject) {
            db.collection(name)
                .find(filter)
                .sort(sort)
                .toArray(function(err, docs) {
                    resolve(docs);
                    afterResolve();
                });
        });
    });
};

/**
 * ## resetCollection
 *
 * Drop a collection and optionally create an index on it
 */
Database.prototype.resetCollection = function(name, indexKeys, indexOptions) {
    // If we're not already connected, close the connection afterwards
    var afterResolve = this.database ? function() {} : this.close.bind(this);

    return this.connect().then(function(db) {
        return new Promise(function(resolve, reject) {
            var collection = db.collection(name);
            collection.drop(function(err) {
                if (err) {
                    reject(err);
                } else {
                    if (indexKeys) {
                        collection.createIndex(
                            indexKeys,
                            indexOptions || {},
                            function(err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                    afterResolve();
                                }
                            }
                        );
                    } else {
                        resolve();
                        afterResolve();
                    }
                }
            });
        });
    });
};

module.exports = Database;
