import net from "net";
import EventEmitter from "wolfy87-eventemitter";

class VizTCPDataSocket extends EventEmitter {

	constructor(host, port, timeout) {
		super();
		this._host = host;
		this._port = port;
		this._timeout = timeout;
		this._connected = false;
	}

	connect() {
		const self = this;

		return new Promise((resolve, reject) => {
			self.socket = new net.Socket();

			const connectTimeout = setTimeout(() => {
				if(self.hasOwnProperty('socket')) {
					self.socket.destroy();
					delete self.socket;
				}
			}, self._timeout);

			const errorListener = (error) => {
				reject(error);
			};

			self.socket.once('error', errorListener);

			self.socket.on('connect', () => {
				self._connected = true;
				self.emit('connect');
			});

			self.socket.on('error', (error) => {
				self.emit('error', error);
			});

			self.socket.on('close', (error) => {
				self._connected = false;
				self.emit('close', error);
				delete self.socket;
			});

			self.socket.on('timeout', (error) => {
				self.emit('error', error);
			});

			self.socket.connect(self._port, self._host, () => {
				self.socket.off('error', errorListener);
				clearTimeout(connectTimeout);

				resolve(self.socket);
			});
		});
	}

	get connected() {
		return this._connected;
	}

	async destroy() {
		if(!this.hasOwnProperty('socket'))
			throw new Error(`Socket not connected`);
		else if(!this.socket.destroyed)
			this.socket.destroy();
	}

	write(data) {
		if(!this.hasOwnProperty('socket') || this.socket.destroyed)
			throw new Error(`Socket not connected`);
		this.socket.write(data);
	}
}

export default VizTCPDataSocket;