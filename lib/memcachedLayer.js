'use strict';

const debug = require('debug')('sequelize-cacher:memcached');

/* Memcached specific methods */
const Methods = {
  /**
   * Set data in cache
   */
  setCache(key, results, ttl) {
    const self = this;
    let value;
    try {
      value = JSON.stringify(results);
    } catch (e) {
      return Promise.reject(e);
    }
    return new Promise((resolve, reject) => {
      self.engine.set(key, value, ttl, (err, outcome) => {
        if (err || !outcome) {
          return reject(err);
        }
        debug('data set in cache');
        resolve(value);
      });
    });
  },

  /**
   * Clear cache with given query
   */
  clearCache(opts) {
    this.options = opts || this.options;
    const self = this;
    const key = this.key();
    return new Promise((resolve, reject) => {
      self.engine.del(key, (err) => {
        if (err) {
          return reject(err);
        }
        debug('cache cleared');
        resolve();
      });
    });
  },

  /**
   * Fetch data from cache
   */
  fetchFromCache() {
    const self = this;
    const key = this.key();
    return new Promise((resolve, reject) => {
      self.engine.get(key, (err, res) => {
        if (err) {
          return reject(err);
        }
        if (!res) {
          return self.fetchFromDatabase(key).then(resolve, reject);
        }
        self.cacheHit = true;
        debug('cache hit!');
        try {
          resolve(JSON.parse(res));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
};

module.exports = function attachMemcachedLayer(Cacher) {
  /* add these memcachedLayer methods to the Cacher */
  Object.assign(Cacher.prototype, Methods);
};
