module.exports = function mixin (app) {
  app.loopback.modelBuilder.mixins.define('CascadeDelete', require('./lib/cascade-delete'));
};
