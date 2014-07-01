var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  isCorrectPassword: function(password) {
    bcrypt.compare(password, model.get('password'), function(err, isCorrect) {
      return isCorrect;
    });
  }
});


module.exports = User;
