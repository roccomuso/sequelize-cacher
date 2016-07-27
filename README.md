sequelize-cacher [![Build Status](https://travis-ci.org/roccomuso/sequelize-cacher.svg?branch=master)](https://travis-ci.org/roccomuso/sequelize-cacher)
=====================

*Small fluent interface for caching sequelize database query results in redis/memcached more easily*.
Simply put, this is a wrapper around sequelize retrieval methods that will automatically
check in the configured redis/memcached instance for a value (based on a hash of the query and
model name), then retrieve from the database and persist in redis/memcached if not found.  It is
promise based, so it will resemble sequelize for the most part, and be co/koa friendly.

This project is a fork of [sequelize-redis-cache](https://github.com/rfink/sequelize-redis-cache) by rfink, but with a new layer of cache supporting also **memcached**!

Installation
=====================

```

npm install sequelize-cacher

```

Usage
=====================

```javascript

var initCache = require('sequelize-cacher');
var redis = require('redis'); // or require('memcached')
var Sequelize = require('sequelize');

var cacheEngine = redis.createClient(6379, 'localhost');
var db = new Sequelize('cache_tester', 'root', 'root', { dialect: 'mysql' });
var cacher = initCache(db, cacheEgine);

var cacheObj = cacher('sequelize-model-name')
  .ttl(5);
cacheObj.find({ where: { id: 3 } })
  .then(function(row) {
    console.log(row); // sequelize db object
    console.log(cacheObj.cacheHit); // true or false
  });

```

Check the tests out for more info, but it's pretty simple.  The currently supported
methods are:

  find
  findOne
  findAll
  findAndCountAll
  all
  min
  max
  sum

Notes
=====================

This library does not handle automatic invalidation of caches, since it currently does not handle inserts/updates/deletes/etc.  I'd be in favor of someone submitting a patch to accommodate that, although I think that would be a significant undertaking.

License
====================

MIT - roccomuso

MIT - Rekt
