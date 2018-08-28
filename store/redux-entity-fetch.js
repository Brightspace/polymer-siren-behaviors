export const REQUEST_ENTITY = 'REQUEST_ENTITY';
export const RECEIVE_ENTITY = 'RECEIVE_ENTITY';
export const ENTITY_ERROR = 'ENTITY_ERROR';

function requestEntity(href, token, bypassCache = false) {
	return {
		type: REQUEST_ENTITY,
		href,
		token,
		bypassCache
	};
}

function receiveEntity(href, token, entity, receivedAt) {
	return {
		type: RECEIVE_ENTITY,
		href,
		token,
		entity,
		receivedAt
	};
}

function entityError(href, token, error, receivedAt) {
	return {
		type: ENTITY_ERROR,
		href,
		token,
		error,
		receivedAt
	};
}

function dispatchSubEntities(dispatch, href, token, entity, date) {
	if (!entity) {
		return;
	}
	if (entity.links) {
		const selfLink = entity.links.find(link => link.rel.includes('self'));
		if (selfLink && selfLink.href && selfLink.href !== href) {
			dispatch(receiveEntity(selfLink.href, token, entity, date));
		}
	}
	if (!entity.entities) {
		return;
	}
	entity.entities.forEach(entity => dispatchSubEntities(dispatch, null, token, entity, token));
}

function fetchEntity(href, token, bypassCache) {
	return (dispatch) => {
		if (!href) {
			return Promise.reject(new Error('Empty href'));
		}
		dispatch(requestEntity(href, token, bypassCache));
		var headers = new Headers();
		headers.set('Authorization', `Bearer ${token}`);

		if (bypassCache) {
			headers.set('pragma', 'no-cache');
			headers.set('cache-control', 'no-cache');
		}

		return window.d2lfetch.fetch(href, {
			method: 'GET',
			headers: headers
		})
			.then((res) => {
				if (!res.ok) {
					return Promise.reject(res.status);
				}
				return res;
			})
			.then((res) => res.json())
			.then((json) => {
				const date = Date.now();
				dispatch(receiveEntity(href, token, json, date));
				dispatchSubEntities(dispatch, href, token, json, date);
			})
			.catch(err => {
				const date = Date.now();
				dispatch(entityError(href, token, err, date));
				console.error(err); // eslint-disable-line no-console
			});
	};
}

function shouldFetchEntity(state, href, token) {
	const entitiesByToken = state.entitiesByHref[href];
	const entity = entitiesByToken && entitiesByToken[token];
	if (!entity) {
		return true;
	} else if (entity.isFetching) {
		return false;
	} else {
		return entity.didInvalidate;
	}
}

export function fetchEntityIfNeeded(href, token, bypassCache) {
	return (dispatch, getState) => {
		if (bypassCache || shouldFetchEntity(getState(), href, token)) {
			// Dispatch a thunk from thunk!
			return dispatch(fetchEntity(href, token, bypassCache));
		} else {
			// Let the calling code know there's nothing to wait for.
			return Promise.resolve();
		}
	};
}
