import EventEmitter from "wolfy87-eventemitter";

class CacheQuoteObjectSubscription extends EventEmitter {
	constructor(subscriptionManager, structureItem) {
		super();

		const self = this;
		self._structureItemValues = Object.assign({}, structureItem.attach);

		for(let structureSubscriptionKey in structureItem.subscriptions) {
			if(structureItem.subscriptions.hasOwnProperty(structureSubscriptionKey)) {
				self._structureItemValues[structureSubscriptionKey] = null;
				const structureSubscriptionParams = structureItem.subscriptions[structureSubscriptionKey];
				const subscription = subscriptionManager.subscription(structureSubscriptionParams);

				subscription.on('data', (data) => {
					self._structureItemValues[structureSubscriptionKey] = data;
					self.emit('data', this._structureItemValues);
				});
			}
		}
	}

	get data() {
		return this._structureItemValues;
	}
}

export default CacheQuoteObjectSubscription;
