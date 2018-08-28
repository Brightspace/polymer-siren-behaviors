/* global suite, test, fixture, expect, setup, teardown, sinon */

'use strict';

suite('siren-action-behavior', function() {
	var element, sandbox;

	var testAction = 	{ // example from https://github.com/kevinswiber/siren
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

	var testEntity = { // example from https://github.com/kevinswiber/siren
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

	setup(function() {
		sandbox = sinon.sandbox.create();
		element = fixture('basic');
		element.token = 'foozleberries';
	});

	teardown(function() {
		sandbox.restore();
	});

	suite('smoke test', function() {
		test('can be instantiated', function() {
			expect(element.is).to.equal('siren-action-behavior-test-component');
		});
	});

	suite('send action unit tests', function() {
		setup(function() {
			sinon.stub(window, 'fetch');
			var res = new window.Response(JSON.stringify(testEntity), {
				status: 200,
				headers: {
					'Content-type': 'application/json'
				},
			});

			window.fetch.returns(Promise.resolve(res));
		});

		teardown(function() {
			window.fetch.restore();
		});

		test('send form-urlencoded', function() {
			var result = element.performSirenAction(testAction);
			result.then(function() {
				sinon.assert.calledOnce(window.fetch);
				var request = window.fetch.getCall(0).args[0];
				expect(request.url).to.equal('http://api.x.io/orders/42/items');
				expect(request.method).to.equal('POST');
			});
			return result;
		});
	});
});
