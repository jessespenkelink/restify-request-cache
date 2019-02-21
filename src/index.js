/**
 * Module requires
 */
const url = require('url');
const Memcached = require('memcached');
const crypto = require('crypto');

/**
 * Internal default configurations
 * @type {Object} - config
 */
const defaultOptions = {
  ttl: 10, // in seconds
  hash: {
    alghorithm: 'md5',
    inputEncoding: 'utf8',
    digestEncoding: 'hex',
  },
};

/**
 * Exception handler
 * @param {string} message - Message describing the exception.
 * @param {Error|string} exception - Thrown exception or a string describing the exception. 
 */
function exceptionHandler(message, exception) {
  if (typeof exception === 'string') {
    // eslint-disable-next-line no-console
    console.error(new Error(`${message}: ${exception}`));
    return;
  }
  exception.message = `${message}: ${exception.message}`;
  // eslint-disable-next-line no-console
  console.error(exception);
}

/**
 * Wrapper for route handling method.
 * This will cache the request for the
 * route handler this is wrapped around.
 * @param {Function} callback - Callback method to wrap around a restify route handler.
 * @param {Memcached} cache - The memcached instance to use to store and retrieve the request.
 * @param {Object=} options - Options object to modify the default options.
 * @example
 *	server.get(
 *		'/hello/:name', // Route path
 *		restifyRequestCache((req, res, next) => {
 *			res.send(200, req.params.name, {});
 *			next();
 *		}),
 *	);
 * @returns {Function()} - Passed method or restify next method
 */
function restifyRequestCache(callback, cache, options = {}) {
  return async (req, res, next) => {
    const opts = {
      ...defaultOptions,
      ...options,
    };
    /**
		 * Type checking on parameters so we can inform
		 * the user when invalid parameters are given.
		 */
    if (typeof callback !== 'function') {
      throw new Error('The first parameter (callback) must be typeof function.');
    }
    if (cache instanceof Memcached !== true) {
      throw new Error('The second parameter (cache) must be instanceof Memcached.');
    }
    if (typeof options !== 'object') {
      throw new Error('The third parameter (options) must be typeof object.');
    }

    /**
		 * Use the request url object to create
		 * a hash, which we will use as cache key.
		 */
    const requestUrl = url.parse(req.url);
    const urlString = JSON.stringify(requestUrl);
    const key = crypto.createHash(opts.hash.alghorithm)
      .update(urlString, opts.hash.inputEncoding)
      .digest(opts.hash.digestEncoding);

    /**
		 * Get data by key from cache
		 */
    const cached = await new Promise((resolve) => {
      cache.get(key, (err, data) => {
        if (err) {
          exceptionHandler(`An error occurred trying to get request (${key}) from cache`, err);
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
      res.cache('public', { maxAge: opts.ttl });
      const sendArgs = JSON.parse(cached);
      sendArgs[2] = { ...sendArgs[2], 'X-Restify-Request-Cache': 'hit' };
      res.send(...sendArgs);
      return next();
    }

    /**
		 * If we get here, it means the request has not
		 * been cached. Handle the request normally,
		 * but add headers for cache miss.
		 */
    res.noCache();
    res.header('X-Restify-Request-Cache', 'miss');
    await callback(req, res, () => {});

    /**
		 * Restify has responded to the client,
		 * so we cache the result.
		 */
    if (res._sent) {
      const outHeadersKey = Object.getOwnPropertySymbols(res)
        .find(s => s.toString() === 'Symbol(outHeadersKey)');
      const sendArgs = [
        res.statusCode,
        res._body,
        Object.values(res[outHeadersKey]).reduce((headers, [key, value]) => {
          headers[key] = value;
          return headers;
        }, {}),
      ];
      await new Promise((resolve) => {
        cache.add(key, JSON.stringify(sendArgs), opts.ttl, (err) => {
          if (err) {
            exceptionHandler(`An error ocurred trying to add request (${key}) to cache`, err);
          }
          resolve();
        });
      });
    }

    /**
		 * Let restify know we're done.
		 */
    return next();
  };
}

/**
 * Export Memcached and restifyRequestCache
 */
module.exports = {
  Memcached: Memcached,
  restifyRequestCache: restifyRequestCache,
};