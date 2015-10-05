# sextpigeon

This thing grabs posts from a [Tumblr](http://www.tumblr.com) blog and feeds them to a Markov Chain text generator. Written as a way for me to scrape posts from the blog [sexpigeon](http://sexpigeon.tumblr.com) and generate [fun new text](http://sextpigeon.tumblr.com) out of it, but it pretty much just works for any blog.

## Installing

`npm install` to get the dependencies and stuff.

This requires a MongoDB database to store the content from a Tumblr API. You can run `npm run db` to get the DB going.

    npm run db # start the database
    mongo localhost:27017

Connect to the DB using `mongo localhost:27017` and then create the table to store posts:

    use sextpigeon
    db.createCollection('posts')
    exit

## Usage

Just read the code and you'll figure it out, maybe. Here's some half-assed instructions. Sorry.

### Scraping posts and writing the content to a text file

    node . --scrape --processPosts --blogName=sexpigeon

### Generating a sentence for a blog you've scraped and processed

    node . --blogName=sexpigeon

### Make your console speak

    node . --blogName=sexpigeon --sayIt

### Make a bunch at once

    node . --blogName=sexpigeon --generateSentences=20

