const restify = require('restify');

const {
	Memcached,
	restifyRequestCache,
} = require('../lib');

const server = restify.createServer();
const memcached = new Memcached('172.17.0.2:11211', {});

server.get(
	'/hello/:name', // Route path
	restifyRequestCache(async (req, res, next) => {
		res.send(200, req.params.name, {});
		next();
	}, memcached),
);


server.listen(8080, () => {
	// eslint-disable-next-line no-console
	console.log('%s listening at %s', server.name, server.url);
});