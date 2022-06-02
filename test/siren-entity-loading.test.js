import '../siren-entity-loading.js';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';

describe('siren-entity-loading', () => {
	let element, sandbox;

	beforeEach(async() => {
		sandbox = sinon.createSandbox();
		element = await fixture(html`<siren-entity-loading></siren-entity-loading>`);
	});

	afterEach(() => {
		sandbox.restore();
	});

	['loading', 'error', 'fetched'].forEach((state) => {
		describe(state, () => {
			[true, false].forEach((elementEnabled) => {
				it(`should ${elementEnabled ? '' : 'not'} show ${state} content when ${elementEnabled ? '' : 'not'} ${state}`, (done) => {
					if (state !== 'loading') {
						element.loading = false;
					}
					element[state] = elementEnabled;

					setTimeout(() => {
						const div = element.$$(`.${state}`);
						expect(div.classList.contains('show')).to.equal(elementEnabled);
						if (state === 'loading') {
							expect(div.classList.contains('hidden')).to.equal(!elementEnabled);
						}

						done();
					}, 600);
				});
			});
		});
	});
});
