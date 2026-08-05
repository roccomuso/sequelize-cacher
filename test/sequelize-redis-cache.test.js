'use strict';

const redis = require('redis');
const Sequelize = require('sequelize');
const should = require('should');
const initCache = require('..');

const opts = {};
opts.database = process.env.DB_NAME || 'sequelize_redis_cache_test';
opts.user     = process.env.DB_USER || 'root';
opts.password = process.env.DB_PASS;
opts.dialect  = process.env.DB_DIALECT || 'sqlite';
opts.logging  = process.env.DB_LOG ? console.log : false;

const redisPort = process.env.REDIS_PORT || 6379;
const redisHost = process.env.REDIS_HOST || 'localhost';

/*global describe*/
/*global it*/
/*global before*/
/*global after*/

describe('Sequelize-Redis-Cache', function() {
  let rc;
  let db;
  let Entity;
  let Entity2;
  let inst;
  let cacher;

  before(async function() {
    rc = redis.createClient({ socket: { host: redisHost, port: redisPort } });
    rc.on('error', function(err) { throw err; });
    await rc.connect();

    db = new Sequelize(opts.database, opts.user, opts.password, opts);
    cacher = initCache(db, rc);
    Entity = db.define('entity', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: Sequelize.STRING(255)
    });
    Entity2 = db.define('entity2', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      }
    });
    Entity2.belongsTo(Entity, { foreignKey: 'entityId' });
    Entity.hasMany(Entity2, { foreignKey: 'entityId' });

    await Entity.sync({ force: true });
    await Entity2.sync({ force: true });
    inst = await Entity.create({ name: 'Test Instance' });
    await Entity2.create({ entityId: inst.id });
  });

  after(async function() {
    await rc.quit();
    await db.close();
  });

  it('should fetch stuff from database with and without cache', async function() {
    const query = { where: { createdAt: inst.createdAt } };
    const obj = cacher('entity').ttl(1);
    await obj.find(query);
    obj.cacheHit.should.equal(false);

    const obj2 = cacher('entity').ttl(1);
    const res = await obj2.find(query);
    should.exist(res);
    obj2.cacheHit.should.equal(true);
    await obj2.clearCache();
  });

  it('should fetch stuff from database with and without cache (findOne)', async function() {
    const query = { where: { createdAt: inst.createdAt } };
    const obj = cacher('entity').ttl(1);
    await obj.findOne(query);
    obj.cacheHit.should.equal(false);

    const obj2 = cacher('entity').ttl(1);
    const res = await obj2.findOne(query);
    should.exist(res);
    obj2.cacheHit.should.equal(true);
    await obj2.clearCache();
  });

  it('should not hit cache if no results', async function() {
    const obj = cacher('entity').ttl(1);
    const res = await obj.find({ where: { id: 2 } });
    should.not.exist(res);
    obj.cacheHit.should.equal(false);
  });

  it('should clear the cache correctly', async function() {
    const query = { where: { createdAt: inst.createdAt } };
    const obj = cacher('entity').ttl(1);
    await obj.find(query);
    const key = obj.key();
    await obj.clearCache(query);
    const res = await rc.get(key);
    should.not.exist(res);
  });

  it('should not blow up with circular reference queries (includes)', async function() {
    const query = { where: { createdAt: inst.createdAt }, include: [Entity2] };
    const obj = cacher('entity').ttl(1);
    await obj.find(query);
  });

  it('should return a POJO when retrieving from cache and when not', async function() {
    const query = { where: { createdAt: inst.createdAt }, include: [Entity2] };
    const obj = cacher('entity').ttl(1);
    const res = await obj.find(query);
    res.toString().should.not.equal('[object SequelizeInstance]');
    res.should.have.property('entity2s');
    res.entity2s.should.have.length(1);
    res.entity2s[0].toString().should.not.equal('[object SequelizeInstance]');
  });

  it('should findAll correctly', async function() {
    const query = { where: { createdAt: inst.createdAt } };
    const obj = cacher('entity').ttl(1);
    const res = await obj.findAll(query);
    should.exist(res);
    res.should.be.an.Array;
    res.should.have.length(1);
    res[0].should.have.property('id');
  });

  it('should count correctly', async function() {
    const obj = cacher('entity').ttl(1);
    const res = await obj.count();
    should.exist(res);
    res.should.equal(1);
  });

  it('should sum correctly', async function() {
    const obj = cacher('entity').ttl(1);
    const res = await obj.sum('id');
    should.exist(res);
    res.should.equal(1);
  });

  it('should max correctly', async function() {
    const obj = cacher('entity').ttl(1);
    const res = await obj.max('id');
    should.exist(res);
    res.should.equal(1);
  });

  it('should min correctly', async function() {
    const obj = cacher('entity').ttl(1);
    const res = await obj.min('id');
    should.exist(res);
    res.should.equal(1);
  });
});
