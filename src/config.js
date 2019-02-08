module.exports = {
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