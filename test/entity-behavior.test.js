import './entity-behavior-test-component.js';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';

describe('entity-behavior', () => {
	let element, sandbox;

	beforeEach(async() => {
		sandbox = sinon.createSandbox();
		element = await fixture(html`<entity-behavior-test-component></entity-behavior-test-component>`);
		window.D2L.Siren.WhitelistBehavior._testMode(true);

		await new Promise(resolve => {
			function waitForLoad(e) {
				if (e.detail.entity.getLinkByRel('self').href === 'test/static-data/199.json') {
					element.removeEventListener('d2l-siren-entity-changed', waitForLoad);
					resolve();
				}
			}

			element.addEventListener('d2l-siren-entity-changed', waitForLoad);
			element.href = 'test/static-data/199.json';
			element.token = 'foozleberries';
		});
	});

	afterEach(() => {
		window.D2L.Siren.WhitelistBehavior._testMode(false);
		sandbox.restore();
	});

	describe('smoke test', () => {
		it('can be instantiated', () => {
			expect(element.is).to.equal('entity-behavior-test-component');
		});

		it('entity is set to static data', () => {
			expect(element.entity.entities[0].class).to.deep.equal(['richtext', 'description']);
		});
	});

	describe('href changed', () => {
		it('entity is set to new static data', (done) => {
			const oldEntity = element.entity;
			function waitForLoad(e) {
				if (e.detail.entity.getLinkByRel('self').href === 'test/static-data/200.json') {
					element.removeEventListener('d2l-siren-entity-changed', waitForLoad);
					expect(element.entity).to.not.deep.equal(oldEntity);
					done();
				}
			}
			element.addEventListener('d2l-siren-entity-changed', waitForLoad);
			element.href = 'test/static-data/200.json';
		});
	});

	describe('token changed', () => {
		it('entity is refetched', (done) => {
			const oldEntity = element.entity;
			function waitForLoad(e) {
				if (e.detail.entity.getLinkByRel('self').href === 'test/static-data/199.json') {
					element.removeEventListener('d2l-siren-entity-changed', waitForLoad);
					expect(element.entity).to.deep.equal(oldEntity);
					expect(element.entity).to.not.equal(oldEntity);
					done();
				}
			}
			element.addEventListener('d2l-siren-entity-changed', waitForLoad);
			element.token = 'foozleberries*foozleberries';
		});

		it('old listeners removed as details change', () => {
			window.D2L.Siren.EntityStore.clear();
			element.removeListener = null;

			const add = sandbox.spy(window.D2L.Siren.EntityStore, 'addListener');
			const remove = sandbox.spy(window.D2L.Siren.EntityStore, '_removeListenerWithResolvedToken');

			const tokenPayload = btoa(JSON.stringify({ sub: 123 }));

			element.token = `a.${tokenPayload}.a`;
			element.token = `a.${tokenPayload}.b`;
			element.token = `a.${tokenPayload}.c`;

			return window.D2L.Siren.EntityStore
				.fetch(element.href, element.token)
				.then(() => {
					expect(add.callCount).to.equal(3);
					expect(remove.callCount).to.equal(2);
				});
		});

		it('does not continually call removeListener as details change', () => {
			const remove = sandbox.stub();

			element.removeListener = remove;

			element.token = 'a';
			element.token = 'b';
			element.token = 'c';

			expect(remove.callCount).to.equal(1);
		});
	});
});
