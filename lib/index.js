var Promise = require('bluebird');
var CircularJSON = require('circular-json');
var crypto = require('crypto');
var debug = require('debug')('sequelize-cacher:core');
var engine = null; // Redis or Memcached
var sequelize = null;

module.exports = init;

var commonMethods = [
  'find',
  'findOne',
  'findAll',
  'findAndCountAll',
  'all',
  'min',
  'max',
  'sum',
  'count'
];

/**
 * Initializer to return the cacher constructor
 * - Checking for both redis or memcached istances
 */
function init(seq, eng) {
  sequelize = seq;
  engine = eng;

  commonMethods.forEach(addMethod);

  try {
    require.resolve("redis");
    debug('redis module found');
    if (engine instanceof require('redis').RedisClient){
      require('./redisLayer.js')(Cacher);
      debug('Redis istance found');
      return Cacher;
    } else debug('skipping redis...');
  } catch(e) {}

  debug('redis istance not found, trying memcached');
  try{
    require.resolve('memcached');
    debug('memcached module found');
    if (engine instanceof require('memcached')){
      require('./memcachedLayer.js')(Cacher);
      debug('Memcached istance found');
      return Cacher;
    }else throw Error();
  }catch(e){
    console.log('No Redis or Memcached istances found...');
    process.exit(1);
  }

}

/**
 * Constructor for cacher
 */
function Cacher(model) {
  if (!(this instanceof Cacher)) {
    return new Cacher(model);
  }
  this.engine = engine;
  this.method = 'find';
  this.modelName = model;
  this.model = sequelize.model(model);
  this.options = {};
  this.seconds = 0;
  this.cacheHit = false;
  this.cachePrefix = 'cacher';
}

/**
 * Set cache prefix
 */
Cacher.prototype.prefix = function prefix(cachePrefix) {
  this.cachePrefix = cachePrefix;
  return this;
};

/**
 * Execute the query and return a promise
 */
Cacher.prototype.query = function query(options) {
  this.options = options || this.options;
  return this.fetchFromCache();
};

/**
 * Set TTL (in seconds)
 */
Cacher.prototype.ttl = function ttl(seconds) {
  this.seconds = seconds;
  return this;
};

/**
 * Fetch from the database
 */
Cacher.prototype.fetchFromDatabase = function fetchFromDatabase(key) {
  var method = this.model[this.method];
  var self = this;
  // TODO: self.cacheHit = false; // see #19
  return new Promise(function promiser(resolve, reject) {
    if (!method) {
      return reject(new Error('Invalid method - ' + self.method));
    }
    return method.call(self.model, self.options)
      .then(function then(results) {
        debug('fetching from DB');
        var res;
        if (!results) {
          res = results;
        } else if (Array.isArray(results)) {
          res = results;
        } else if (results.toString() === '[object SequelizeInstance]') {
          res = results.get({ plain: true });
        } else {
          res = results;
        }
        return self.setCache(key, res, self.seconds)
          .then(
            function good() {
              return resolve(res);
            },
            function bad(err) {
              return reject(err);
            }
          );
      },
      function(err) {
        reject(err);
      });
  });
};


/**
 * Create redis/memcached key
 */
Cacher.prototype.key = function key() {
  var hash = crypto.createHash('sha1')
    .update(CircularJSON.stringify(this.options, jsonReplacer))
    .digest('hex');
  var key = [this.cachePrefix, this.modelName, this.method, hash].join(':');
  debug('generated key:', key);
  return key;
};

/**
 * Duct tape to check if this is a sequelize DAOFactory
 */
function jsonReplacer(key, value) {
  if (value && (value.DAO || value.sequelize)) {
    return value.name || '';
  }
  return value;
}

/**
 * Add a retrieval method
 */
function addMethod(key) {
  Cacher.prototype[key] = function() {
    this.method = key;
    return this.query.apply(this, arguments);
  };
}
