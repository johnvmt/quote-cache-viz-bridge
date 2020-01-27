import VizDataSocket from "./VizDataSocket";

class SubscriptionsVizOutput {

	constructor(cacheQuoteSubscriptions, vizDataSocketConfig, options) {
		const self = this;
		self._cacheQuoteSubscriptions = cacheQuoteSubscriptions;
		self._vizDataSocketConfig = vizDataSocketConfig;
		self._options = options;

		self.dataSocket = new VizDataSocket(vizDataSocketConfig, options);

		cacheQuoteSubscriptions.on('data', (variableName, variableData) => {
			self._sendVariableSafe(variableName, variableData); // will try to send even if disconnected
		});

		self.dataSocket.on('close', () => {
			self.debug(`Disconnected from socket ${self.dataSocket.config.host}:${self.dataSocket.config.port} (${self.dataSocket.config.protocol})`);
		});

		self.dataSocket.on('connect', () => {
			self.debug(`Connected to socket ${self.dataSocket.config.host}:${self.dataSocket.config.port} (${self.dataSocket.config.protocol})`);
			for(let subscriptionValue of self._cacheQuoteSubscriptions.data)
				self._sendVariableSafe(subscriptionValue);
		});
	}

	_sendVariableSafe(variableName, variableData) {
		if(this.dataSocket.connected)
			this.dataSocket.sendVariable(variableName, variableData);
	}

	debug() {
		if(typeof this._options.debug === "function")
			this._options.debug.apply(this, Array.prototype.slice.call(arguments));
		else if(this._options.debug)
			console.log.apply(console, Array.prototype.slice.call(arguments));
	}
}

export default SubscriptionsVizOutput;
