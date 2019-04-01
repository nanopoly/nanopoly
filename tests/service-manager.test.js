'use strict';

const ServiceManager = require('../src/service-manager');

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

describe('service manager tests', () => {
    const sm = new ServiceManager();
    beforeAll(() => sm.addServices([ Service, Service2 ]));

    test('service availability', async () => {
        expect(sm.isEmpty()).not.toBe(true);
    });

    test('service access by regular name', async () => {
        expect(sm.hasService('service')).toBe(true);
    });

    test('service access by overwritten name', async () => {
        expect(sm.hasService('s')).toBe(true);
    });

    test('service access blocked by overwritten name', async () => {
        expect(sm.hasService('service2')).not.toBe(true);
    });

    test('trying to overload service', async () => {
        expect(() => sm.addService(Service)).toThrow();
    });
});
