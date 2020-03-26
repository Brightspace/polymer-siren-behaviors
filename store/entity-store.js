import 'd2l-fetch/d2l-fetch.js';
import SirenParse from 'siren-parser';

// import white not used directly is desirable
// to ensure it's in the bundle
import './whitelist-behavior.js';

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

	_initContainer: function(map, entityOrLinkOrHref, cacheKey, init) {
		const lowerCaseCacheKey = cacheKey.toLowerCase();
		const normalizedHref = this._getHref(entityOrLinkOrHref).toLowerCase();

		if (!map.has(lowerCaseCacheKey)) {
			map.set(lowerCaseCacheKey, new Map());
		}
		const entityMap = map.get(lowerCaseCacheKey);
		if (init && !entityMap.has(normalizedHref)) {
			entityMap.set(normalizedHref, init);
		}
		return entityMap.get(normalizedHref);
	},

	_getHref(entityOrLinkOrHref) {
		if (!entityOrLinkOrHref) {
			return;
		}

		if (typeof entityOrLinkOrHref === 'string') {
			return entityOrLinkOrHref;
		}

		if (entityOrLinkOrHref.href) {
			return entityOrLinkOrHref.href;
		}

		if (!entityOrLinkOrHref.hasLinkByRel || !entityOrLinkOrHref.hasLinkByRel('self')) {
			return;
		}

		return entityOrLinkOrHref.getLinkByRel('self').href;
	},

	_authful(entityOrLinkOrHref) {
		if (!entityOrLinkOrHref) {
			return false;
		}

		if (typeof entityOrLinkOrHref === 'string') {
			return true;
		}

		const rel = entityOrLinkOrHref.rel;
		if (!Array.isArray(rel)) {
			return false;
		}

		const nofollow = rel.includes('nofollow');
		return !nofollow;
	},

	addListener: function(entityOrLinkOrHref, token, listener) {
		return this.getToken(token, entityOrLinkOrHref).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const tokenValue = resolved.tokenValue;

			if (!entityOrLinkOrHref || (typeof cacheKey !== 'string' && typeof listener !== 'function')) {
				return;
			}

			const registrations = this._initContainer(this._listeners, entityOrLinkOrHref, cacheKey, new Map());
			if (!registrations.has(listener)) {
				registrations.set(listener, new Set());
			}
			registrations.get(listener).add(tokenValue);

			return (function() {
				this._removeListenerWithResolvedToken(entityOrLinkOrHref, resolved, listener);
			}).bind(this);
		}.bind(this));
	},

	addInvalidationListener: function(listener) {
		this._invalidationListeners.add(listener);
	},

	removeInvalidationListener: function(listener) {
		this._invalidationListeners.delete(listener);
	},

	getToken: function(token, entityOrLinkOrHref) {
		if (!this._authful(entityOrLinkOrHref)) {
			return Promise.resolve({
				cacheKey: '',
				tokenValue: ''
			});
		}

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
	fetch: function(entityOrLinkOrHref, token, bypassCache) {
		if (!entityOrLinkOrHref) {
			return Promise.reject(new Error('Cannot fetch undefined entityId'));
		}

		return this.getToken(token, entityOrLinkOrHref).then(function(resolved) {

			const cacheKey = resolved.cacheKey;
			const tokenValue = resolved.tokenValue;

			const href = this._getHref(entityOrLinkOrHref);
			const normalizedHref = href.toLowerCase();

			const entity = this._initContainer(this._store, normalizedHref, cacheKey);
			if (!entity || bypassCache) {

				const authful = this._authful(entityOrLinkOrHref);

				const headers = new Headers();

				authful && tokenValue && headers.set('Authorization', 'Bearer ' + tokenValue);

				if (bypassCache) {
					headers.set('pragma', 'no-cache');
					headers.set('cache-control', 'no-cache');
				}

				const fetch = authful
					? window.d2lfetch
					: window.d2lfetch.removeTemp('auth');

				const request = fetch.fetch(href, {
					headers: headers
				})
					.then(checkResponse)
					.then(this._handleCachePriming.bind(this, resolved))
					.then(getResponseJson)
					.then(SirenParse)
					.then(function(entity) {
						return this.update(href, resolved, entity);
					}.bind(this))
					.then(function(entity) {
						if (bypassCache) {
							this._invalidationListeners.forEach(function(listener) {
								listener(href, cacheKey, entity);
							});
						}
						return this._store.get(cacheKey).get(normalizedHref);
					}.bind(this))
					.catch(function(err) {
						return this
							.setError(href, resolved, err).then(function() {
								return this._store.get(cacheKey).get(normalizedHref);
							}.bind(this));
					}.bind(this));

				this._store.get(cacheKey).set(normalizedHref, {
					status: 'fetching',
					entity: null,
					request: request
				});

				return request;
			}

			if (entity.request) {
				return entity.request;
			} else {
				this._notify(normalizedHref, cacheKey, entity.entity);
				return entity;
			}
		}.bind(this));
	},

	get: function(entityOrLinkOrHref, token) {
		return this.getToken(token, entityOrLinkOrHref).then(function(resolved) {
			const cacheKey = resolved.cacheKey;

			const entity = this._initContainer(this._store, entityOrLinkOrHref, cacheKey);
			if (entity) {
				return entity.entity;
			} else {
				return null;
			}
		}.bind(this));
	},

	update: function(entityOrLinkOrHref, token, entity) {
		if (!entityOrLinkOrHref) {
			return Promise.reject(new Error('Cannot fetch undefined entityId'));
		}
		return this.getToken(token, entityOrLinkOrHref).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const normalizedHref = this._getHref(entityOrLinkOrHref).toLowerCase();

			this._initContainer(this._store, normalizedHref, cacheKey);

			const entities = this.expand(normalizedHref, entity);
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

	expand: function(entityOrLinkOrHref, entity) {
		const href = this._getHref(entityOrLinkOrHref);

		const entityIndex = new Set();
		const expandEntities = [];
		const entities = [];
		expandEntities.push(entity);
		entityIndex.add(href.toLowerCase());
		entities.push({
			key: href,
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

	remove: function(entityOrLinkOrHref, token) {
		if (!entityOrLinkOrHref) {
			return Promise.reject(new Error('Cannot fetch undefined entityId'));
		}
		return this.getToken(token, entityOrLinkOrHref).then(function(resolved) {
			const cacheKey = resolved.cacheKey;
			const normalizedHref = this._getHref(entityOrLinkOrHref).toLowerCase();
			this._initContainer(this._store, normalizedHref, cacheKey);
			this._store.get(cacheKey).delete(normalizedHref);
			this._notify(normalizedHref, cacheKey, null);
		}.bind(this));
	},

	setError: function(entityOrLinkOrHref, token, error) {
		return this.getToken(token, entityOrLinkOrHref).then(function(resolved) {
			const cacheKey = resolved.cacheKey;

			const normalizedHref = this._getHref(entityOrLinkOrHref).toLowerCase();

			this._initContainer(this._store, normalizedHref, cacheKey);
			this._store.get(cacheKey).set(normalizedHref, {
				status: 'error',
				entity: null,
				error: error,
				request: null
			});
			this._notifyError(normalizedHref, cacheKey, error);
			return error;
		}.bind(this));
	},

	removeListener: function(entityOrLinkOrHref, token, listener) {
		return this.getToken(token, entityOrLinkOrHref).then(function(resolver) {
			return this._removeListenerWithResolvedToken(entityOrLinkOrHref, resolver, listener);
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
	_notify: function(entityOrLinkOrHref, cacheKey, entity) {
		const registrations = this._initContainer(this._listeners, entityOrLinkOrHref, cacheKey, new Map());
		registrations.forEach(function(_, listener) {
			listener(entity);
		});
	},

	_notifyError: function(entityOrLinkOrHref, cacheKey, error) {
		const registrations = this._initContainer(this._listeners, entityOrLinkOrHref, cacheKey, new Map());
		registrations.forEach(function(_, listener) {
			listener(null, error);
		});
	},
	_removeListenerWithResolvedToken: function(entityOrLinkOrHref, resolved, listener) {
		const cacheKey = resolved.cacheKey;
		const tokenValue = resolved.tokenValue;

		if (!entityOrLinkOrHref || typeof cacheKey !== 'string' || typeof listener !== 'function' || !this._listeners) {
			return;
		}

		const registrations = this._initContainer(this._listeners, entityOrLinkOrHref, cacheKey, new Map());

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
