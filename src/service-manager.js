'use strict';

const exists = require('fs').existsSync;
const is = require('is_js');
const joinPath = require('path').join;
const readdir = require('fs').readdir;

const Base = require('./base');
const { ServiceError, NanopolyError } = require('./errors');

class ServiceManager {
    constructor() {
        this._services = {};
    }

    addService(service) {
        if (is.not.function(service)) throw new ServiceError(service);

        const name = Base.__fixServiceName(service);
        if (this._services.hasOwnProperty(name))
            throw new NanopolyError('service already exists');

        this._services[name] = service;
    }

    addServices(services) {
        if (is.not.array(services)) throw new NanopolyError('you must provide an array of services');

        for (let service of services) this.addService(service);
    }

    addPath(dir) {
        if (is.not.string(dir)) throw new NanopolyError('you must provide a path to service classes');
        else if (!exists(dir)) throw new NanopolyError('invalid path');

        readdir(dir, (error, files) => {
            if (error) throw error;

            for (let file of files)
                this.addService(require(joinPath(dir, file)));
        });
    }

    isEmpty() {
        return is.empty(this._services);
    }

    hasService(service) {
        if (is.not.string(service) || is.empty(service)) return false;

        return this._services.hasOwnProperty(service);
    }

    getService(service, method) {
        if (!this.hasService(service)) return undefined;
        else if (is.not.string(method) || is.empty(method) || method.charAt(0) === '_')
            return undefined;

        return this._services[service][method];
    }
}

module.exports = ServiceManager;
