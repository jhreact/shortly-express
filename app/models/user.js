var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var password = model.get('password');
      // console.log("PASS B4");
      // console.log(password);
      bcrypt.hash(password, null, null, function(err, hash) {
        model.set('password', hash);
      });
      // console.log("PASS AFTER");
      // console.log(model.get('password'));
    });
  },
  isCorrectPassword: function(password) {
    bcrypt.compare(password, model.get('password'), function(err, isCorrect) {
      return isCorrect;
    });
  }
});


module.exports = User;
