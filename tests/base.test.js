'use strict';

const Base = require('../src/base');
const Redis = require('ioredis');

class Service {
    static async echo(request, reply){
        reply(request);
    }
}

class Service2 {
    static _name() {
        return 's';
    }

    static async echo(request, reply){
        reply(request);
    }
}

describe('base class tests', () => {
    const base = new Base({ logs: 'fatal', redis: new Redis() });
    afterAll(() => base.options.redis.disconnect());

    test('ability to overwrite options', async () => {
        expect(base.options.logs).toBe('fatal');
    });

    test('default service name', async () => {
        expect(Base.__fixServiceName(Service)).toBe('service');
    });

    test('overwritten service name', async () => {
        expect(Base.__fixServiceName(Service2)).toBe('s');
    });

    test('blocked service name', async () => {
        expect(Base.__fixServiceName(Service2)).not.toBe('service2');
    });
});
