describe('Cascade Delete Mixin', function() {
  'use strict';
  var Book;
  var Chapter;
  var Pages;
  var Audio;
  var CascadeDelete = require('../lib/cascade-delete');
  var ModelBuilder = require('loopback-datasource-juggler').ModelBuilder;
  var modelBuilder = new ModelBuilder();
  var mixins = modelBuilder.mixins;

  before(function(done) {
    var memory = new loopback.DataSource('mem', {
      connector: loopback.Memory
    }, modelBuilder);
    mixins.define('CascadeDelete', CascadeDelete);
    Book = memory.createModel('Book', { name: 'string' }, {
      mixins: {
        CascadeDelete: {
          relations: [
            {
              rel: 'chapters'
            },
            {
              rel: 'pages',
              options: {
                setter: 'setPagesDeleted'
              }
            },
            {
              rel: 'audio',
              options: {
                failOnErr: true
              }
            }
          ]
        }
      }
    });
    Book.setPagesDeleted = sinon.stub().callsArg(3);
    Chapter = memory.createModel('Chapter', { name: 'string' });
    Pages = memory.createModel('Pages', { name: 'string' });
    Audio = memory.createModel('audio', { file: 'string' });
    Book.hasMany('chapters', { model: Chapter });
    Book.hasMany('pages', { model: Pages });
    Book.hasMany('audio', { model: Audio });
    memory.automigrate(['Book', 'Chapter', 'Pages'], done);
  });

  it('should delete related models -- hasMany', function(done) {
    var book;
    sinon.spy(Chapter, 'destroyAll');
    Book.create({ name: 'Of Mice and Men' }).then(function(b) {
      book = b;
      sinon.spy(book, 'destroy');
      return book.chapters.create({ name: 'Curley\'s Wife' });
    }).then(function(chapter) {
      return book.destroy();
    }).then(function(d) {
      expect(book.destroy).to.have.been.called;
      expect(Chapter.destroyAll).to.have.been.called;
      done();
    }).catch(done);
  });

  it('should delegate deleting related models to a static method', function(done) {
    var book;
    Book.create({ name: 'Of Mice and Men' }).then(function(b) {
      book = b;
      sinon.spy(book, 'destroy');
      return book.pages.create({ name: 'Page 1' });
    }).then(function() {
      return book.destroy();
    }).then(function(d) {
      expect(book.destroy).to.have.been.called;
      expect(Book.setPagesDeleted).to.have.been.called;
      done();
    }).catch(done);
  });

  it('should not continue when an error occurs and failOnErr is `true`', function(done) {
    var book;
    var thenCb = sinon.stub();
    sinon.stub(Audio, 'destroyAll').yields(new Error('Could not delete audio'));
    Book.create({ name: 'Of Mice and Men' }).then(function(b) {
      book = b;
      sinon.spy(book, 'destroy');
      return book.audio.create({ file: 'OfMiceAndMen.wav' });
    }).then(function() {
      return book.destroy();
    }).then(thenCb)
    .catch(function(err) {
      expect(err).to.be.ok;
      expect(thenCb).to.not.have.been.called;
      done();
    });
  });
});
