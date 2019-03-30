'use strict';

const is = require('is_js');
const pino = require('pino');

const { NanopolyError, ServiceError } = require('./errors');

/**
 * @description Base class for common methods and implementations
 * @class Base
 */
class Base {
    /**
     * Creates an instance of Base.
     * @param {object} options  options
     * @memberof Base
     */
    constructor(options) {
        this.cmd = { CLEAN_SHUTDOWN: '#CS#' };
        this.options = {
            delimiter: '.',
            iface: 'eth0',
            interval: 3000,
            logs: 'info',
            name: 'nanopoly',
            port: 8000
        };
        if (is.object(options) && is.not.array(options))
            this.options = Object.assign(this.options, options);

        this.logger = pino({ level: this.options.logs });
        if (is.string(this.options.group)) this.options.group = this.options.group.split(' ');
        else if (!this.options.group) this.options.group = [ this.options.name || 'nanopoly' ];
        if (is.not.object(this.options.redis) || is.not.function(this.options.redis.publish))
            throw new NanopolyError('redis must be an instance of a redis client');
    }

    /**
     * @description returns service name
     * @param {function} service    service class
     * @returns {string}
     * @memberof Base
     */
    static __fixServiceName(service) {
        if (is.not.function(service)) throw new ServiceError(service);

        if (service.hasOwnProperty('_name') && is.function(service._name))
            return service._name();
        return `${ service.name.charAt(0).toLowerCase() }${ service.name.slice(1) }`;
    }
}

module.exports = Base;
