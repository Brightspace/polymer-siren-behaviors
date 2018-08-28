import {EntityStore} from './redux-entity-store.js';

export function connectToRedux(elm) {
	elm._stateReceiver(EntityStore.getState());
	EntityStore.subscribe(() => {
		elm._stateReceiver(EntityStore.getState());
	});
}
