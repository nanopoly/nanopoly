'use strict';

const cluster = require('cluster');
const Client = require('../src/client');
const is = require('is_js');
const Redis = require('ioredis');
const Server = require('../src/server');
const ServiceManager = require('../src/service-manager');
const test = require('tape').test;

class Service {
    static _name() {
        return 's';
    }

    static echo(request, reply){
        reply(request);
    }
}

const sm = new ServiceManager();
sm.addService(Service);

const server = new Server(sm, { redis: new Redis(), logs: 'fatal', iface: 'wlp58s0', cpu: 2 });
server.start();

if (cluster.isMaster) {
    const client = new Client({ redis: new Redis(), logs: 'fatal' });

    test('service response', assert => {
        setTimeout(() => {
            const msg = { n: `#${ Math.floor(Math.random() * 3000) }` };
            client.send('s.echo', msg, r => {
                if (is.error(r)) assert.fail(r.message);
                else assert.ok(msg.n === r.n, `${ msg.n } should be equal to ${ r.n }`);
                assert.end();
                client.shutdown(true);
            });
        }, 4000);
    });
}
