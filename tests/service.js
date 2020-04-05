'use strict';

class Service {
    static _name() {
        return 's';
    }

    static _delay() {
        return new Promise((resolve) => setTimeout(resolve, 3000));
    }

    static async echo(m) {
        return m.d;
    }

    static async throws() {
        throw new Error('test');
    }

    static async long() {
        await this._delay();
        return true;
    }
}

module.exports = Service;
