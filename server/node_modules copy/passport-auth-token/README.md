# passport-auth-token

[![Build](https://travis-ci.org/mbell8903/passport-auth-token.png)](https://travis-ci.org/mbell8903/passport-auth-token)
[![Coverage Status](https://coveralls.io/repos/mbell8903/passport-auth-token/badge.png)](https://coveralls.io/r/mbell8903/passport-auth-token)
[![Quality](https://codeclimate.com/github/mbell8903/passport-auth-token.png)](https://codeclimate.com/github/mbell8903/passport-auth-token)
[![Dependencies](https://david-dm.org/mbell8903/passport-auth-token.png)](https://david-dm.org/mbell8903/passport-auth-token)


[Passport](http://passportjs.org/) strategy for authenticating with an authentication token.

This module lets you authenticate using a token in your Node.js
applications. It is based on passport-local module by Jared Hanson.
By plugging into Passport, token authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Install

    $ npm install passport-auth-token

## Usage

#### Configure Strategy

The token authentication strategy authenticates users using a token.
The strategy requires a `verify` callback, which accepts these
credentials and calls `done` providing a user.
Here is the pseudo code.

    passport.use('authtoken', new AuthTokenStrategy(
      function(token, done) {
        AccessToken.findOne({
          id: token
        }, function(error, accessToken) {
          if (error) {
            return done(error);
          }

          if (accessToken) {
            if (!token.isValid(accessToken)) {
              return done(null, false);
            }

            User.findOne({
              id: accessToken.userId
            }, function(error, user) {
              if (error) {
                return done(error);
              }

              if (!user) {
                return done(null, false);
              }

              return done(null, user);
            });
          } else {
            return done(null);
          }
        });
      }
    ));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'authtoken'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

    app.post('/login',
      passport.authenticate(
        'authtoken',
        {
          session: false,
          optional: false
        }
      ),
      function(req, res) {
        res.redirect('/');
      }
    );

You can also set the parameter `optional` to true, so the same call can be both authenticated and not authenticated.

## Examples

For complete, working examples, refer to the multiple [examples](https://github.com/jaredhanson/passport-token/tree/master/examples) included. (NOT UPDATED)

## Tests

    $ npm install
    $ npm test

## Credits

  - [Mike Bell](http://github.com/mbell8903)

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2014 Mike Bell
