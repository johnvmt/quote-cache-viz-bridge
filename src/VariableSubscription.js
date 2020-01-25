import EventEmitter from "wolfy87-eventemitter";
import CacheQuoteObjectSubscription from "./CacheQuoteObjectSubscription";

class VariableSubscription extends EventEmitter {
	constructor(subscriptionManager, variableSubscription) {
		super();

		const self = this;

		self._variableSubscription = variableSubscription;

		self.on('data', () => {
			self._lastOutput = new Date();
		});

		this._sort = [];
		if(variableSubscription.hasOwnProperty('sort'))
			this._sort = VariableSubscription.sanitizeSortParams(variableSubscription.sort);

		self._objectSubscriptions = [];
		for(let structureItem of variableSubscription.structure) {

			const objectSubscription = new CacheQuoteObjectSubscription(subscriptionManager, structureItem);

			objectSubscription.on('data', (data) => {
				self.limitEmitData();
			});

			self._objectSubscriptions.push(objectSubscription);
		}
	}

	limitEmitData() {
		const self = this;

		if(self._variableSubscription.hasOwnProperty('debounce') && typeof self._variableSubscription.debounce === 'number') {
			if(!self.hasOwnProperty('_lastOutput') || (new Date() - self._lastOutput) > self._variableSubscription.debounce)
				self.emit('data', self.data);
			else if(!self.hasOwnProperty('_outputTimeout')) {
				self._outputTimeout = setTimeout(() => {
					delete self._outputTimeout;
					self.emit('data', self.data);
				}, self._variableSubscription.debounce)
			}
		}
		else
			self.emit('data', self.data);
	}

	get data() {
		const dataArr = [];
		for(let objectSubscription of this._objectSubscriptions) {
			dataArr.push(objectSubscription.data);
		}

		dataArr.sort(VariableSubscription.sortBy(...this._sort));

		return dataArr;
	}

	static sanitizeSortParams(sortParams) {
		return sortParams.map(sortParam => VariableSubscription.sanitizeSortParam(sortParam))
	}

	static sanitizeSortParam(sortParam) {
		if(typeof sortParam === 'string')
			return {name: sortParam};
		else if(!sortParam.hasOwnProperty('name'))
			throw new Error(`Missing required name in sort Params`);
		else {
			const sanitizedSortParams = {name: sortParam.name};

			if(sortParam.hasOwnProperty('reverse') && sortParam.reverse)
				sanitizedSortParams.reverse = sortParam.reverse;

			if(sortParam.hasOwnProperty('number') && sortParam.number)
				sanitizedSortParams.primer = parseFloat;

			return sanitizedSortParams;
		}
	}

	static sortBy() {
		var fields = [],
			n_fields = arguments.length,
			field, name, reverse, cmp;

		// preprocess sorting options
		for (var i = 0; i < n_fields; i++) {
			field = arguments[i];
			if (typeof field === 'string') {
				name = field;
				cmp = default_cmp;
			}
			else {
				name = field.name;
				cmp = getCmpFunc(field.primer, field.reverse);
			}
			fields.push({
				name: name,
				cmp: cmp
			});
		}

		return function(A, B) {
			var a, b, name, cmp, result;
			for (var i = 0, l = n_fields; i < l; i++) {
				result = 0;
				field = fields[i];
				name = field.name;
				cmp = field.cmp;

				result = cmp(A[name], B[name]);
				if (result !== 0) break;
			}
			return result;
		};

		function default_cmp(a, b) {
			if (a == b) return 0;
			return a < b ? -1 : 1;
		}

		function getCmpFunc(primer, reverse) {
			var cmp = default_cmp;
			if (primer) {
				cmp = function(a, b) {
					return default_cmp(primer(a), primer(b));
				};
			}
			if (reverse) {
				return function(a, b) {
					return -1 * cmp(a, b);
				};
			}
			return cmp;
		}
	}
}

export default VariableSubscription;
