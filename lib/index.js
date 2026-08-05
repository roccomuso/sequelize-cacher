'use strict';

const crypto = require('crypto');
const { stringify: flattedStringify } = require('flatted');
const debug = require('debug')('sequelize-cacher:core');

let engine = null; // Redis or Memcached
let sequelize = null;

module.exports = init;

/**
 * Public method name -> actual Sequelize model function name.
 * `find`/`all` were removed from Sequelize as of v4 (only `findOne`/`findAll`
 * remain), but are kept here as public aliases for backward compatibility.
 */
const methodMap = {
  find: 'findOne',
  findOne: 'findOne',
  findAll: 'findAll',
  all: 'findAll',
  findAndCountAll: 'findAndCountAll',
  min: 'min',
  max: 'max',
  sum: 'sum',
  count: 'count'
};

const commonMethods = Object.keys(methodMap);

/**
 * Initializer to return the cacher constructor
 * - Checking for both redis or memcached instances
 */
function init(seq, eng) {
  sequelize = seq;
  engine = eng;

  commonMethods.forEach(addMethod);

  if (isRedisClient(engine)) {
    debug('Redis instance found');
    require('./redisLayer.js')(Cacher);
    return Cacher;
  }

  if (isMemcachedClient(engine)) {
    debug('Memcached instance found');
    require('./memcachedLayer.js')(Cacher);
    return Cacher;
  }

  throw new Error('sequelize-cacher: no valid Redis or Memcached instance provided');
}

function isRedisClient(candidate) {
  return !!candidate && typeof candidate.sendCommand === 'function' && typeof candidate.connect === 'function';
}

function isMemcachedClient(candidate) {
  try {
    return candidate instanceof require('memcached');
  } catch (e) {
    return false;
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
Cacher.prototype.fetchFromDatabase = async function fetchFromDatabase(key) {
  const fnName = methodMap[this.method] || this.method;
  const method = this.model[fnName];
  if (!method) {
    throw new Error('Invalid method - ' + this.method);
  }
  this.cacheHit = false; // see #19

  const results = await method.call(this.model, this.options);
  debug('fetching from DB');

  const res = toPlainResult(results, sequelize);
  await this.setCache(key, res, this.seconds);
  return res;
};

/**
 * Create redis/memcached key
 */
Cacher.prototype.key = function key() {
  const hash = crypto.createHash('sha1')
    .update(flattedStringify(this.options, jsonReplacer))
    .digest('hex');
  const generatedKey = [this.cachePrefix, this.modelName, this.method, hash].join(':');
  debug('generated key:', generatedKey);
  return generatedKey;
};

/**
 * Normalize a Sequelize result into a plain object/array, leaving
 * arrays and non-model values untouched.
 */
function toPlainResult(results, seq) {
  if (!results || Array.isArray(results)) {
    return results;
  }
  if (results instanceof seq.Sequelize.Model) {
    return results.get({ plain: true });
  }
  return results;
}

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
  Cacher.prototype[key] = function(...args) {
    this.method = key;
    return this.query.apply(this, args);
  };
}
