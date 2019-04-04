# nanopoly

a minimalist polyglot toolkit for building fast, scalable and fault tolerant microservices

## Dependencies

Nanopoly has two cross-platform dependencies: ZeroMQ and Redis.
ZeroMQ is the cross-platform transport layer and Redis is for dynamic service registry via publish / subscribe pattern.

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

### Server Configuration

- **delimiter :** delimiter between service and method names.
- **iface :** network interface (eth0 by default) for detecting ip address.
- **interval :** publishing service ports via redis in milliseconds
- **logs :** log level for pico logger
- **port :** start point for port range. If you set server instance looks up for its port starting from this number. It's 8000 by default.
- **redis :** redis client

### Client Configuration

- **delimiter :** delimiter between service and method names.
- **interval :** removing dead sockets in milliseconds
- **logs :** log level for pico logger
- **redis :** redis client

## Methods

### Service Manager Methods

- **addService :** adds a new service class to manager
- **addServices :** adds a list of service classes to manager
- **addPath :** adds all service classes in a folder to manager
- **hasService :** checks if a service available
- **isEmpty :** checks if there is any service
- **getService :** returns request handler from a service

### Server Methods

- **start :** starts server instance and publishes socket information
- **shutdown :** provides graceful shutdown

### Client Methods

- **start :** starts client instance and waits for socket information
- **shutdown :** provides graceful shutdown
