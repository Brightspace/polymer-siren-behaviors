/* global suite, test, fixture, expect, setup, teardown, sinon */

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
	});
});
