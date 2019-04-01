'use strict';

const Client = require('../src/client');
const Redis = require('ioredis');
const Server = require('../src/server');
const ServiceManager = require('../src/service-manager');

class Service {
    static async echo(request, reply){
        reply(request);
    }
}

let client;
describe('health tests', () => {
    afterAll(() => client.shutdown(true));
    beforeAll(() => {
        client = new Client({ redis: new Redis(), logs: 'error', timeout: 3000 });

        const sm = new ServiceManager();
        sm.addService(Service);

        const server = new Server(sm, { redis: new Redis(), logs: 'error', iface: 'wlp58s0' });
        server.start();
    });

    test('service response', async done => {
        setTimeout(() => {
            const msg = { n: `#${ Math.floor(Math.random() * 1000) }` };
            client.send('service.echo', msg, async (r) => {
                expect(msg.n).toEqual(r.n);
                done();
            });
        }, 120);
    });
});
