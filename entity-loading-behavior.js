import './store/entity-behavior.js';
import './store/entity-store.js';
// 'use strict';

window.D2L = window.D2L || {};
window.D2L.PolymerBehaviors = window.D2L.PolymerBehaviors || {};
window.D2L.PolymerBehaviors.Siren = window.D2L.PolymerBehaviors.Siren || {};

/*
* @polymerBehavior
*/
D2L.PolymerBehaviors.Siren.EntityLoadingBehaviorImpl = {
	properties: {
		loading: {
			type: Boolean,
			value: true
		},
		error: {
			type: Boolean,
			value: false
		},
		fetched: {
			type: Boolean,
			value: false
		}
	},

	observers: [
		'_updateListeners(href, token)'
	],

	_updateListeners: function(href, token) {
		this.error = false;
		this.loading = true;
		this.fetched = false;
		if (!this._boundUpdateLoadingState) {
			this._boundUpdateLoadingState = this._updateLoadingState.bind(this);
		}
		if (this._oldHref && this._oldToken) {
			window.D2L.Siren.EntityStore.removeListener(this._oldHref, this._oldToken, this._boundUpdateLoadingState);
		}
		this._oldHref = href;
		this._oldToken = token;
		if (typeof href === 'string' && (typeof token === 'string' || typeof token === 'function')) {
			window.D2L.Siren.EntityStore.addListener(href, token, this._boundUpdateLoadingState);
			window.D2L.Siren.EntityStore.fetch(href, token)
				.then(function(entity) {
					this._updateLoadingState(entity);
				}.bind(this))
				.catch(function(error) {
					this._updateLoadingState(null, error);
				}.bind(this));
		}
	},

	attached: function() {
		this._updateListeners(this.href, this.token);
	},

	detached: function() {
		this._updateListeners();
	},

	_updateLoadingState: function(entity, error) {
		if (error) {
			this.error = true;
			this.loading = false;
			this.fetched = false;
		} else if (entity) {
			this.error = false;
			this.loading = false;
			this.fetched = true;
		}
	}
};

/** @polymerBehavior */
D2L.PolymerBehaviors.Siren.EntityLoadingBehavior = [
	D2L.PolymerBehaviors.Siren.EntityBehavior,
	D2L.PolymerBehaviors.Siren.EntityLoadingBehaviorImpl
];
