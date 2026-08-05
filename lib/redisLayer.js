'use strict';

const debug = require('debug')('sequelize-cacher:redis');

/* Redis specific methods */
const Methods = {
  /**
   * Set data in cache
   */
  async setCache(key, results, ttl) {
    const value = JSON.stringify(results);
    const options = ttl ? { EX: ttl } : undefined;
    const reply = await this.engine.set(key, value, options);
    debug('data set in cache');
    return reply;
  },

  /**
   * Clear cache with given query
   */
  async clearCache(opts) {
    this.options = opts || this.options;
    const key = this.key();
    await this.engine.del(key);
    debug('cache cleared');
  },

  /**
   * Fetch data from cache
   */
  async fetchFromCache() {
    const key = this.key();
    const cached = await this.engine.get(key);
    if (!cached) {
      return this.fetchFromDatabase(key);
    }
    this.cacheHit = true;
    debug('cache hit!');
    return JSON.parse(cached);
  }
};

module.exports = function attachRedisLayer(Cacher) {
  /* add these redisLayer methods to the Cacher */
  Object.assign(Cacher.prototype, Methods);
};
