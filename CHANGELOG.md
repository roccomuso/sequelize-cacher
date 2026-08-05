# v2.0.0 #
- Upgrade to Sequelize 6.x, redis 6.x (node-redis v4+ promise API), memcached, mocha, should and sqlite3
- Drop `bluebird` in favor of native Promises/async-await; replace deprecated `circular-json` with `flatted`
- Fix: `find`/`all` were silently broken against any Sequelize >=4 (the underlying `find`/`all` model methods were removed); they're now mapped internally to `findOne`/`findAll` and kept as public aliases
- Fix: Sequelize-instance detection (`toString() === '[object SequelizeInstance]'`) no longer matched anything on modern Sequelize instances; replaced with a proper `instanceof Sequelize.Model` check
- Fix: the library called `process.exit(1)` when no valid Redis/Memcached instance was supplied, killing the host process; it now throws an `Error` instead
- Replace the fragile `require('redis').RedisClient` instanceof check (removed in node-redis v4+) with duck-typing so engine detection no longer depends on internal client class shapes
- Requires Node >=20
- Replace Travis CI with GitHub Actions

# v.1.3.0 #
- Now supporting memcached as cache engine
- Redis and Memcached are now 2 distincts cache layers

# v1.2.0 #
- Fixed issue with associations generating new cache (H/T https://github.com/NotJustClarkKent)
- Updated dev dependencies for sqlite3, redis (should work test correctly with node 4.x, 5.x, 6.x)

# v1.1.1 #
- Added error handler for database issues (H/T https://github.com/thujikun)

# v1.1.0 #
- Added findOne method (H/T https://github.com/jonathanleang)

# v1.0.0 #
- Add sequelize 3.0 support, drop queryOptions
- Added travis ci build status and entry

# v0.0.7 #
- Fix findAll from P.R. #3 (H/T to https://github.com/thujikun)

# v0.0.6 #
- Fix v0.0.5, findAll and aggregates

# v0.0.5 #
- This is also a broken release, do NOT use, findAll and aggregates become broken
- Fix v0.0.4, use .get and upgrade sequelize to 2.0.0rc1 (does recursive POJO conversion)
- Add CHANGELOG.md

# v0.0.4 #
- This is a bad release, do NOT use, uses toJSON method that may not exist

# v0.0.3 #
- Update test with toJSON method

# v0.0.2 #
- Fix for hashing of circular references (nested entities)

# v0.0.1 #
- Initial release
