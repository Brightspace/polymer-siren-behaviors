export const UPDATE_ENTITY = 'UPDATE_ENTITY';

export function updateSingleEntity(href, token, entity) {
	return {
		type: UPDATE_ENTITY,
		href,
		token,
		entity,
		updatedAt: Date.now()
	};
}

function dispatchSubEntities(dispatch, href, token, entity, date) {
	if (!entity) {
		return;
	}
	if (entity.links) {
		const selfLink = entity.links.find(link => link.rel.includes('self'));
		if (selfLink && selfLink.href && selfLink.href !== href) {
			dispatch(updateSingleEntity(selfLink.href, token, entity, date));
		}
	}
	if (!entity.entities) {
		return;
	}
	entity.entities.forEach(entity => dispatchSubEntities(dispatch, null, token, entity, token));
}

export function updateEntity(href, token, entity, date) {
	return (dispatch) => {
		dispatch(updateSingleEntity(href, token, entity, date));
		return dispatchSubEntities(dispatch, href, token, entity, date);
	};
}
