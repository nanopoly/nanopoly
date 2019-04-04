'use strict';

class NanopolyError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class EventHandlerError extends NanopolyError {
    constructor(event, fn) {
        super(`invalid event(${ event }) handler : ${ typeof fn }`);
        this.data = { event, fn };
    }
}

class SocketTypeError extends NanopolyError {
    constructor(type) {
        super(`invalid socket type : ${ type }`);
        this.data = { type };
    }
}

class ServiceError extends NanopolyError {
    constructor(service) {
        super(`service must be a class instead of ${ typeof service }`);
        this.data = { service };
    }
}

module.exports = {
    EventHandlerError,
    NanopolyError,
    ServiceError,
    SocketTypeError
};
