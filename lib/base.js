'use strict';

const is = require('is_js');
const pino = require('pino');

/**
 * @description base class for nanopoly
 * @class Base
 */
class Base {
    /**
     *Creates an instance of Server.
     * @param {Object} plugin transport plugin { Client, Server }
     * @param {Object} options
     * @memberof Server
     */
    constructor(plugin, options) {
        if (is.not.object(plugin) || is.not.function(plugin.Client) || is.not.function(plugin.Server))
            throw new Error('transport must be a nanopoly plugin');

        this._ClientPlugin = plugin.Client;
        this._ServerPlugin = plugin.Server;
        this._cmd = { CLEAN_SHUTDOWN: '¿§?' };
        this._options = Object.assign({ log: 'error', prefix: 'np' }, options || {});
        this._logger = pino({ level: this._options.log || process.env.LOG_LEVEL });
        this._services = {};
    }

    /**
     * @description stops open connections for clean shutdown
     * @memberof Base
     */
    stop() {
        for (let name in this._services) this._services[name].s.stop();
    }

    /**
     * @description fixes service name
     * @param {String} service
     * @returns String
     * @memberof Base
     */
    _fixServiceName(service) {
        if (is.function(service) && is.function(service._name)) return service._name();

        return `${ service.name.charAt(0).toLowerCase() }${ service.name.slice(1) }`;
    }

    /**
     * @description manages prefix accordingly
     * @param {String} txt prefix
     * @returns String
     * @memberof Base
     */
    _prefix(txt) {
        if (!this._options.prefix) return txt;
        else return `${ this._options.prefix }-${ txt }`;
    }
}

module.exports = Base;
