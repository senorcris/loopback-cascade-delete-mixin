'use strict';
var debug = require('debug')('loopback:mixins:cascade-delete');

module.exports = function(Model, options) {
  var cascadeDeletes = options.relations.map(function(opts) {
    return function(instance) {
      var id = instance.id;

      debug('Relation ' + opts.rel + ' model ' + Model.definition.name);

      opts.options = opts.options || {};
      if (!Model.relations[opts.rel]) {
        debug('Relation ' + opts.rel + ' not found for model ' + Model.definition.name);
        throw 'Relation ' + opts.rel + ' not found for model ' + Model.definition.name;
      }

      return new Promise(function(resolve, reject) {
        instance[opts.rel].destroyAll(function(err, info) {
          debug('Relation ', opts.rel, ' deleted with info ', info);
          resolve(info);
        });
      });
    };
  });

  Model.observe('before delete', function(ctx, next) {
    if (!(ctx.instance && ctx.instance.id)) {
      return next();
    }
    var id = ctx.instance.id;
    Model.findOne({
      where: { id: id }
    }).then(function(instance) {
      var deleted = cascadeDeletes.map(function(deleteRel) {
        return deleteRel(instance);
      });
      Promise.all(deleted)
        .then(function() {
          next();
        })
        .catch(function(err) {
          debug('Error with cascading deletes', err);
          next(err);
        });
    }).catch(function(err) {
      debug('Error fetching instance for delete', err);
      throw err;
    });
  });
};
