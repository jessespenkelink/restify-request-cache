const restify = require('restify');

const restifyRequestCache = require('../src');

const server = restify.createServer();

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