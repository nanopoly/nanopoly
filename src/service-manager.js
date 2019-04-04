'use strict';

const exists = require('fs').existsSync;
const is = require('is_js');
const joinPath = require('path').join;
const readdir = require('fs').readdir;

const Base = require('./base');
const { ServiceError, NanopolyError } = require('./errors');

/**
 * @description This class is responsible for managing multiple services
 * @class ServiceManager
 */
class ServiceManager {
    constructor() {
        this._services = {};
    }

    /**
     * @description adds a new service
     * @param {function} service service class
     * @memberof ServiceManager
     */
    addService(service) {
        if (is.not.function(service)) throw new ServiceError(service);

        const name = Base.__fixServiceName(service);
        if (this._services.hasOwnProperty(name))
            throw new NanopolyError('service already exists');

        this._services[name] = service;
    }

    /**
     * @description adds list of services
     * @param {Array} services list of services
     * @memberof ServiceManager
     */
    addServices(services) {
        if (is.not.array(services)) throw new NanopolyError('you must provide an array of services');

        for (let service of services) this.addService(service);
    }

    /**
     * @description adds all service classes under a folder
     * @param {string} dir path to folder
     * @memberof ServiceManager
     */
    addPath(dir) {
        if (is.not.string(dir)) throw new NanopolyError('you must provide a path to service classes');
        else if (!exists(dir)) throw new NanopolyError('invalid path');

        readdir(dir, (error, files) => {
            if (error) throw error;

            for (let file of files)
                this.addService(require(joinPath(dir, file)));
        });
    }

    /**
     * @description checks if any service exists
     * @returns {boolean}
     * @memberof ServiceManager
     */
    isEmpty() {
        return is.empty(this._services);
    }

    /**
     * @description checks if given service exists
     * @param {string} service service name
     * @returns {boolean}
     * @memberof ServiceManager
     */
    hasService(service) {
        if (is.not.string(service) || is.empty(service)) return false;

        return this._services.hasOwnProperty(service);
    }

    /**
     * @description returns handler function from a service
     * @param {string} service
     * @param {string} method
     * @returns {string}
     * @memberof ServiceManager
     */
    getService(service, method) {
        if (!this.hasService(service)) return undefined;
        else if (is.not.string(method) || is.empty(method) || method.charAt(0) === '_')
            return undefined;

        return this._services[service][method];
    }
}

module.exports = ServiceManager;
