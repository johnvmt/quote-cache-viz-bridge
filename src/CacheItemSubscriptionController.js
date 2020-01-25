import gql from "graphql-tag";
import EventEmitter from "wolfy87-eventemitter";

class CacheItemSubscriptionController extends EventEmitter {
	constructor(gqlClient, subscriptionParams, options) {
		super();
		const self = this;

		self._params = subscriptionParams;
		self._options = CacheItemSubscriptionController.filterObject(options, ['debug']);
		self.debug(`Subscription created with Params: ${JSON.stringify(subscriptionParams)}`);

		// TODO add full item subscription
		if(subscriptionParams.hasOwnProperty('fieldID')) {
			self.gqlSubscription = gqlClient.subscribe({
				query: gql(`subscription onMutation($collectionID: ID!, $itemID: ID!, $fieldID: String!) {
						hashItemField(collectionID: $collectionID, itemID: $itemID, fieldID: $fieldID) {
							mutationType
							field {
								fieldValue
							}
						}
					}`),
				variables: {
					collectionID: subscriptionParams.collectionID,
					itemID: subscriptionParams.itemID,
					fieldID: subscriptionParams.fieldID
				}
			}).subscribe({
				next({data}) {
					try {
						self.data = (data.hashItemField.mutationType === 'DELETE') ? null : data.hashItemField.field.fieldValue;
					}
					catch(error) {
						self.debug(error);
					}
				},
				error(error) {
					console.log("ERR", error);
					self.debug(error);
				}
			});
		}

		self.once('cancel', () => {
			if(self.hasOwnProperty('gqlSubscription')) {
				try {
					self.gqlSubscription.unsubscribe();
				}
				catch(error) {
					self.debug(error);
				}
			}
		});
	}

	cancel() {
		if(this.hasOwnProperty(('_canceled')))
			throw new Error(`Subscription already canceled`);
		else {
			this._canceled = true;
			this.emit('cancel');
		}
	}

	get canceled() {
		return(this.hasOwnProperty('_canceled') && this._canceled);
	}

	get subscriptionParams() {
		return this._params;
	}

	set data(data) {
		if(!this.hasOwnProperty('_data') || this._data !== data) {
			this._data = data;
			this.emit('data', data);
		}
	}

	get data() {
		if(this.hasOwnProperty('_data'))
			return this._data;
		return undefined;
	}

	static subscriptionAllowedParams() {
		return ['collectionID', 'itemID', 'fieldID'];
	}

	static subscriptionPathParts(subscriptionParams) {
		// server, collectionID, itemID, [fieldID]
		return CacheItemSubscriptionController.subscriptionAllowedParams().map((allowedParam) => {
			return subscriptionParams.hasOwnProperty(allowedParam) ? subscriptionParams[allowedParam] : null;
		});
	}

	static sanitizeSubscriptionParams(subscriptionParams) {
		let subscriptionSanitizedParams = {};
		const subscriptionAllowedParams = CacheItemSubscriptionController.subscriptionAllowedParams();

		for(let subscriptionAllowedParam of subscriptionAllowedParams) {
			subscriptionSanitizedParams[subscriptionAllowedParam] = subscriptionParams.hasOwnProperty(subscriptionAllowedParam) ? subscriptionParams[subscriptionAllowedParam] : null
		}

		if(subscriptionSanitizedParams.itemID === null)
			throw new Error(`itemID not specified`);
		if(subscriptionSanitizedParams.collectionID === null)
			throw new Error(`collectionID not specified`);
		if(subscriptionSanitizedParams.fieldID === null)
			delete subscriptionSanitizedParams.fieldID;

		return subscriptionSanitizedParams;
	}

	debug() {
		if(typeof this._options.debug === 'function')
			this._options.debug.apply(this, Array.prototype.slice.call(arguments));
		else if(this._options.debug)
			console.log.apply(console, Array.prototype.slice.call(arguments));
	}

	static filterObject(object, keys) {
		return keys.map(key => key in object ? {[key]: object[key]} : {})
			.reduce((res, o) => Object.assign(res, o), {});
	}
}

export default CacheItemSubscriptionController;
