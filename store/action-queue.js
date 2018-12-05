window.D2L = window.D2L || {};
window.D2L.Siren = window.D2L.Siren || {};

window.D2L.Siren.ActionQueue = {
	queueEnd: Promise.resolve(),

	enqueue: function(task) {
		var queuedResolve;
		var promise = new Promise(function(resolve) {
			queuedResolve = resolve;
		});

		this.queueEnd.then(runTask, runTask);
		this.queueEnd = promise;
		return promise;

		function runTask() {
			queuedResolve(new Promise(function(resolve) {
				resolve(task());
			}));
		}
	}
};
