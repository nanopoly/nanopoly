'use strict';

const Base = require('../lib/base');
const Plugin = require('nanopoly-zeromq');

class Service {
}

class Service2 {
    static _name() {
        return 's';
    }
}

describe('base class tests', () => {
    const base = new Base(Plugin, { log: 'fatal', prefix: 'a' });
    test('ability to overwrite options', async () => {
        expect(base._options.log).toBe('fatal');
    });

    test('invalid service', async () => {
        expect(() => base._fixServiceName('test')).toThrow();
    });

    test('default service name', async () => {
        expect(base._fixServiceName(Service)).toBe('service');
    });

    test('overwritten service name', async () => {
        expect(base._fixServiceName(Service2)).toBe('s');
    });

    test('prefix', () => {
        expect(base._prefix('b')).toBe('a-b');
    });
});
