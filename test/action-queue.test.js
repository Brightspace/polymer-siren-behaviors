import '../store/action-queue.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';

function async(duration) {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
}

describe('action-queue', () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('smoke test', () => {

		it('basic enqueue', (done) => {
			window.D2L.Siren.ActionQueue.enqueue(() => {
				return async().then(() => {
					return 'yay!';
				});
			}).then((result) => {
				expect(result).to.equal('yay!');
				done();
			});
		});

		it('chained enqueue', (done) => {
			let counter = '';
			window.D2L.Siren.ActionQueue.enqueue(() => {
				return async().then(() => {
					counter += 'Apple';
				});
			});

			window.D2L.Siren.ActionQueue.enqueue(() => {
				return new Promise((resolve) => {
					counter += '_Banana';
					resolve();
				});
			}).then(() => {
				expect(counter).to.equal('Apple_Banana');
				done();
			});
		});

		it('rejections do not break the chain', (done) => {
			window.D2L.Siren.ActionQueue.enqueue(() => {
				return new Promise((resolve, reject) => {
					reject('Yikes!');
				});
			});

			window.D2L.Siren.ActionQueue.enqueue(() => {
				return new Promise((resolve) => {
					resolve('Still good here');
				});
			}).then((result) => {
				expect(result).to.equal('Still good here');
				done();
			});
		});

		it('async errors do not break the chain', (done) => {
			window.D2L.Siren.ActionQueue.enqueue(() => {
				return async().then(() => {
					throw new Error('Yikes');
				});
			});

			window.D2L.Siren.ActionQueue.enqueue(() => {
				return new Promise((resolve) => {
					resolve('Still good here');
				});
			}).then((result) => {
				expect(result).to.equal('Still good here');
				done();
			});
		});

		it('sync errors thrown by tasks do not break the chain and are executed only once', (done) => {

			const stub = sinon.stub();
			stub.throws();
			window.D2L.Siren.ActionQueue.enqueue(stub);

			window.D2L.Siren.ActionQueue.enqueue(() => {
				return new Promise((resolve) => {
					resolve('Still good here');
				});
			}).then((result) => {
				expect(result).to.equal('Still good here');
				expect(stub.callCount).to.equal(1);
				done();
			});

		});

		it('accepts non-promise synchronous tasks', () => {
			return window.D2L.Siren.ActionQueue
				.enqueue(() => {
					return 'cats';
				})
				.then((result) => {
					expect(result).to.equal('cats');
				});
		});
	});
});
