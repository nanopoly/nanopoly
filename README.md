# nanopoly (UNDER DEVELOPMENT)

a minimalist polyglot toolkit for building fast, scalable and fault tolerant microservices

The idea behind this project is experimental and it will take time to optimize.
Please do not use in production but testing under heavy load is always welcome.

## Install

You can install nanopoly via npm by following command:

```bash
npm i --save nanopoly
```

You can also clone this repository and make use of it yourself.

```bash
git clone https://github.com/nanopoly/nanopoly.git
cd nanopoly
npm i
npm test
```

Before running tests, please make sure that you have Redis available on localhost.
If you don't know how to do that temporarily, please use following command to run it via docker.

```bash
docker run -p 6379:6379 --name nanopoly_redis redis:4-alpine
```

## Configuration

- **log         :** options for pino's log level. there is also an environment variable called LOG_LEVEL. it's error by default.
- **plugin      :** configuration for transport plugin. please see plugin's repository for more details.
- **prefix      :** prefix to avoid confusion in subscribed channel names

## Methods

### Server Methods

- **.start():** starts server instances for each service
- **.addService(service):** adds a new service to handle related requests
- **.stop():** stops open connections for clean shutdown

### Client Methods

- **.start(services):** starts client instances for each service
- **.send(service, method, data):** sends a new message to be process
- **.stop():** stops open connections for clean shutdown

***If you don't know what you are doing, I wouldn't recommend you to call private methods and change instance variables directly.***

## Examples

```js
const { Client, Server } = require('nanopoly');
const Plugin = require('nanopoly-zeromq'); // or require('nanopoly-nanomsg')
const redis = require('redis');

class Service {
    static _name() {
        return 's';
    }

    static async process(m) {
        return true;
    }
}

const publisher = redis.createClient();
const subscriber = redis.createClient();

const server = server = new Server(Plugin, { log: 'debug' });
server.addService(publisher, subscriber, Service);
server.start();

const client = new Client(Plugin, { log: 'debug' });
client.start(publisher, subscriber, [ 's' ]);
const r = await client.send('s', 'process', Math.random());

client.stop();
server.stop();
```
