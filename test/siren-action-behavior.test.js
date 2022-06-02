import './siren-action-behavior-test-component.js';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';

describe('siren-action-behavior', () => {
	let element, sandbox;

	const testAction =	 { // example from https://github.com/kevinswiber/siren
		'name': 'add-item',
		'title': 'Add Item',
		'method': 'POST',
		'href': 'http://api.x.io/orders/42/items',
		'type': 'application/x-www-form-urlencoded',
		'fields': [
			{ 'name': 'orderNumber', 'type': 'hidden', 'value': '42' },
			{ 'name': 'productCode', 'type': 'text' },
			{ 'name': 'quantity', 'type': 'number' }
		]
	};

	const testAction2 =	 {
		'name': 'delete-item',
		'title': 'Delete Item',
		'method': 'DELETE',
		'href': 'http://api.x.io/orders/42/items/5',
		'type': 'application/x-www-form-urlencoded'
	};

	const testEntity = { // example from https://github.com/kevinswiber/siren
		'class': [ 'order' ],
		'properties': {
			'orderNumber': 42,
			'itemCount': 3,
			'status': 'pending'
		},
		'entities': [
			{
				'class': [ 'items', 'collection' ],
				'rel': [ 'http://x.io/rels/order-items' ],
				'href': 'http://api.x.io/orders/42/items'
			},
			{
				'class': [ 'info', 'customer' ],
				'rel': [ 'http://x.io/rels/customer' ],
				'properties': {
					'customerId': 'pj123',
					'name': 'Peter Joseph'
				},
				'links': [
					{ 'rel': [ 'self' ], 'href': 'http://api.x.io/customers/pj123' }
				]
			}
		],
		'actions': [
			{
				'name': 'add-item',
				'title': 'Add Item',
				'method': 'POST',
				'href': 'http://api.x.io/orders/42/items',
				'type': 'application/x-www-form-urlencoded',
				'fields': [
					{ 'name': 'orderNumber', 'type': 'hidden', 'value': '42' },
					{ 'name': 'productCode', 'type': 'text' },
					{ 'name': 'quantity', 'type': 'number' }
				]
			}
		],
		'links': [
			{ 'rel': [ 'self' ], 'href': 'http://api.x.io/orders/42' },
			{ 'rel': [ 'previous' ], 'href': 'http://api.x.io/orders/41' },
			{ 'rel': [ 'next' ], 'href': 'http://api.x.io/orders/43' }
		]
	};

	beforeEach(async() => {
		sandbox = sinon.createSandbox();
		element = await fixture(html`<siren-action-behavior-test-component></siren-action-behavior-test-component>`);
		element.token = 'foozleberries';
		window.D2L.Siren.WhitelistBehavior._testMode(true);
	});

	afterEach(() => {
		window.D2L.Siren.WhitelistBehavior._testMode(false);
		sandbox.restore();
	});

	describe('smoke test', () => {
		it('can be instantiated', () => {
			expect(element.is).to.equal('siren-action-behavior-test-component');
		});
	});

	describe('send action unit tests', () => {
		beforeEach(() => {
			sinon.stub(window, 'fetch');
			const res = new window.Response(JSON.stringify(testEntity), {
				status: 200,
				headers: {
					'Content-type': 'application/json'
				},
			});

			window.fetch.returns(Promise.resolve(res));
		});

		afterEach(() => {
			window.fetch.restore();
		});

		it('send form-urlencoded', () => {
			const result = element.performSirenAction(testAction);
			result.then(() => {
				sinon.assert.calledOnce(window.fetch);
				const request = window.fetch.getCall(0).args[0];
				expect(request.url).to.equal('http://api.x.io/orders/42/items');
				expect(request.method).to.equal('POST');
			});
			return result;
		});
	});

	describe('enqueue action unit tests', () => {
		let res1, res2;
		let fetchStub;
		beforeEach(() => {
			fetchStub = sinon.stub(window.d2lfetch, 'fetch');
			res1 = new window.Response(JSON.stringify(testEntity), {
				status: 200,
				headers: {
					'Content-type': 'application/json'
				},
			});
			res2 = new window.Response(null, {
				status: 204
			});
		});

		afterEach(() => {
			fetchStub.restore();
		});

		it('enqueues actions', () => {
			fetchStub.withArgs('http://api.x.io/orders/42/items').returns(
				new Promise((resolve) => {
					setTimeout(() => {
						expect(fetchStub.callCount).to.equal(1);
						resolve(res1);
					});
				})
			);
			fetchStub.withArgs('http://api.x.io/orders/42/items/5').returns(
				new Promise((resolve) => {
					resolve(res2);
				})
			);
			const firstCall = element.performSirenAction(testAction);
			element.performSirenAction(testAction2);
			return firstCall;
		});

		it('immediate actions skip queue', () => {
			fetchStub.withArgs('http://api.x.io/orders/42/items').returns(
				new Promise((resolve) => {
					setTimeout(() => {
						resolve(res1);
					});
				})
			);
			fetchStub.withArgs('http://api.x.io/orders/42/items/5').returns(
				new Promise((resolve) => {
					resolve(res2);
				})
			);
			const firstCall = element.performSirenAction(testAction).then(() => {
				expect(fetchStub.callCount).to.equal(2);
			});
			element.performSirenAction(testAction2, null, true);
			return firstCall;
		});
	});
});
