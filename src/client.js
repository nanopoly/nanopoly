'use strict';

const Base = require('../lib/base');
const is = require('is_js');
const shortid = require('shortid');

class Client extends Base {
    constructor(plugin, options) {
        super(plugin, options);
        this._name = this.constructor.name.toLowerCase();
    }

    _onMessage(m) {
        const { e: err, s: service, d: data, id } = m;
        if (is.not.string(service) || is.not.string(id)) throw new Error('invalid message');
        else if (!this._services[service]) throw new Error(`unknown service(${ service })`);
        else if (!this._services[service].m[id]) throw new Error(`unknown message(${ id }@${ service })`);

        if (err) this._services[service].m[id][1](new Error(err));
        else this._services[service].m[id][0](data);
    }

    start(services) {
        if (is.not.array(services) || is.empty(services)) throw new Error('there is no service');

        for (let name of services) {
            const options = Object.assign({}, this._options.plugin || {});
            options.prefix = this._prefix(name);
            this._services[name] = { s: new this._ClientPlugin(options), m: {} };
            this._services[name].s.start(async m => this._onMessage(m));
        }
    }

    send(service, method, data) {
        return new Promise((resolve, reject) => {
            try {
                if (is.not.string(service) || is.not.string(method) || method.startsWith('_'))
                    throw new Error('invalid service or method');
                else if (!this._services[service]) throw new Error(`unknown service(${ service })`);
                else if (is.empty(this._services[service].s._pair)) throw new Error('no service found');

                const msg = { id: shortid.generate(), d: data, s: service, m: method };
                const instances = Object.keys(this._services[service].s._push);
                const address = instances[Math.floor(Math.random() * instances.length)];
                this._services[service].s.send(address, msg);
                this._services[service].m[ msg.id ] = [ resolve, reject ];
            } catch (e) {
                reject(e);
            }
        });
    }

    stop() {
        for (let name in this._services) this._services[name].s.stop();
    }
}

module.exports = Client;
