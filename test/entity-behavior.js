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

		test('old listeners removed as details change', function(done) {
			var remove = sandbox.stub();
			var add = sandbox.stub(window.D2L.Siren.EntityStore, 'addListener', function() {
				if (add.callCount === 3) {
					// put ourselves into the task queue so our checks hppaen
					// "later". Whether this works will depend on task setup in
					// the actually code
					Promise
						.resolve()
						.then(function() {
							expect(remove.callCount).to.equal(2);
						})
						.then(done, done);
				}

				return Promise.resolve(remove);
			});

			element.token = 'a';
			element.token = 'b';
			element.token = 'c';
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
