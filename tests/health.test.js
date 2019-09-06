'use strict';

const { Client, Server } = require('../');
const Plugin = require('nanopoly-zeromq');

class Service {
    static _name() {
        return 's';
    }

    static _delay() {
        return new Promise(resolve => setTimeout(resolve, 3000));
    }

    static async echo(m) {
        return m.d;
    }

    static async throws() {
        throw new Error('test');
    }

    static async long() {
        await this._delay();
        return true;
    }
}

let client, server, data = Date.now();

describe('communication health tests', () => {
    beforeAll(async done => {
        server = new Server(Plugin, { log: 'debug' });
        server.addService(Service);
        server.start();
        setTimeout(() => {
            client = new Client(Plugin, { log: 'debug' });
            client.start([ 's' ]);
            setTimeout(done, 1000);
        }, 1000);
    });

    afterAll(() => {
        client.stop();
        server.stop();
    });

    test('invalid service', async () => {
        try {
            await client.send('x', 'echo', data);
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeTruthy();
        }
    });

    test('invalid method', async () => {
        try {
            await client.send('s', 'x', data);
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeTruthy();
        }
    });

    test('broken method', async () => {
        try {
            await client.send('s', 'throws', data);
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeTruthy();
        }
    });

    test('request / reply', async () => {
        const r = await client.send('s', 'echo', data);
        expect(r).toBe(data);
    });

    test('no data', async () => {
        const r = await client.send('s', 'echo');
        expect(r).toBe(undefined);
    });

    test('timeout', async () => {
        try {
            await client.send('s', 'long', undefined, 1000);
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeTruthy();
        }
    });
});
