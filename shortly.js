var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();
app.use(express.cookieParser('s3cr3t'));
app.use(express.session());

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser())
  app.use(express.static(__dirname + '/public'));
});

var checkUser = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    // req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

app.get('/', checkUser, function(req, res) {
  res.render('index');
});

app.get('/create', checkUser, function(req, res) {
  res.render('index');
});

app.get('/links', checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  })
});

// Should we assume the user is already authenticated if they're posting data?
// i.e., only check on get requests
app.post('/links', checkUser, function(req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  // console.log("CHECKING URI:");
  // console.log(uri);
  new Link({ url: uri }).fetch().then(function(found) {
    // console.log("DID WE FIND URI?");
    // console.log(found.attributes);
    if (found) {
      // console.log("FOUND IT!")
      res.send(200, found.attributes);
    } else {
      // console.log("DIDN'T FIND IT :(");
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  new User({ username: username }).fetch().then(function(foundUser) {
    if (foundUser) {
      // console.log('USER ALREADY EXISTS');
      res.redirect('/');
    } else {
      bcrypt.hash(password, null, null, function(err, hash) {
        var bpass = hash;
        var user = new User({
          username: username,
          password: bpass
        }).save().then(function() {
          // console.log('SAVED NEW USER');
          // res.redirect('/');
          req.session.regenerate(function() {
            req.session.user = username;
            res.redirect('/');
          });
        });
      });
    }
  });

});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username }).fetch().then(function(foundUser) {
    if (foundUser) {
      // console.log('FOUND USER: ');
      // console.log(foundUser.attributes);
      bcrypt.compare(password, foundUser.attributes.password, function(err, isCorrect) {
        if (isCorrect) {
          // console.log('CORRECT PASS');
          // console.log(password, foundUser.attributes.password);
          req.session.regenerate(function() {
            req.session.user = username;
            res.redirect('/');
          });
        } else {
          // console.log('WRONG PASS');
          // console.log(password, foundUser.attributes.password);
          res.redirect('/signup');
        }
      });
    } else {
      // console.log('COULD NOT FIND USER');
      // console.log(username);
      res.redirect('/login');
    }
  });
});

app.get('/logout', function(req, res) {
  res.session.destroy(function() {
    res.redirect('/');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
