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
  var sandbox;
  var db;

  before(function() {
    db = new loopback.DataSource('mem', {
      connector: loopback.Memory
    }, modelBuilder);
    mixins.define('CascadeDelete', CascadeDelete);
  })

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("hasMany", function() {
    before(function(done) {
      Book = db.createModel('Book', { name: String }, {
        mixins: {
          CascadeDelete: {
            relations: [
              {
                rel: 'chapters'
              },
              {
                rel: 'pages'
              },
              {
                rel: 'audio'
              }
            ]
          }
        }
      });
      Book.setPagesDeleted = sinon.stub().callsArg(3);
      Chapter = db.createModel('Chapter', { name: 'string' });
      Pages = db.createModel('Pages', { name: 'string' });
      Audio = db.createModel('audio', { file: 'string' });
      Book.hasMany('pages', { model: Pages });
      Book.hasMany('audio', { model: Audio});
      db.automigrate(['Book', 'Chapter', 'Pages'], done);
    });

    it('should delete related models -- hasMany', function(done) {
      var book;
      Book.hasMany('chapters', { model: Chapter });
      sandbox.spy(Chapter, 'destroyAll');
      Book.create({ name: 'Of Mice and Men' })
        .then(function(b) {
          book = b;
          sandbox.spy(book, 'destroy');
          return book.chapters.create({ name: 'Curley\'s Wife' });
        }).then(function(chapter) {
          return book.destroy();
        }).then(function() {
          expect(book.destroy).to.have.been.called;
          expect(Chapter.destroyAll).to.have.been.called;
          done();
        }).catch(function(err) {
          done(err);
        });
    });

    it('should delegate deleting related models to a static method', function(done) {
      var book;
      Book.create({ name: 'Of Mice and Men' }).then(function(b) {
        book = b;
        sandbox.spy(book, 'destroy');
        return book.pages.create({ name: 'Page 1' });
      }).then(function() {
        return book.destroy();
      }).then(function(d) {
        expect(book.destroy).to.have.been.called;
        done();
      }).catch(done);
    });
  });

  describe('hasMany through', function() {
    var Physician;
    var Patient;
    var Appointment;
    var Address;

    before(function (done) {
      Physician = db.define('Physician', { name: String }, {
        mixins: {
          CascadeDelete: {
            relations: [
              {
                rel: 'patients'
              }
            ]
          }
        }
      });
      Patient = db.define('Patient', {name: String});
      Appointment = db.define('Appointment', {date: {type: Date,
        default: function () {
          return new Date();
        }}});
      Address = db.define('Address', {name: String});

      Physician.hasMany(Patient, {through: Appointment});
      Patient.hasMany(Physician, {through: Appointment});
      Patient.belongsTo(Address);
      Appointment.belongsTo(Patient);
      Appointment.belongsTo(Physician);

      db.automigrate(['Physician', 'Patient', 'Appointment', 'Address'], done);
    });

    it('should cascade delete', function(done) {
      var physician;
      return Physician.create({name: 'ph1'})
        .then(function (_physician) {
          physician = _physician;
          return Patient.create({name: 'pa1'})
        }).then(function (patient) {
          return physician.patients.add(patient);
        }).then(function (app) {
          sandbox.spy(Appointment, 'destroyAll');
          physician.destroy(function(err) {
            // TODO: through models are not fully cascading
            // for example deleting the physician.patient,
            // deletes the appointments but not the patients
            expect(err).to.be.not.ok;
            expect(Appointment.destroyAll).to.have.been.called;
            done();
          });
        });
    })
  })
});
