var debug = require('debug')('sequelize-cacher:memcached');

/* Memcached specific methods */
var Methods = {
   /**
   * Set data in cache
   */
   setCache: function(key, results, ttl) {
     var self = this;
     return new Promise(function promiser(resolve, reject) {
       var res;
       try {
         res = JSON.stringify(results);
       } catch (e) {
         return reject(e);
       }
       return self.engine.set(key, res, ttl, function(err, outcome) {
         if (err || !outcome) {
           return reject(err);
         }
         debug('data set in cache');
         return resolve(res);
       });
     });
   },
   /**
    * Clear cache with given query
    */
   clearCache: function (opts) {
     var self = this;
     this.options = opts || this.options;
     return new Promise(function promiser(resolve, reject) {
       var key = self.key();
       return self.engine.del(key, function onDel(err) {
         if (err) {
           return reject(err);
         }
         debug('cache cleared');
         return resolve();
       });
     });
   },
   /**
    * Fetch data from cache
    */
   fetchFromCache: function() {
     var self = this;
     return new Promise(function promiser(resolve, reject) {
       var key = self.key();
       return self.engine.get(key, function(err, res) {
         if (err) {
           return reject(err);
         }
         if (!res) {
           return self.fetchFromDatabase(key).then(resolve, reject);
         }
         self.cacheHit = true;
         debug('cache hit!');
         try {
           return resolve(JSON.parse(res));
         } catch (e) {
           return reject(e);
         }
       });
     });
   }
};


module.exports = function(Cacher){
  /* add these memcachedLayer methods to the Cacher */
  Object.keys(Methods).forEach(function(item){
    Cacher.prototype[item] = Methods[item];
  });
};
