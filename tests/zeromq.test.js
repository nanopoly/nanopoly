'use strict';

const { Client, Server } = require('..');
const Plugin = require('nanopoly-zeromq');
const redis = require('redis-mock');

let client,
    server,
    data = Date.now();
const publisher = redis.createClient();
const subscriber = redis.createClient();

describe('zeromq health tests', () => {
    beforeAll(async (done) => {
        server = new Server(Plugin, { log: 'debug', prefix: 'zmq' });
        server.addService(publisher, subscriber, require('./service'));
        server.start();
        setTimeout(() => {
            client = new Client(Plugin, { log: 'debug', prefix: 'zmq' });
            client.start(publisher, subscriber, ['s']);
            setTimeout(done, 500);
        }, 500);
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
