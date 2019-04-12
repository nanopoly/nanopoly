'use strict';

const Redis = require('ioredis');
const Server = require('../src/server');
const ServiceManager = require('../src/service-manager');

class Service {
    static _name() {
        return 's';
    }

    static async echo(request, reply){
        reply(request);
    }
}

const sm = new ServiceManager();
sm.addService(Service);

const server = new Server(sm, { redis: new Redis(), logs: 'error', iface: 'wlp58s0', cpu: 2 });
server.start();
