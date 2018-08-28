import { EntityStore } from './redux-entity-store.js';
import { fetchEntityIfNeeded } from './redux-entity-fetch.js';
import { updateEntity } from './redux-entity-update.js';
import { parseLinkHeader } from './parse-link-header.js';

/*
* Behavior for processing siren actions
* @polymerBehavior
*/
export const SirenActionBehavior = {
	getSirenFields: function(action) {
		var url = new URL(action.href, window.location.origin);
		var fields = [];
		if (action.method === 'GET' || action.method === 'HEAD') {
			for (var param in url.searchParams.entries()) {
				fields.push({name: param[0], value: param[1]});
			}
		// Disable URLSearchParams until they are fully supported (i.e. Edge)
		/*
		} else if (window.URLSearchParams && action.type === 'application/x-www-form-urlencoded') {
			fields = new URLSearchParams();
		*/
		}

		if (action.fields && action.fields.forEach) {
			action.fields.forEach(function(field) {
				if (field.value === undefined) {
					return;
				}
				// if the field is specified multiple times, assume it is intentional
				fields.push({name: field.name, value: field.value});
			});
		}
		return fields;
	},

	getEntityUrl: function(action, fields) {
		if (!action) {
			return null;
		}

		var url = new URL(action.href, window.location.origin);

		fields = fields || this.getSirenFields(action);
		if (action.method === 'GET' || action.method === 'HEAD') {
			var params = this._createURLSearchParams(fields);
			url = new URL(url.pathname + '?' + params.toString(), url.origin);
		}

		return url;
	},

	_createURLSearchParams: function(fields) {
		var sequence = [];
		for (var i = 0; i < fields.length; i++) {
			var field = fields[i];
			sequence.push([field.name, field.value]);
		}
		return new URLSearchParams(sequence);
	},

	_createFormData: function(fields) {
		var formData = new FormData();
		for (var i = 0; i < fields.length; i++) {
			formData.append(fields[i].name, fields[i].value);
		}
		return formData;
	},

	_appendHiddenFields: function(action, fields) {
		if (action.fields && action.fields.forEach) {
			action.fields.forEach(function(field) {
				if (field.type === 'hidden' && field.value !== undefined) {
					fields.push({name: field.name, value:field.value});
				}
			});
		}
		return fields;
	},

	_fetch: function(href, opts) {
		var methodTypes = ['POST', 'PUT', 'DELETE'];
		var sendSaveEvent = methodTypes.indexOf(opts.method) !== -1;
		var self = this;

		if (sendSaveEvent) {
			self.fire('d2l-siren-entity-save-start');
		}
		return window.d2lfetch.fetch(href, opts)
			.then(function(resp) {
				if (sendSaveEvent && resp.ok) {
					self.fire('d2l-siren-entity-save-end');
				}
				return resp;
			})
			.then(function(resp) {
				if (!resp.ok) {
					var errMsg = resp.statusText + ' response executing ' + opts.method + ' on ' + href + '.';
					var error = new Error(errMsg);
					throw error;
				}
				var linkHeader = resp.headers ? resp.headers.get('Link') : null;
				var links;
				if (linkHeader) {
					links = parseLinkHeader(linkHeader);
				}
				if (resp.status === 204) {
					return {
						body: null,
						links: links
					};
				}
				return resp.json().then(function(body) {
					return {
						body: body,
						links: links
					};
				});
			})
			.catch(function(reason) {
				self.fire('d2l-siren-entity-save-error', { error: new Error(reason.message) });
				throw reason;
			});
	},

	performSirenAction: function(action, fields) {
		if (!action) {
			return Promise.reject(new Error('No action given'));
		}
		var headers = new Headers();
		this.token && headers.append('Authorization', 'Bearer ' + this.token);

		var url = this.getEntityUrl(action, fields);
		var body;

		if (fields) {
			fields = this._appendHiddenFields(action, fields);
		} else {
			fields = this.getSirenFields(action);
		}

		if (action.type.indexOf('json') !== -1) {
			var json = {};
			for (var i = 0; i < fields.length; i++) {
				var field = fields[i];
				json[field.name] = field.value;
			}
			headers.set('Content-Type', action.type);
			body = JSON.stringify(json);
		} else if (action.method !== 'GET' && action.method !== 'HEAD') {
			body = this._createFormData(fields);
		}

		var token = this.token;

		return this._fetch(url.href, {
			method: action.method,
			body: body,
			headers: headers
		})
			.then(function(result) {
				var linkRequests = [];
				if (result.links) {
					result.links.forEach(function(link) {
						linkRequests.push(EntityStore.dispatch(fetchEntityIfNeeded(link.href, token, true)));
					});
				}
				var entity = window.D2L.Hypermedia.Siren.Parse(result.body);
				return Promise.all(linkRequests).then(function() {
					return EntityStore.dispatch(updateEntity(url.href, token, entity));
				})
					.then(function() {
						const state = EntityStore.getState();
						const entitiesByToken = state.entitiesByHref[url.href];
						const entity = entitiesByToken && entitiesByToken[token];
						return entity.entity;
					});
			});
	}
};
