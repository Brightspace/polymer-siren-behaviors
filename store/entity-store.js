import 'd2l-fetch/d2l-fetch.js';
import SirenParse from 'siren-parser';

function noop() {}

window.D2L = window.D2L || {};
window.D2L.Siren = window.D2L.Siren || {};

function checkResponse(response) {
	if (!response.ok) {
		return Promise.reject(response.status);
	}

	return response;
}

function getResponseJson(response) {
	return response.json();
}

window.D2L.Siren.EntityStore = {
	_store: new Map(),

	_listeners: new Map(),

	_invalidationListeners: new Set(),

	_initContainer: function(map, entityId, cacheKey, init) {
		const lowerCaseCacheKey = cacheKey.toLowerCase();
		const lowerCaseEntityId = entityId.toLowerCase();

		if (!map.has(lowerCaseCacheKey)) {
			map.set(lowerCaseCacheKey, new Map());
		}
		const entityMap = map.get(lowerCaseCacheKey);
		if (init && !entityMap.has(lowerCaseEntityId)) {
			entityMap.set(lowerCaseEntityId, init);
		}
		return entityMap.get(lowerCaseEntityId);
	},

	addListener: function(entityId, token, listener) {
		return this._getToken(token).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const tokenValue = resolved.tokenValue;

			if (!entityId || (typeof cacheKey !== 'string' && typeof listener !== 'function')) {
				return;
			}

			const registrations = this._initContainer(this._listeners, entityId, cacheKey, new Map());
			if (!registrations.has(listener)) {
				registrations.set(listener, new Set());
			}
			registrations.get(listener).add(tokenValue);

			return (function() {
				this.removeListener(entityId, resolved, listener);
			}).bind(this);
		}.bind(this));
	},

	addInvalidationListener: function(listener) {
		this._invalidationListeners.add(listener);
	},

	removeInvalidationListener: function(listener) {
		this._invalidationListeners.delete(listener);
	},

	_getToken: function(token) {
		const tokenPromise = (typeof (token) === 'function')
			? token()
			: Promise.resolve(token);

		return tokenPromise.then(function(tokenValue) {
			if (!tokenValue) {
				return {
					cacheKey: '',
					tokenValue: ''
				};
			}

			// Avoid parse work if we've already done it
			if (typeof tokenValue === 'object' && tokenValue.hasOwnProperty('cacheKey')
				&& tokenValue.hasOwnProperty('tokenValue')) {
				return tokenValue;
			}

			const tokenParts = tokenValue.split('.');

			if (tokenParts.length < 3) {
				return {
					cacheKey: tokenValue,
					tokenValue: tokenValue
				};
			}

			const decoded = JSON.parse(atob(tokenParts[1]).toString());

			const volatileClaims = ['exp', 'iat', 'jti', 'nbf'];
			const normalizedClaims = Object.keys(decoded)
				.filter(function(val) { return volatileClaims.indexOf(val) === -1; })
				.reduce(function(result, key) {
					result[key] = decoded[key];
					return result;
				}, {});

			const cacheKey = btoa(JSON.stringify(normalizedClaims));

			return {
				cacheKey: cacheKey.toLowerCase(),
				tokenValue: tokenValue
			};
		});
	},
	// This newer version of fetch uses d2l-fetch directly so we can set
	// appropriate headers to bypass caching done by the d2l-fetch middleware chain
	// The intention is to replace the fetch implementation that uses d2l-fetch-siren-entity-behavior with this
	// newer implementation.
	//
	// It is also now returning a promise so that the siren-action-behavior can co-ordinate
	// updating the UI more consistently when dependent entities change as a result of Siren
	// actions.
	fetch: function(entityId, token, bypassCache) {
		if(!entityId) {
			return Promise.reject(new Error('Cannot fetch undefined entityId'));
		}
		return this._getToken(token).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const tokenValue = resolved.tokenValue;

			const lowerCaseEntityId = entityId.toLowerCase();

			const entity = this._initContainer(this._store, entityId, cacheKey);
			if (!entity || bypassCache) {

				const headers = new Headers();
				tokenValue && headers.set('Authorization', 'Bearer ' + tokenValue);

				if (bypassCache) {
					headers.set('pragma', 'no-cache');
					headers.set('cache-control', 'no-cache');
				}

				const request = window.d2lfetch.fetch(entityId, {
					headers: headers
				})
					.then(checkResponse)
					.then(this._handleCachePriming.bind(this, resolved))
					.then(getResponseJson)
					.then(SirenParse)
					.then(function(entity) {
						return this.update(entityId, resolved, entity);
					}.bind(this))
					.then(function(entity) {
						if (bypassCache) {
							this._invalidationListeners.forEach(function(listener) {
								listener(entityId, cacheKey, entity);
							});
						}
						return this._store.get(cacheKey).get(lowerCaseEntityId);
					}.bind(this))
					.catch(function(err) {
						return this
							.setError(entityId, resolved, err).then(function() {
								return this._store.get(cacheKey).get(lowerCaseEntityId);
							}.bind(this));
					}.bind(this));

				this._store.get(cacheKey).set(lowerCaseEntityId, {
					status: 'fetching',
					entity: null,
					request: request
				});

				return request;
			}

			if (entity.request) {
				return entity.request;
			} else {
				this._notify(lowerCaseEntityId, cacheKey, entity.entity);
				return entity;
			}
		}.bind(this));
	},

	get: function(entityId, token) {
		return this._getToken(token).then(function(resolved) {
			const cacheKey = resolved.cacheKey;

			const entity = this._initContainer(this._store, entityId, cacheKey);
			if (entity) {
				return entity.entity;
			} else {
				return null;
			}
		}.bind(this));
	},

	update: function(entityId, token, entity) {
		if(!entityId) {
			return Promise.reject(new Error('Cannot fetch undefined entityId'));
		}
		return this._getToken(token).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const lowerCaseEntityId = entityId.toLowerCase();

			this._initContainer(this._store, lowerCaseEntityId, cacheKey);

			const entities = this.expand(entityId, entity);
			entities.forEach(function(entity) {
				this._store.get(cacheKey).set(entity.key.toLowerCase(), {
					status: '',
					entity: entity.value,
					request: null
				});
			}, this);
			entities.forEach(function(entity) {
				this._notify(entity.key, cacheKey, entity.value);
			}, this);

			return entity;
		}.bind(this));
	},

	expand: function(entityId, entity) {
		const entityIndex = new Set();
		const expandEntities = [];
		const entities = [];
		expandEntities.push(entity);
		entityIndex.add(entityId);
		entities.push({
			key: entityId,
			value: entity
		});

		while (expandEntities.length > 0) {
			const expandEntity = expandEntities.shift();
			(expandEntity.entities || []).forEach(function(entity) {
				expandEntities.push(entity);
			});

			if (!expandEntity.href && expandEntity.hasLinkByRel('self')) {
				const href = expandEntity.getLinkByRel('self').href.toLowerCase();
				if (!entityIndex.has(href)) {
					entityIndex.add(href);
					entities.push({
						key: href,
						value: expandEntity
					});
				}
			}
		}
		return entities;
	},

	setError: function(entityId, token, error) {
		return this._getToken(token).then(function(resolved) {
			const cacheKey = resolved.cacheKey;

			const lowerCaseEntityId = entityId.toLowerCase();

			this._initContainer(this._store, entityId, cacheKey);
			this._store.get(cacheKey).set(lowerCaseEntityId, {
				status: 'error',
				entity: null,
				error: error,
				request: null
			});
			this._notifyError(entityId, cacheKey, error);
			return error;
		}.bind(this));
	},

	removeListener: function(entityId, token, listener) {
		return this._getToken(token).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const tokenValue = resolved.tokenValue;

			if (!entityId || typeof cacheKey !== 'string' || typeof listener !== 'function' || !this._listeners) {
				return;
			}

			const registrations = this._initContainer(this._listeners, entityId, cacheKey, new Map());

			const tokenValues = registrations.get(listener);
			if (!tokenValues) {
				return;
			}

			// try to remove this specific registration, since a listener could be
			// registered with multiple tokens (hopefully temporarily) despite sharing the same
			// cache key (which is an internal detail)
			if (!tokenValues.delete(tokenValue)) {
				// we weren't aware of this particularly tokenValue for this listener, so
				// assuemedly the component called removeListener directly with its latest
				// values instead of the "removeListener" function returned by addListener.
				// component is probably unregistering, so remove the listener entirely
				registrations.delete(listener);
				return;
			}

			// no registrations left for this listener, remove it from the list
			if (tokenValues.size === 0) {
				registrations.delete(listener);
				return;
			}
		}.bind(this));
	},
	_handleCachePriming: function(token, response) {
		var linkHeaderValues = response.headers && response.headers.get('Link');
		if (!linkHeaderValues) {
			return response;
		}

		var cachePrimers = window.D2L.Siren.EntityStore
			.parseLinkHeader(linkHeaderValues)
			.filter(function(link) {
				return link.rel.indexOf('https://api.brightspace.com/rels/cache-primer') !== -1;
			});

		if (cachePrimers.length === 0) {
			return response;
		}

		function returnResponse() {
			return response;
		}

		return Promise
			.all(cachePrimers.map(function(cachePrimer) {
				return this
					.fetch(cachePrimer.href, token, true)
					.then(noop, noop);
			}, this))
			.then(returnResponse, returnResponse);
	},
	_notify: function(entityId, cacheKey, entity) {
		const registrations = this._initContainer(this._listeners, entityId, cacheKey, new Map());
		registrations.forEach(function(_, listener) {
			listener(entity);
		});
	},

	_notifyError: function(entityId, cacheKey, error) {
		const registrations = this._initContainer(this._listeners, entityId, cacheKey, new Map());
		registrations.forEach(function(_, listener) {
			listener(null, error);
		});
	},

	clear: function() {
		this._store = new Map();
		this._listeners = new Map();
		this._invalidationListeners = new Set();
	},

	// parse a Link header
	//
	// Link:<https://example.org/.meta>; rel=meta
	//
	// var r = parseLinkHeader(xhr.getResponseHeader('Link');
	// r['meta'] outputs https://example.org/.meta
	//
	parseLinkHeader: function(links) {
		var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g; // eslint-disable-line no-useless-escape
		var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g; // eslint-disable-line no-useless-escape

		var matches = links.match(linkexp);
		var _links = [];
		for (var i = 0; i < matches.length; i++) {
			var split = matches[i].split('>');
			var href = split[0].substring(1);
			_links.push({
				href: href
			});
			var ps = split[1];
			var s = ps.match(paramexp);
			for (var j = 0; j < s.length; j++) {
				var p = s[j];
				var paramsplit = p.split('=');
				var name = paramsplit[0];
				var val = paramsplit[1].replace(/["']/g, '');
				if (name === 'rel') {
					var relsplit = val.split(' ');
					_links[i][name] = relsplit;
				} else {
					_links[i][name] = val;
				}
			}
		}
		return _links;
	}
};
