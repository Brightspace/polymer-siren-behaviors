/* global suite, test, expect, setup, teardown, sinon */

'use strict';

function async(duration) {
	return new Promise(function(resolve) {
		setTimeout(resolve, duration);
	});
}

suite('action-queue', function() {

	var sandbox;

	setup(function() {
		sandbox = sinon.sandbox.create();
	});

	teardown(function() {
		sandbox.restore();
	});

	suite('smoke test', function() {

		test('basic enqueue', function(done) {
			window.D2L.Siren.ActionQueue.enqueue(function() {
				return async().then(function() {
					return 'yay!';
				});
			}).then(function(result) {
				expect(result).to.equal('yay!');
				done();
			});
		});

		test('chained enqueue', function(done) {
			var counter = '';
			window.D2L.Siren.ActionQueue.enqueue(function() {
				return async().then(function() {
					counter += 'Apple';
				});
			});

			window.D2L.Siren.ActionQueue.enqueue(function() {
				return new Promise(function(resolve) {
					counter += '_Banana';
					resolve();
				});
			}).then(function() {
				expect(counter).to.equal('Apple_Banana');
				done();
			});
		});

		test('rejections do not break the chain', function(done) {
			window.D2L.Siren.ActionQueue.enqueue(function() {
				return new Promise(function(resolve, reject) {
					reject('Yikes!');
				});
			});

			window.D2L.Siren.ActionQueue.enqueue(function() {
				return new Promise(function(resolve) {
					resolve('Still good here');
				});
			}).then(function(result) {
				expect(result).to.equal('Still good here');
				done();
			});
		});

		test('async errors do not break the chain', function(done) {
			window.D2L.Siren.ActionQueue.enqueue(function() {
				return async().then(function() {
					throw new Error('Yikes');
				});
			});

			window.D2L.Siren.ActionQueue.enqueue(function() {
				return new Promise(function(resolve) {
					resolve('Still good here');
				});
			}).then(function(result) {
				expect(result).to.equal('Still good here');
				done();
			});
		});

		test('sync errors thrown by tasks do not break the chain and are executed only once', function(done) {

			var stub = sinon.stub();
			stub.throws();
			window.D2L.Siren.ActionQueue.enqueue(stub);

			window.D2L.Siren.ActionQueue.enqueue(function() {
				return new Promise(function(resolve) {
					resolve('Still good here');
				});
			}).then(function(result) {
				expect(result).to.equal('Still good here');
				expect(stub.callCount).to.equal(1);
				done();
			});

		});

		test('accepts non-promise synchronous tasks', function() {
			return window.D2L.Siren.ActionQueue
				.enqueue(function() {
					return 'cats';
				})
				.then(function(result) {
					expect(result).to.equal('cats');
				});
		});
	});
});
