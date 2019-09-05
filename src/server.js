'use strict';

const Base = require('../lib/base');
const is = require('is_js');

class Server extends Base {
    constructor(plugin, options) {
        super(plugin, options);
        this._name = this.constructor.name.toLowerCase();
    }

    addService(service) {
        if (is.not.function(service)) throw new Error('service must be a class');

        const name = this._fixServiceName(service);
        const options = Object.assign({}, this._options.plugin || {});
        options.prefix = this._prefix(name);
        this._services[name] = { s: new this._ServerPlugin(options), c: service };
    }

    async _onMessage(m) {
        const { s: service, m: method, id } = m;
        if (is.not.string(service) || is.not.string(method) || is.not.string(id)) throw new Error('invalid message');
        else if (!this._services[service]) throw new Error(`unknown service(${ service })`);
        else if (method.startsWith('_') || is.not.function(this._services[service].c[method]))
            throw new Error(`invalid method(${ method })`);
        else if (this._services[service].c[method].constructor.name !== 'AsyncFunction')
            throw new Error(`invalid method(${ method })`);

        return await this._services[service].c[method](m);
    }

    start() {
        if (is.empty(this._services)) throw new Error('there is no service');

        for (let name in this._services) this._services[name].s.start(async m => this._onMessage(m));
    }

    stop() {
        for (let name in this._services) this._services[name].s.stop();
    }
}

module.exports = Server;
