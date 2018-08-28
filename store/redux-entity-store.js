import './process-env-shim.js';
import { createStore, applyMiddleware, combineReducers } from '../../redux/src/index.js';
import thunkMiddleware from '../../redux-thunk/src/index.js';
//import createLogger from '../../redux-logger/src/index.js';
import { REQUEST_ENTITY, RECEIVE_ENTITY, ENTITY_ERROR } from './redux-entity-fetch.js';
import { UPDATE_ENTITY } from './redux-entity-update.js';
import { CLEAR_STORE } from './redux-clear.js';

const entity = (state = {
	didInvalidate: false,
	isFetching: false,
	entity: null
}, action) => {
	switch (action.type) {
		case REQUEST_ENTITY:
			return Object.assign({}, state, {
				isFetching: true,
				didInvalidate: false
			});
		case RECEIVE_ENTITY:
			return Object.assign({}, state, {
				isFetching: false,
				didInvalidate: false,
				entity: action.entity,
				error: null,
				lastUpdated: action.receivedAt
			});
		case UPDATE_ENTITY:
			return Object.assign({}, state, {
				isFetching: false,
				didInvalidate: false,
				entity: action.entity,
				error: null,
				lastUpdated: action.updatedAt
			});
		case ENTITY_ERROR:
			return Object.assign({}, state, {
				isFetching: false,
				didInvalidate: false,
				entity: null,
				error: action.error,
				lastUpdated: action.updatedAt
			});
		default:
			return state;
	}
};

const entitiesByToken = (state = {}, action) => {
	switch (action.type) {
		case REQUEST_ENTITY:
		case RECEIVE_ENTITY:
		case UPDATE_ENTITY:
		case ENTITY_ERROR:
			return Object.assign({}, state, {
				[action.token]: entity(state[action.token], action)
			});
		default:
			return state;
	}
};

const entitiesByHref = (state = {}, action) => {
	switch (action.type) {
		case REQUEST_ENTITY:
		case RECEIVE_ENTITY:
		case UPDATE_ENTITY:
		case ENTITY_ERROR:
			return Object.assign({}, state, {
				[action.href]: entitiesByToken(state[action.href], action)
			});
		case CLEAR_STORE:
			return {};
		default:
			return state;
	}
};

const rootReducer = combineReducers({
	entitiesByHref
});

export const EntityStore = createStore(rootReducer, applyMiddleware(
	thunkMiddleware/*,
	createLogger()*/
));
