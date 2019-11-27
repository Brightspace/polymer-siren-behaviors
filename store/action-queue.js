window.D2L = window.D2L || {};
window.D2L.Siren = window.D2L.Siren || {};

var _numQueuedActions = 0;

window.D2L.Siren.ActionQueue = {
	queueEnd: Promise.resolve(),

	enqueue: function(task) {
		var queuedResolve;
		var promise = new Promise(function(resolve) {
			queuedResolve = resolve;
		});

		_numQueuedActions++;
		this.queueEnd.then(runTask, runTask);
		this.queueEnd = promise;
		promise.finally(function() {
			_numQueuedActions--;
		});
		return promise;

		function runTask() {
			queuedResolve(new Promise(function(resolve) {
				resolve(task());
			}));
		}
	},

	isPending: function() {
		return _numQueuedActions > 0;
	}

};
