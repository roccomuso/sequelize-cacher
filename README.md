sequelize-cacher [![test](https://github.com/roccomuso/sequelize-cacher/actions/workflows/test.yml/badge.svg)](https://github.com/roccomuso/sequelize-cacher/actions/workflows/test.yml)
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

const Sequelize = require('sequelize');
const initCache = require('sequelize-cacher');
const redis = require('redis');
// const Memcached = require('memcached');

const cacheEngine = redis.createClient({ socket: { host: 'localhost', port: 6379 } });
await cacheEngine.connect(); // required as of redis v4+
// const cacheEngine = new Memcached('localhost:11211');
const db = new Sequelize('cache_tester', 'root', 'root', { dialect: 'mysql' });
const cacher = initCache(db, cacheEngine);

const cacheObj = cacher('sequelize-model-name').ttl(5);
const row = await cacheObj.find({ where: { id: 3 } });
console.log(row); // plain object
console.log(cacheObj.cacheHit); // true or false

```

Check the tests out for more info, but it's pretty simple.  The currently supported
methods are:

- find (alias of findOne)
- findOne
- findAll
- findAndCountAll
- all (alias of findAll)
- min
- max
- sum

`find` and `all` are legacy aliases kept for backward compatibility; Sequelize itself
dropped those method names as of v4, so under the hood they're mapped to `findOne`
and `findAll` respectively.

This library expects a Redis client from `redis` v4+ (already `.connect()`-ed before
being passed in) or a client from the `memcached` package.

Notes
=====================

This library does not handle automatic invalidation of caches, since it currently does not handle inserts/updates/deletes/etc.  I'd be in favor of someone submitting a patch to accommodate that, although I think that would be a significant undertaking.

License
====================

MIT - roccomuso

MIT - Rekt
