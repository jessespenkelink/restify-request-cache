const url = require('url');
const Memcached = require('memcached');
const crypto = require('crypto');

const config = require('./config');

const memcached = new Memcached(config.memcached.location, config.memcached.opts);

/**
 * @param {Error|String} exception 
 */
function exceptionHandler(exception) {
	if (typeof exception === 'string') {
		throw new Error(exception);
	}
	throw exception;
}

function restifyRequestCache(callback) {
	return async (req, res, next) => {
		/**
		 * Use the request url object to create
		 * a hash, which we will use as cache key.
		 */
		const uri = url.parse(req.url);
		const uriString = JSON.stringify(uri);
		const key = crypto.createHash(config.hash.alghorithm)
			.update(uriString, config.hash.inputEncoding)
			.digest(config.hash.digestEncoding);

		/**
		 * Get data by key from memcached
		 */
		const cached = await new Promise((resolve, reject) => {
			memcached.get(key, (err, data) => {
				if (err) {
					reject(exceptionHandler(err));
					return;
				}
				resolve(data);
			});
		});

		/**
		 * If data is fetched with the created key,
		 * send data to the client and call next to let
		 * restify know that we're done.
		 */
		if (cached) {
			res.cache('public', { maxAge: config.opts.ttl });
			res.header('X-Restify-Request-Cache', 'hit');
			res.send(JSON.parse(cached));
			return next();
		}

		/**
		 * @todo: support send and sendRaw parameters: code, body and headers
		 * If we get here, it means the request has not
		 * been cached. Handle the request normally.
		 */
		res.noCache();
		res.header('X-Restify-Request-Cache-Hit', 'miss');
		return callback(req, {
			...res,
			send: (data) => {
				memcached.add(key, JSON.stringify(data), config.opts.ttl, (err) => {
					if (err) {
						exceptionHandler(err);
					}
				});
				res.send(data);
			},
			sendRaw: (data) => {
				memcached.add(key, JSON.stringify(data), config.opts.ttl, (err) => {
					if (err) {
						exceptionHandler(err);
					}
				});
				res.sendRaw(data);
			}
		}, next);
	};
}

module.exports = restifyRequestCache;