'use strict';

const Base = require('../lib/base');
const is = require('is_js');

/**
 * @description nanopoly server class
 * @extends {Base}
 * @class Server
 */
class Server extends Base {
    /**
     *Creates an instance of Server.
     * @param {Object} plugin transport plugin { Client, Server }
     * @param {Object} options
     * @memberof Server
     */
    constructor(plugin, options) {
        super(plugin, options);
        this._name = this.constructor.name.toLowerCase();
    }

    /**
     * @description adds a new service
     * @param {Object} publisher redis client to publish
     * @param {Object} subscriber redis client to subscribe
     * @param {Function} service class with some static methods
     * @memberof Server
     */
    addService(publisher, subscriber, service) {
        if (is.not.function(service))
            throw new Error('service must be a class');

        const name = this._fixServiceName(service);
        const options = Object.assign({}, this._options.plugin || {});
        options.prefix = this._prefix(name);
        this._services[name] = {
            s: new this._ServerPlugin(publisher, subscriber, options),
            c: service,
        };
    }

    /**
     * @description processes received message
     * @param {Object} m message
     * @returns Promise
     * @memberof Server
     */
    async _onMessage(m) {
        const { s: service, m: method, id } = m;
        if (
            is.not.string(service) ||
            is.not.string(method) ||
            is.not.string(id)
        )
            throw new Error('invalid message');
        else if (!this._services[service])
            throw new Error(`unknown service(${service})`);
        else if (
            method.startsWith('_') ||
            is.not.function(this._services[service].c[method])
        )
            throw new Error(`invalid method(${method})`);
        else if (
            this._services[service].c[method].constructor.name !==
            'AsyncFunction'
        )
            throw new Error(`invalid method(${method})`);

        return await this._services[service].c[method](m);
    }

    /**
     * @description starts server instances
     * @memberof Server
     */
    start() {
        if (is.empty(this._services)) throw new Error('there is no service');

        for (let name in this._services)
            this._services[name].s.start(async (m) => this._onMessage(m));
    }
}

module.exports = Server;
