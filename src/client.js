'use strict';

const Base = require('../lib/base');
const is = require('is_js');
const shortid = require('shortid');

/**
 * @description nanopoly client class
 * @extends {Base}
 * @class Client
 */
class Client extends Base {
    /**
     *Creates an instance of Client.
     * @param {Object} plugin transport plugin { Client, Server }
     * @param {Object} options
     * @memberof Client
     */
    constructor(plugin, options) {
        super(plugin, options);
        this._name = this.constructor.name.toLowerCase();
    }

    /**
     * @description processes received message
     * @param {Object} m message
     * @memberof Client
     */
    _onMessage(m) {
        const { e: err, s: service, d: data, id } = m;
        if (is.not.string(service) || is.not.string(id)) throw new Error('invalid message');
        else if (!this._services[service]) throw new Error(`unknown service(${ service })`);
        else if (!this._services[service].m[id]) throw new Error(`unknown message(${ id }@${ service })`);

        if (err) this._services[service].m[id][1](new Error(err));
        else this._services[service].m[id][0](data);
        if (this._services[service].m[id][2]) clearTimeout(this._services[service].m[id][2]);
        delete this._services[service].m[id];
    }

    /**
     * @description starts client instances
     * @param {Object} publisher redis client to publish
     * @param {Object} subscriber redis client to subscribe
     * @param {Array} services list of services
     * @memberof Client
     */
    start(publisher, subscriber, services) {
        if (is.not.array(services) || is.empty(services)) throw new Error('there is no service');

        for (let name of services) {
            const options = Object.assign({}, this._options.plugin || {});
            options.prefix = this._prefix(name);
            this._services[name] = { s: new this._ClientPlugin(publisher, subscriber, options), m: {} };
            this._services[name].s.start(async m => this._onMessage(m));
        }
    }

    /**
     * @description sends a new message
     * @param {String} service service name
     * @param {String} method method name
     * @param {any} data payload
     * @param {Number} timeout
     * @returns Promise
     * @memberof Client
     */
    send(service, method, data, timeout) {
        return new Promise((resolve, reject) => {
            try {
                if (is.not.string(service) || is.not.string(method) || method.startsWith('_'))
                    throw new Error('invalid service or method');
                else if (!this._services[service]) throw new Error(`unknown service(${ service })`);
                else if (is.empty(this._services[service].s._pair)) throw new Error('no service found');

                const msg = { id: shortid.generate(), d: data, s: service, m: method };
                const instances = Object.keys(this._services[service].s._push);
                if (is.empty(instances)) throw new Error(`no pair found for service(${ service })`);
                const address = instances[Math.floor(Math.random() * instances.length)];
                this._services[service].s.send(address, msg);
                this._services[service].m[ msg.id ] = [ resolve, reject ];
                if (is.not.number(timeout)) timeout = this._options.timeout;
                if (timeout) this._services[service].m[ msg.id ].push(setTimeout(() => {
                    clearTimeout(this._services[service].m[ msg.id ][2]);
                    this._services[service].m[ msg.id ][1](new Error('request timed out'));
                    delete this._services[service].m[ msg.id ];
                }, timeout));
            } catch (e) {
                reject(e);
            }
        });
    }
}

module.exports = Client;
