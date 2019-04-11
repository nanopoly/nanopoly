'use strict';

const cluster = require('cluster');
const is = require('is_js');
const localIP = require('local-ip');
const portFinder = require('portfinder');

const Base = require('./base');
const ServiceManager = require('./service-manager');
const ZMQ = require('./zmq');
const { NanopolyError } = require('./errors');

/**
 * @description This class is resposible for managing server socket for multiple services
 * @class Server
 * @extends {Base}
 */
class Server extends Base {
    /**
     *Creates an instance of Server.
     * @param {ServiceManager} serviceManager
     * @param {object} options
     * @memberof Server
     */
    constructor(serviceManager, options) {
        super(options || {});
        if (!(serviceManager instanceof ServiceManager))
            throw new NanopolyError('invalid service manager');

        this.serviceManager = serviceManager;
        this._backend = new ZMQ('dealer');
        this._frontend = new ZMQ('router');
        this._worker = new ZMQ('rep');

        const self = this;
        this._frontend.handle('error', e => this.logger.error(e));
        this._backend.handle('error', e => this.logger.error(e));
        this._frontend.handle(function() {
            const payload = Array.apply(null, arguments);
            self._backend.send(payload);
        });
        this._backend.handle(function() {
            const payload = Array.apply(null, arguments);
            self._frontend.send(payload);
        });
    }

    /**
     * @description
     * @param {function} [cb] callback
     * @memberof Server
     */
    async start(cb) {
        if (is.not.function(cb)) cb = () => {};

        try {
            const startFrom = is.number(this.options.port) ? Math.abs(this.options.port) : undefined;
            if (cluster.isMaster) {
                const port = await portFinder.getPortPromise({ port: startFrom });
                this.options.port = port;
                this._frontend.connect(this.options.port, '0.0.0.0', 'bindSync');

                const port2 = await portFinder.getPortPromise({ port: port });
                this.options.port2 = port2;
                this._backend.connect(this.options.port2, '127.0.0.1', 'bindSync');
                this.__broadcast();

                for (let i = 0; i < this.options.cpu; i++)
                    cluster.fork({ WORKER_PORT: this.options.port2 })
                        .on('exit', () => console.log('exited', process.pid));
            } else if(cluster.isWorker) {
                this._worker.handle('error', e => this.logger.error(e));
                this._worker.handle(this.__onMessage.bind(this));
                this._worker.connect(process.env.WORKER_PORT, '127.0.0.1', 'connect');
            }
        } catch (error) {
            this.logger.error(error);
            cb(error);
        }
    }

    /**
     * @description handles incoming messages
     * @private
     * @param {string} payload message
     * @memberof Server
     */
    __onMessage(payload) {
        let { _: id, d: data, p: path } = this.__parseMessage(payload);
        if (is.string(id) && is.string(path)) {
            path = is.string(path) ? path.split(this.options.delimiter || '.') : [];
            const service = path.shift(), method = path.shift();
            if (!this.serviceManager.hasService(service)) {
                if (service === this.cmd.CLEAN_SHUTDOWN)
                    this.shutdown();
                else this._worker.send({ _: id, s: service, d: 'INVALID_SERVICE' });
            } else {
                const handler = this.serviceManager.getService(service, method);
                if (is.function(handler)) {
                    try {
                        const p = handler(data, r =>
                            this._worker.send({ _: id, s: service, d: r instanceof Error ? r.message : r }));
                        if (p instanceof Promise)
                            p.catch(e => this._worker.send({ _: id, s: service, d: e.message }));
                    } catch (e) {
                        this._worker.send({ _: id, s: service, d: e.message });
                    }
                } else this._worker.send({ _: id, s: service, d: 'INVALID_METHOD' });
            }
        } else  this._worker.send({ _: id, d: 'INVALID_MESSAGE' });
    }

    /**
     * @description builds payload to publish
     * @returns {string}
     * @memberof Server
     */
    __payload() {
        try {
            return JSON.stringify({
                _: this._frontend._id,
                i: localIP(this.options.iface),
                p: this.options.port,
                s: Object.keys(this.serviceManager._services)
            });
        } catch (e) {
            this.logger.error(e);
            return '{}';
        }
    }

    /**
     * @description background task
     * @memberof Server
     */
    __interval() {
        const payload = this.__payload();
        if (this.options.redis.status === 'ready' || is.array(this.options.group))
            for (let group of this.options.group)
                this.options.redis.publish(`up-${ group }`, payload);
    }

    /**
     * @description schedules background job
     * @memberof Server
     */
    __broadcast() {
        this.logger.info(`#${ this.options.port } is up and running`);
        if (this.broadcast) clearInterval(this.broadcast);
        this.__interval();
        this.broadcast = setInterval(this.__interval.bind(this), this.options.interval);
    }

    /**
     * @description provides graceful shutdown
     * @memberof Server
     */
    shutdown() {
        if (cluster.isMaster) {
            const payload = this.__payload();
            this._frontend.disconnect();
            this._backend.disconnect();
            if (this.broadcast) clearInterval(this.broadcast);
            if (is.array(this.options.group))
                for (let group of this.options.group)
                    this.options.redis.publish(`down-${ group }`, payload);
        } else {
            this._worker.disconnect();
        }
        cluster.worker.kill();
        this.options.redis.disconnect();
    }
}

module.exports = Server;
