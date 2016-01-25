'use strict';
var debug = require('debug')('loopback:mixins:cascade-delete');

module.exports = function(Model, options) {
  var hasRelation = function(Model, name) {
    return Object.keys(Model.relations).indexOf(name) > -1;
  };
  var getRelation = function(Model, name) {
    return Model.relations[name];
  };
  var cascadeDeletes = options.relations.map(function(opts) {
    return function(id) {
      var relation;
      var RelatedModel;
      var where = {};

      opts.options = opts.options || {};

      if (!hasRelation(Model, opts.rel)) {
        return;
      }

      relation = getRelation(Model, opts.rel);
      RelatedModel = relation.modelTo;
      where[relation.keyTo] = id;

      return new Promise(function(resolve, reject) {
        if (opts.options.setter && typeof Model[opts.options.setter] === 'function') {
          Model[opts.options.setter](id, RelatedModel, relation, function(err) {
            if (!!options.failOnErr && err) {
              return reject(err);
            }
            resolve();
          });
        } else if (RelatedModel) {
          RelatedModel.destroyAll(where, function(err, info) {
            if(typeof Model[opts.options.afterDeleteCb] === 'function') {
              Model[opts.afterDeleteCb](err, info);
            }
            if (!!opts.options.failOnErr && err) {
              return reject(err);
            }
            resolve(info);
          });
        }
      });
    };
  });

  Model.observe('after delete', function(ctx, next) {
    if (!(ctx.instance && ctx.instance.id)) {
      return next();
    }
    var id = ctx.instance.id;
    var deleted = cascadeDeletes.map(function(deleteRel) {
      return deleteRel(id);
    });
    Promise.all(deleted)
      .then(function() {
        next();
      })
      .catch(function(err) {
        next(err);
      });
  });
};
