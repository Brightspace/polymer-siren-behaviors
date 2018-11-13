/* global suite, test, fixture, expect, setup, teardown, sinon, stubWhitelist */

'use strict';

suite('entity-behavior', function() {

	var element, sandbox;

	setup(function(done) {
		sandbox = sinon.sandbox.create();
		element = fixture('basic');

		function waitForLoad(e) {
			if (e.detail.entity.getLinkByRel('self').href === 'static-data/199.json') {
				element.removeEventListener('d2l-siren-entity-changed', waitForLoad);
				done();
			}
		}
		stubWhitelist();
		element.addEventListener('d2l-siren-entity-changed', waitForLoad);
		element.href = 'static-data/199.json';
		element.token = 'foozleberries';
	});

	teardown(function() {
		sandbox.restore();
	});

	suite('smoke test', function() {

		test('can be instantiated', function() {
			expect(element.is).to.equal('entity-behavior-test-component');
		});

		test('entity is set to static data', function() {
			expect(element.entity).to.have.deep.property('entities[0].class').that.deep.equals(['richtext', 'description']);
		});
	});

	suite('href changed', function() {
		test('entity is set to new static data', function(done) {
			var oldEntity = element.entity;
			function waitForLoad(e) {
				if (e.detail.entity.getLinkByRel('self').href === 'static-data/200.json') {
					element.removeEventListener('d2l-siren-entity-changed', waitForLoad);
					expect(element.entity).to.not.deep.equal(oldEntity);
					done();
				}
			}
			element.addEventListener('d2l-siren-entity-changed', waitForLoad);
			element.href = 'static-data/200.json';
		});
	});

	suite('token changed', function() {
		test('entity is refetched', function(done) {
			var oldEntity = element.entity;
			function waitForLoad(e) {
				if (e.detail.entity.getLinkByRel('self').href === 'static-data/199.json') {
					element.removeEventListener('d2l-siren-entity-changed', waitForLoad);
					expect(element.entity).to.deep.equal(oldEntity);
					expect(element.entity).to.not.equal(oldEntity);
					done();
				}
			}
			element.addEventListener('d2l-siren-entity-changed', waitForLoad);
			element.token = 'foozleberries*foozleberries';
		});

		test('old listeners removed as details change', function() {
			window.D2L.Siren.EntityStore.clear();
			element.removeListener = null;

			var add = sandbox.spy(window.D2L.Siren.EntityStore, 'addListener');
			var remove = sandbox.spy(window.D2L.Siren.EntityStore, 'removeListener');

			var tokenPayload = btoa(JSON.stringify({ sub: 123 }));

			element.token = 'a.' + tokenPayload + '.a';
			element.token = 'a.' + tokenPayload + '.b';
			element.token = 'a.' + tokenPayload + '.c';

			return window.D2L.Siren.EntityStore
				.fetch(element.href, element.token)
				.then(function() {
					expect(add.callCount).to.equal(3);
					expect(remove.callCount).to.equal(2);
				});
		});

		test('does not continually call removeListener as details change', function() {
			var remove = sandbox.stub();

			element.removeListener = remove;

			element.token = 'a';
			element.token = 'b';
			element.token = 'c';

			expect(remove.callCount).to.equal(1);
		});
	});
});
