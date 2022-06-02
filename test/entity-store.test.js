import '../store/entity-store.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';

describe('entity-store', () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		window.D2L.Siren.EntityStore.clear();
		window.D2L.Siren.WhitelistBehavior._testMode(true);
	});

	afterEach(() => {
		window.D2L.Siren.WhitelistBehavior._testMode(false);
		sandbox.restore();
	});

	describe('smoke test', () => {

		describe('can fetch leaf entity using listener', () => {
			async function _test(sirenLinkOrHrefListened, sirenLinkOrHrefFetched) {
				let resolve;
				const wait = new Promise((_resolve) => resolve = _resolve);

				await window.D2L.Siren.EntityStore.addListener(sirenLinkOrHrefListened, '', entity => {
					resolve(Promise.resolve().then(() => {
						const description = entity && entity.getSubEntityByClass('description').properties.html;
						expect(description).to.equal('Proper use of grammar');
					}));
				});

				await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHrefFetched, '');

				await wait;
			}

			it('with string hrefs', () => _test(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));

			it('with siren links', () => _test(
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			it('with string href and siren link', () => _test(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			it('with siren link and string href', () => _test(
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));
		});

		it('can fetch leaf entity using fetched href when self link does not match fetched href', (done) => {
			window.D2L.Siren.EntityStore.addListener(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json?foo=bar',
				'',
				(entity) => {
					const description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json?foo=bar', '');
		});

		it('can fetch leaf entity using self link when self link does not match fetched href', (done) => {
			window.D2L.Siren.EntityStore.addListener(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'',
				(entity) => {
					const description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json?foo=bar', '');
		});

		it('can fetch leaf entity using promise', (done) => {
			const request = window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json', '');
			request.then((entity) => {
				const description = entity && entity.entity.getSubEntityByClass('description').properties.html;
				expect(description).to.equal('Proper use of grammar');
				if (!done.done) {
					done();
					done.done = true;
				}
			});
		});

		describe('get entity returns null if not in store', () => {
			async function _test(sirenLinkOrHref) {
				const entity = await window.D2L.Siren.EntityStore.get(sirenLinkOrHref, '');

				expect(entity).to.be.null;
			}

			it('for string href', () => _test('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json'));
			it('for siren link', () => _test({ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json' }));
		});

		describe('get entity returns entity if in store', () => {
			async function _test(sirenLinkOrHrefA, sirenLinkOrHrefB) {
				await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHrefA, '');

				const entity = await window.D2L.Siren.EntityStore.get(sirenLinkOrHrefB, '');

				expect(entity).to.exist;

				const description = entity.getSubEntityByClass('description').properties.html;
				expect(description).to.equal('Proper use of grammar');
			}

			it('for string hrefs', () => _test(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));

			it('for siren links', () => _test(
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			it('for string href and siren link', () => _test(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			it('for siren link and string href', () => _test(
				{ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));
		});

		describe('nofollow siren links differ from href with token', () => {
			async function _test(sirenLinkOrHrefFetched, sirenLinkOrHrefGetted) {
				const token = 'sometoken';

				const fetched = await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHrefFetched, token);
				expect(fetched).to.exist;

				const getted = await window.D2L.Siren.EntityStore.get(sirenLinkOrHrefGetted, token);
				expect(getted).to.be.null;
			}

			const HREF = 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json';

			it('with string href and siren link', () => _test(HREF, { href: HREF, rel: ['nofollow'] }));
			it('with siren link and string href', () => _test({ href: HREF, rel: ['nofollow'] }, HREF));
		});

		it('fetch with nofollow does not attach auth', async() => {
			sandbox.spy(window.d2lfetch, 'removeTemp');
			sandbox.spy(window.d2lfetch.__proto__, 'fetch');

			const href = 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json';

			await window.D2L.Siren.EntityStore.fetch({
				href,
				rel: ['nofollow'],
			}, 'sometoken');

			sinon.assert.calledWith(window.d2lfetch.removeTemp, 'auth');
			sinon.assert.calledWith(window.d2lfetch.fetch, href, sinon.match({
				headers: sinon.match(headers => {
					return headers.get('Authorization') === null;
				}),
			}));
		});

		it('handles entity error using listener', (done) => {
			window.D2L.Siren.EntityStore.addListener(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json',
				'',
				(entity, error) => {
					expect(entity).to.be.null;
					expect(error).to.equal(404);
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json', '');
		});

		it('handles entity error using promise', () => {
			return window.D2L.Siren.EntityStore
				.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN2.json', '')
				.then((entity) => {
					expect(entity.status).to.equal('error');
					expect(entity.error).to.equal(404);
				});
		});

		it('expands embedded entity children', (done) => {
			window.D2L.Siren.EntityStore.addListener(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'',
				(entity) => {
					const description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623.json', '');
		});

		it('expands embedded entity descendants', (done) => {
			window.D2L.Siren.EntityStore.addListener(
				'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'',
				(entity) => {
					const description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria.json', '');
		});

		it('fetch rejects undefined entityid', async() => {
			try {
				await window.D2L.Siren.EntityStore.fetch();
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		it('fetch rejects undefined href on link', async() => {
			try {
				await window.D2L.Siren.EntityStore.fetch({ rel: ['alternate'] });
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		it('update rejects undefined entityid', async() => {
			try {
				await window.D2L.Siren.EntityStore.update();
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		it('update rejects undefined href on link', async() => {
			try {
				await window.D2L.Siren.EntityStore.update({ rel: ['alternate'] });
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		it('remove rejects undefined entityid', async() => {
			try {
				await window.D2L.Siren.EntityStore.remove();
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		it('remove rejects undefined href on link', async() => {
			try {
				await window.D2L.Siren.EntityStore.remove({ rel: ['alternate'] });
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		describe('remove removes item from Entity Store', () => {
			async function _test(sirenLinkOrHref) {
				await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHref, '');
				expect(await window.D2L.Siren.EntityStore.get(sirenLinkOrHref, '')).not.to.be.null;
				await window.D2L.Siren.EntityStore.remove(sirenLinkOrHref, '');
				expect(await window.D2L.Siren.EntityStore.get(sirenLinkOrHref, '')).to.be.null;
			}

			it('with string href', () => _test('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623.json'));
			it('with siren link', () => _test({ href: 'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623.json' }));
		});

		describe('link header parse', () => {

			it('can parse single link header', () => {
				const links = window.D2L.Siren.EntityStore.parseLinkHeader('<https://example.org/.meta>; rel=meta; title="previous chapter"');
				expect(links[0].href).to.equal('https://example.org/.meta');
				expect(links[0].rel[0]).to.equal('meta');
				expect(links[0].title).to.equal('previous chapter');
			});

			it('can parse multi link header', () => {
				const links = window.D2L.Siren.EntityStore.parseLinkHeader('<https://example.org/.meta>; rel=meta, <https://example.org/related>; rel=related');

				expect(links[0].href).to.equal('https://example.org/.meta');
				expect(links[0].rel[0]).to.equal('meta');

				expect(links[1].href).to.equal('https://example.org/related');
				expect(links[1].rel[[0]]).to.equal('related');
			});

			it('can parse single link header with multi rels', () => {
				const links = window.D2L.Siren.EntityStore.parseLinkHeader('<https://example.org/.meta>; rel="start http://example.net/relation/other"');
				expect(links[0].href).to.equal('https://example.org/.meta');
				expect(links[0].rel[0]).to.equal('start');
				expect(links[0].rel[1]).to.equal('http://example.net/relation/other');
			});
		});

		describe('fetches cache primers', () => {
			let origFetch;
			beforeEach(() => {
				origFetch = window.d2lfetch.fetch;
			});

			it('fetches single cache-primer link', async() => {
				const fetchedEntityLink = 'test/static-data/simple-collection/collection.json';
				const cachePrimedEntityLink = 'test/static-data/simple-collection/items/0.json';

				sandbox.stub(window.d2lfetch, 'fetch').callsFake(async(arg) => {
					if (arg !== fetchedEntityLink) {
						return origFetch.apply(window.d2lfetch, [arg]);
					}

					const response = await origFetch.apply(window.d2lfetch, [arg]);
					const headers = new Headers(response.headers);
					headers.append(
						'Link',
						`<${ cachePrimedEntityLink }>; rel="https://api.brightspace.com/rels/cache-primer"`
					);
					Object.defineProperty(response, 'headers', {
						value: headers,
						writable: false
					});
					return response;
				});

				expect(await window.D2L.Siren.EntityStore.get(fetchedEntityLink, '')).to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink, '')).to.be.null;

				await window.D2L.Siren.EntityStore.fetch(fetchedEntityLink, '');

				expect(await window.D2L.Siren.EntityStore.get(fetchedEntityLink, '')).not.to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink, '')).not.to.be.null;
			});

			it('fetches multiple cache-primer links', async() => {
				const fetchedEntityLink = 'test/static-data/simple-collection/collection.json';
				const cachePrimedEntityLink = 'test/static-data/simple-collection/items/0.json';
				const cachePrimedEntityLink2 = 'test/static-data/simple-collection/items/1.json';

				sandbox.stub(window.d2lfetch, 'fetch').callsFake(async(arg) => {
					if (arg !== fetchedEntityLink) {
						return origFetch.apply(window.d2lfetch, [arg]);
					}

					const response = await origFetch.apply(window.d2lfetch, [arg]);
					const headers = new Headers(response.headers);
					headers.append(
						'Link',
						`<${ cachePrimedEntityLink }>; rel="https://api.brightspace.com/rels/cache-primer"`
					);
					headers.append(
						'Link',
						`<${ cachePrimedEntityLink2 }>; rel="https://api.brightspace.com/rels/cache-primer"`
					);
					Object.defineProperty(response, 'headers', {
						value: headers,
						writable: false
					});
					return response;
				});

				expect(await window.D2L.Siren.EntityStore.get(fetchedEntityLink, '')).to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink, '')).to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink2, '')).to.be.null;

				await window.D2L.Siren.EntityStore.fetch(fetchedEntityLink, '');

				expect(await window.D2L.Siren.EntityStore.get(fetchedEntityLink, '')).not.to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink, '')).not.to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink2, '')).not.to.be.null;
			});

			it('expands fetched cache-primer links', async() => {
				const fetchedEntityLink = 'test/static-data/simple-collection/collection.json';
				const cachePrimedEntityLink = 'test/static-data/simple-collection/items/0.json';
				const cachePrimedEntityLink2 = 'test/static-data/simple-collection/items/1.json';

				sandbox.stub(window.d2lfetch, 'fetch').callsFake(async(arg) => {
					if (arg !== fetchedEntityLink) {
						return origFetch.apply(window.d2lfetch, [arg]);
					}

					const response = await origFetch.apply(window.d2lfetch, [arg]);
					const headers = new Headers(response.headers);
					headers.append(
						'Link',
						'<test/static-data/simple-collection/cache-primer.json>; rel="https://api.brightspace.com/rels/cache-primer"'
					);
					Object.defineProperty(response, 'headers', {
						value: headers,
						writable: false
					});
					return response;
				});

				expect(await window.D2L.Siren.EntityStore.get(fetchedEntityLink, '')).to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink, '')).to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink2, '')).to.be.null;

				await window.D2L.Siren.EntityStore.fetch(fetchedEntityLink, '');

				expect(await window.D2L.Siren.EntityStore.get(fetchedEntityLink, '')).not.to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink, '')).not.to.be.null;
				expect(await window.D2L.Siren.EntityStore.get(cachePrimedEntityLink2, '')).not.to.be.null;
			});
		});

		describe('canonical entity tests', () => {
			let fetch;
			let origFetch;

			afterEach(() => {
				fetch && fetch.restore();
			});

			beforeEach(() => {
				origFetch = window.d2lfetch.fetch;
				fetch = sinon.stub(window.d2lfetch, 'fetch');
			});

			it('can fetch leaf entity that contains query parameters in entity href', (done) => {

				fetch.withArgs('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?foo=bar').returns(
					new Promise((resolve) => {
						origFetch.apply(window.d2lfetch, ['test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json']).then((response) => {
							resolve(response);
						});
					})
				);

				window.D2L.Siren.EntityStore.addListener(
					'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?zinglewaga=zinglezoo',
					'',
					() => {
						throw new Error('unexpected listener called');
					});
				window.D2L.Siren.EntityStore.addListener(
					'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?foo=bar',
					'',
					(entity) => {
						const description = entity && entity.getSubEntityByClass('description').properties.html;
						expect(description).to.equal('Proper use of grammar should allow query parameters');
						done();
					});
				window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?foo=bar', '');
			});

			it('can fetch leaf entity that contains canonical self relation', (done) => {
				fetch.withArgs('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json?foo=bar').returns(
					new Promise((resolve) => {
						origFetch.apply(window.d2lfetch, ['test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json']).then((response) => {
							resolve(response);
						});
					})
				);

				window.D2L.Siren.EntityStore.addListener(
					'test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json',
					'',
					(entity) => {
						const description = entity && entity.getSubEntityByClass('description').properties.html;
						expect(description).to.equal('Proper use of grammar should allow query parameters');
						done();
					});
				window.D2L.Siren.EntityStore.fetch('test/static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json?foo=bar', '');
			});
		});
	});
});
