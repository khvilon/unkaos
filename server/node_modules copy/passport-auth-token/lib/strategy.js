/**
 * Module dependencies.
 */
var passport = require('passport-strategy'),
	util = require('util'),
	lookup = require('./utils').lookup;


/**
 * `Strategy` constructor.
 *
 * The token authentication strategy authenticates requests based on the
 * credentials submitted through an authentication token.
 *
 * Applications must supply a `verify` callback which accepts `token`
 * credentials, and then calls the `done` callback supplying a
 * `user` associated with the token, which should be set to `false`
 * if the credentials are not valid.
 * If an exception occured, `err` should be set.
 * The token can be optional, so the strategy can support both authenticated and
 * not authenticated calls
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *   - `tokenFields`  array of field names where the token is found, defaults to [token]
 *   - `headerFields`  array of field names where the token is found, defaults to []
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *   - `params`  when `true` the request params are also included in the lookup
 *   - `optional`  when `true` the token is optional and the strategy doesn't return an error
 *
 * Examples:
 *
 *     passport.use(new AuthTokenStrategy(
 *       function(token, done) {
 *         AccessToken.findById(token, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy (options, verify) {
	if (typeof options == 'function') {
		verify = options;
		options = {};
	}

	if (!verify) {
		throw new TypeError('AuthTokenStrategy requires a verify callback');
	}

	this._tokenFields = options.tokenFields || ['token'];
	this._headerFields = options.headerFields || [];

	passport.Strategy.call(this);
	this.name = 'authtoken';
	this._verify = verify;
	this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
	options = options || {};

	var i, len, token;

	for (i = 0, len = this._headerFields.length; !token && i < len; i++) {
		token = lookup(req.headers, this._headerFields[i]);
	}

	for (i = 0, len = this._tokenFields.length; !token && i < len; i++) {
		token = lookup(req.body, this._tokenFields[i]) || lookup(req.query, this._tokenFields[i]);

		if (options.params) {
			token = lookup(req.params, this._tokenFields[i]);
		}
	}

	if (!options.optional) {
		if (!token) {
			return this.fail({ message: options.badRequestMessage || 'Missing auth token' }, 400);
		}
	}

	var self = this;

	function verified (err, user, info) {
		if (err) {
			return self.error(err);
		}
		if (!options.optional) {
			if (!user) {
				return self.fail(info);
			}
		}
		self.success(user, info);
	}

	try {
		if (self._passReqToCallback) {
			this._verify(req, token, verified);
		} else {
			this._verify(token, verified);
		}
	} catch (ex) {
		return self.error(ex);
	}
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;