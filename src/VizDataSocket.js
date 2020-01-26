import EventEmitter from "wolfy87-eventemitter";
import VizTCPDataSocket from "./VizTCPDataSocket";

class VizDataSocket extends EventEmitter {

	constructor(config) {
		super();

		const self = this;

		self.config = {
			commandInterface: (config.hasOwnProperty('commandInterface') && config.commandInterface) || (!config.hasOwnProperty('port')), // Use command interface if commandInterface option is set or if default command port was assigned
			host: config.hasOwnProperty('host') ? config.host : 'localhost',
			port: config.hasOwnProperty('port') ? config.port : 6100, // Viz default port for command interface = 6100
			protocol: (config.hasOwnProperty('protocol') && typeof config.protocol === 'string' && config.protocol.toLowerCase() === 'udp') ? 'udp' : 'tcp',
			timeout: (config.hasOwnProperty('timeout') && typeof config.timeout === 'number' && config.timeout > 0) ? config.timeout : 3000
		};

		if(self.config.protocol === 'tcp')
			self.dataSocket = new VizTCPDataSocket(this.config.host, this.config.port, this.config.timeout);
		else {

		}

		self.dataSocket.on('connect', () => {
			self.emit('connect');
		});

		self.dataSocket.on('error', (error) => {
			self.emit('error', error);
		});

		self.dataSocket.on('close', () => {
			self.emit('close');
			connectAfterTimeout();
		});


		self.dataSocket.connect()
			.catch(error => connectAfterTimeout);

		function connectAfterTimeout() {
			if(!self.hasOwnProperty('_timeout')) {
				self._timeout = setTimeout(() => {
					delete self._timeout;
					self.dataSocket.connect()
						.catch(error => connectAfterTimeout);
				}, self.config.timeout);
			}
		}
	}

	get connected() {
		return this.dataSocket.connected;
	}

	sendVariable(key, value) {
		const formattedValue = VizDataSocket.stringifyObject(value);
		const formattedKey = VizDataSocket.stringifyKey(key, value);

		const commandStr = (this.config.commandInterface) ?
			`send RENDERER*FUNCTION*DataPool*Data SET ${formattedKey}=${formattedValue}\0` :
			`${key}|${formattedValue}\0`;

		// TODO Add try/catch
		this.dataSocket.write(commandStr);
	}

	static stringifyKey(key, value) {
		return Array.isArray(value) ? `${key}[0-${value.length-1}]` : key;
	}

	static stringifyObject(object) {
		if(object === null || object === undefined)
			return "";
		else if(typeof object !== 'object')
			return object;
		else if(Array.isArray(object))
			return `{${object.map(child => VizDataSocket.stringifyObject(child)).join(', ')}},`;
		else {
			let objectPropertyStrings = [];
			for(let childProperty in object) {
				if(object.hasOwnProperty(childProperty)) {
					const childStringValue = VizDataSocket.stringifyObject(object[childProperty]);
					objectPropertyStrings.push(`${childProperty}=${childStringValue};`);
				}
			}
			return `{${objectPropertyStrings.join(' ')}}`
		}
	}
}

export default VizDataSocket;
