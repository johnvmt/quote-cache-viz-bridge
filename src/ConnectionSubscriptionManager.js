import NestedMap from "./NestedMap";
import CacheItemSubscriptionController from "./CacheItemSubscriptionController";

class ConnectionSubscriptionManager {
	constructor(client, {defaultCollectionID = null}) {
		this._client = client;
		this._defaultCollectionID = defaultCollectionID;

		this._subscriptions = new NestedMap(); // collectionID, [item/hash], itemID, [fieldID]
	}

	has(subscriptionParams) {
		return this._subscriptions.has(this.subscriptionPath(subscriptionParams));
	}

	subscription(subscriptionParams) {
		const sanitizedSubscriptionParams = this.sanitizedSubscriptionParams(subscriptionParams);

		if(!this.has(sanitizedSubscriptionParams)) {
			const cacheItemSubscriptionController = new CacheItemSubscriptionController(this._client, sanitizedSubscriptionParams, {debug: true});
			const subscriptionPath = this.subscriptionPath(sanitizedSubscriptionParams);
			this._subscriptions.set(subscriptionPath, cacheItemSubscriptionController);
		}

		return this._subscriptions.get(this.subscriptionPath(sanitizedSubscriptionParams));
	}

	sanitizedSubscriptionParams(subscriptionParams) {
		const sanitizedSubscriptionParams = Object.assign({
			collectionID: this._defaultCollectionID
		}, subscriptionParams);

		if(!sanitizedSubscriptionParams.hasOwnProperty('collectionID') || sanitizedSubscriptionParams.collectionID === null)
			throw new Error(`Missing collectionID`);
		else if(!sanitizedSubscriptionParams.hasOwnProperty('itemID') || sanitizedSubscriptionParams.itemID === null)
			throw new Error(`Missing itemID`);

		return sanitizedSubscriptionParams;
	}

	subscriptionPath(subscriptionParams) {
		const sanitizedSubscriptionParams = this.sanitizedSubscriptionParams(subscriptionParams);

		return (sanitizedSubscriptionParams.hasOwnProperty('fieldID') && sanitizedSubscriptionParams.fieldID !== null)
			? [sanitizedSubscriptionParams.collectionID, 'hash', sanitizedSubscriptionParams.itemID, sanitizedSubscriptionParams.fieldID]
			: [sanitizedSubscriptionParams.collectionID, 'item', sanitizedSubscriptionParams.itemID]
	}
}

export default ConnectionSubscriptionManager;