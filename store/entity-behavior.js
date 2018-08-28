import { connectToRedux } from './redux-connector.js';
import { fetchEntityIfNeeded } from './redux-entity-fetch.js';
import { EntityStore } from './redux-entity-store.js';

/*
	A component mixin for HM entity with support for callback for updates
	- registers for store updates when attached to DOM
	- assumes one entity per component (maybe valid assumption)
	@summary A component mixin for HM entity with support for callback for updates
    @polymerBehavior D2L.PolymerBehaviors.Siren.EntityBehavior
*/
export const EntityBehavior = {
	properties: {
		/**
		 * URI to fetch the entity from
		 */
		href: {
			type: String,
			reflectToAttribute: true
		},
		/**
		 * Bearer Auth token to attach to entity request
		 */
		token: String,
		/**
		 * The fetched siren entity
		 */
		entity: {
			type: Object,
			value: null,
			notify: true,
			observer: '_onEntityChanged',
		},
		/**
		 * True if entity is loaded. False if not loaded or loading
		 */
		loaded: {
			type: Boolean,
			value: false
		},
		loading: {
			type: Boolean,
			value: true
		},
		fetched: {
			type: Boolean,
			value: false
		},
		error: {
			type: Boolean,
			value: false
		}
	},

	observers: [
		'_fetchEntity(href, token)'
	],

	ready: function() {
		connectToRedux(this);
	},

	_stateReceiver: function(state) {
		const entitiesByToken = state.entitiesByHref[this.href];
		const entity = entitiesByToken && entitiesByToken[this.token];
		if (entity && !entity.isFetching) {
			this._entityChanged(entity.entity);
		}
	},

	_fetchEntity: function(href, token) {
		if (!href || typeof token !== 'string') {
			return;
		}
		this.error = false;
		this.loaded = false;
		this.loading = true;
		this.fetched = false;
		EntityStore.dispatch(fetchEntityIfNeeded(href, token))
			.then(() => this._stateReceiver(EntityStore.getState()))
			.catch(error => {
				console.error(error); // eslint-disable-line no-console
				this.error = true;
				this.fire('d2l-siren-entity-error', { error: error });
			});
	},

	/**
	 * Sets the `entity` property when Redux store updates. Can be overriden (to add special formatting)
	 */
	_entityChanged: function(entity) {
		if (entity === this._rawEntity) {
			return;
		}
		this._rawEntity = entity;
		this.entity = window.D2L.Hypermedia.Siren.Parse(entity);
		this.error = false;
		this.loaded = true;
		this.loading = false;
		this.fetched = true;

		this.fire('d2l-siren-entity-changed', { entity: this.entity });
	},

	_onEntityChanged: function(/*entity, oldEntity*/) {
		// default empty implementation
	},

	_getSelfLink: function(entity) {
		if (entity) {
			return entity.href || (entity.hasLinkByRel('self') ? entity.getLinkByRel('self').href : '');
		}
		return '';
	}
};
