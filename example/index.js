const restify = require('restify');
const url = require('url');
const Memcached = require('memcached');
const crypto = require('crypto');

const config = {
	opts: {
		ttl: 10, // seconds
	},
	memcached: {
		ip: '172.17.0.2', // server location
		port: '11211',
		opts: {}, // memcached opts
	},
	hash: {
		alghorithm: 'md5',
		inputEncoding: 'utf8',
		digestEncoding: 'hex',
	},
};
config.memcached.location = `${config.memcached.ip}:${config.memcached.port}`;

const memcached = new Memcached(config.memcached.location, config.memcached.opts);

const server = restify.createServer();

/**
 * Error handler
 * @param {Error} err 
 */
const handleError = (err) => {
	console.warn(err);
	return;
};

/**
 * Caching wrapper for restify route method
 * @param {Function} callback 
 */
const restifyRequestCache = callback => async (req, res, next) => {
	const uri = url.parse(req.url);
	const uriString = JSON.stringify(uri);
	const hash = crypto.createHash(config.hash.alghorithm)
		.update(uriString, config.hash.inputEncoding)
		.digest(config.hash.digestEncoding);
	
	// Attempt to fetch data from cache
	const cached = await new Promise((resolve, reject) => {
		memcached.get(hash, (err, data) => {
			if (err) {
				reject(handleError(err));
				return;
			}
			resolve(data);
		});
	});
	// Cache hit
	if (cached) {
		res.send(JSON.parse(cached));
		console.log('Cache hit!', cached);
		return next();
	}
	// Cache miss
	console.log('Cache miss!');
	// Cache data
	callback(req, {
		...res,
		send: (data) => {
			memcached.add(hash, JSON.stringify(data + '-cached'), config.opts.ttl, (err) => {
				if (err) {
					handleError(err);
				}
			});
			res.send(data);
		},
	}, next);
};


server.get(
	'/hello/:name', // Route path
	restifyRequestCache((req, res, next) => {
		res.send(req.params.name);
		next();
	}),
);


server.listen(8080, () => {
	console.log('%s listening at %s', server.name, server.url);
});