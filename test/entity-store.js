/* global suite, test, expect, setup, teardown, sinon */

'use strict';

suite('entity-store', function() {

	var sandbox;

	setup(function() {
		sandbox = sinon.sandbox.create();
		window.D2L.Siren.EntityStore.clear();
		window.D2L.Siren.WhitelistBehavior._testMode(true);
	});

	teardown(function() {
		window.D2L.Siren.WhitelistBehavior._testMode(false);
		sandbox.restore();
	});

	suite('smoke test', function() {

		suite('can fetch leaf entity using listener', () => {
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

			test('with string hrefs', () => _test(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));

			test('with siren links', () => _test(
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			test('with string href and siren link', () => _test(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			test('with siren link and string href', () => _test(
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));
		});

		test('can fetch leaf entity using fetched href when self link does not match fetched href', function(done) {
			window.D2L.Siren.EntityStore.addListener(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json?foo=bar',
				'',
				function(entity) {
					var description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json?foo=bar', '');
		});

		test('can fetch leaf entity using self link when self link does not match fetched href', function(done) {
			window.D2L.Siren.EntityStore.addListener(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'',
				function(entity) {
					var description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json?foo=bar', '');
		});

		test('can fetch leaf entity using promise', function(done) {
			var request = window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json', '');
			request.then(function(entity) {
				var description = entity && entity.entity.getSubEntityByClass('description').properties.html;
				expect(description).to.equal('Proper use of grammar');
				if (!done.done) {
					done();
					done.done = true;
				}
			});
		});

		suite('get entity returns null if not in store', () => {
			async function _test(sirenLinkOrHref) {
				const entity = await window.D2L.Siren.EntityStore.get(sirenLinkOrHref, '');

				expect(entity).to.be.null;
			}

			test('for string href', () => _test('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json'));
			test('for siren link', () => _test({ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json' }));
		});

		suite('get entity returns entity if in store', () => {
			async function _test(sirenLinkOrHrefA, sirenLinkOrHrefB) {
				await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHrefA, '');

				const entity = await window.D2L.Siren.EntityStore.get(sirenLinkOrHrefB, '');

				expect(entity).to.exist;

				var description = entity.getSubEntityByClass('description').properties.html;
				expect(description).to.equal('Proper use of grammar');
			}

			test('for string hrefs', () => _test(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));

			test('for siren links', () => _test(
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			test('for string href and siren link', () => _test(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
			));

			test('for siren link and string href', () => _test(
				{ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json' },
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
			));
		});

		suite('nofollow siren links differ from href with token', () => {
			async function _test(sirenLinkOrHrefFetched, sirenLinkOrHrefGetted) {
				const token = 'sometoken';

				const fetched = await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHrefFetched, token);
				expect(fetched).to.exist;

				const getted = await window.D2L.Siren.EntityStore.get(sirenLinkOrHrefGetted, token);
				expect(getted).to.be.null;
			}

			const HREF = 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json';

			test('with string href and siren link', () => _test(HREF, { href: HREF, rel: ['nofollow'] }));
			test('with siren link and string href', () => _test({ href: HREF, rel: ['nofollow'] }, HREF));
		});

		test('fetch with nofollow does not attach auth', async() => {
			sandbox.spy(window.d2lfetch, 'removeTemp');
			sandbox.spy(window.d2lfetch.__proto__, 'fetch');

			const href = 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json';

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

		test('handles entity error using listener', function(done) {
			window.D2L.Siren.EntityStore.addListener(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json',
				'',
				function(entity, error) {
					expect(entity).to.be.null;
					expect(error).to.equal(404);
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN1.json', '');
		});

		test('handles entity error using promise', function() {
			return window.D2L.Siren.EntityStore
				.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/UNKNOWN2.json', '')
				.then(function(entity) {
					expect(entity.status).to.equal('error');
					expect(entity.error).to.equal(404);
				});
		});

		test('expands embedded entity children', function(done) {
			window.D2L.Siren.EntityStore.addListener(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'',
				function(entity) {
					var description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623.json', '');
		});

		test('expands embedded entity descendants', function(done) {
			window.D2L.Siren.EntityStore.addListener(
				'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/0.json',
				'',
				function(entity) {
					var description = entity && entity.getSubEntityByClass('description').properties.html;
					expect(description).to.equal('Proper use of grammar');
					if (!done.done) {
						done();
						done.done = true;
					}
				});
			window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria.json', '');
		});

		test('fetch rejects undefined entityid', async() => {
			try {
				await window.D2L.Siren.EntityStore.fetch();
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		test('fetch rejects undefined href on link', async() => {
			try {
				await window.D2L.Siren.EntityStore.fetch({ rel: ['alternate'] });
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		test('update rejects undefined entityid', async() => {
			try {
				await window.D2L.Siren.EntityStore.update();
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		test('update rejects undefined href on link', async() => {
			try {
				await window.D2L.Siren.EntityStore.update({ rel: ['alternate'] });
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		test('remove rejects undefined entityid', async() => {
			try {
				await window.D2L.Siren.EntityStore.remove();
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		test('remove rejects undefined href on link', async() => {
			try {
				await window.D2L.Siren.EntityStore.remove({ rel: ['alternate'] });
				throw new Error('promise was not rejected');
			} catch (e) {
				expect(e.message).to.be.equal('Cannot fetch undefined entityId');
			}
		});

		suite('remove removes item from Entity Store', () => {
			async function _test(sirenLinkOrHref) {
				await window.D2L.Siren.EntityStore.fetch(sirenLinkOrHref, '');
				expect(await window.D2L.Siren.EntityStore.get(sirenLinkOrHref, '')).not.to.be.null;
				await window.D2L.Siren.EntityStore.remove(sirenLinkOrHref, '');
				expect(await window.D2L.Siren.EntityStore.get(sirenLinkOrHref, '')).to.be.null;
			}

			test('with string href', () => _test('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623.json'));
			test('with siren link', () => _test({ href: 'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623.json' }));
		});

		suite('link header parse', function() {

			test('can parse single link header', function() {
				var links = window.D2L.Siren.EntityStore.parseLinkHeader('<https://example.org/.meta>; rel=meta; title="previous chapter"');
				expect(links[0].href).to.equal('https://example.org/.meta');
				expect(links[0].rel[0]).to.equal('meta');
				expect(links[0].title).to.equal('previous chapter');
			});

			test('can parse multi link header', function() {
				var links = window.D2L.Siren.EntityStore.parseLinkHeader('<https://example.org/.meta>; rel=meta, <https://example.org/related>; rel=related');

				expect(links[0].href).to.equal('https://example.org/.meta');
				expect(links[0].rel[0]).to.equal('meta');

				expect(links[1].href).to.equal('https://example.org/related');
				expect(links[1].rel[[0]]).to.equal('related');
			});

			test('can parse single link header with multi rels', function() {
				var links = window.D2L.Siren.EntityStore.parseLinkHeader('<https://example.org/.meta>; rel="start http://example.net/relation/other"');
				expect(links[0].href).to.equal('https://example.org/.meta');
				expect(links[0].rel[0]).to.equal('start');
				expect(links[0].rel[1]).to.equal('http://example.net/relation/other');
			});
		});

		suite('fetches cache primers', function() {
			var origFetch;
			setup(function() {
				origFetch = window.d2lfetch.fetch;
			});

			test('fetches single cache-primer link', async function() {
				const fetchedEntityLink = 'static-data/simple-collection/collection.json';
				const cachePrimedEntityLink = 'static-data/simple-collection/items/0.json';

				sandbox.stub(window.d2lfetch, 'fetch', async function() {
					if (arguments[0] !== fetchedEntityLink) {
						return origFetch.apply(window.d2lfetch, arguments);
					}

					const response = await origFetch.apply(window.d2lfetch, arguments);
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

			test('fetches multiple cache-primer links', async function() {
				const fetchedEntityLink = 'static-data/simple-collection/collection.json';
				const cachePrimedEntityLink = 'static-data/simple-collection/items/0.json';
				const cachePrimedEntityLink2 = 'static-data/simple-collection/items/1.json';

				sandbox.stub(window.d2lfetch, 'fetch', async function() {
					if (arguments[0] !== fetchedEntityLink) {
						return origFetch.apply(window.d2lfetch, arguments);
					}

					const response = await origFetch.apply(window.d2lfetch, arguments);
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

			test('expands fetched cache-primer links', async function() {
				const fetchedEntityLink = 'static-data/simple-collection/collection.json';
				const cachePrimedEntityLink = 'static-data/simple-collection/items/0.json';
				const cachePrimedEntityLink2 = 'static-data/simple-collection/items/1.json';

				sandbox.stub(window.d2lfetch, 'fetch', async function() {
					if (arguments[0] !== fetchedEntityLink) {
						return origFetch.apply(window.d2lfetch, arguments);
					}

					const response = await origFetch.apply(window.d2lfetch, arguments);
					const headers = new Headers(response.headers);
					headers.append(
						'Link',
						'<static-data/simple-collection/cache-primer.json>; rel="https://api.brightspace.com/rels/cache-primer"'
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

		suite('canonical entity tests', () => {

			var fetch;
			var origFetch;

			teardown(() => {
				fetch && fetch.restore();
			});

			setup(function() {
				origFetch = window.d2lfetch.fetch;
				fetch = sinon.stub(window.d2lfetch, 'fetch');
			});

			test('can fetch leaf entity that contains query parameters in entity href', function(done) {

				fetch.withArgs('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?foo=bar').returns(
					new Promise(function(resolve) {
						origFetch.apply(window.d2lfetch, ['static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json']).then(function(response) {
							resolve(response);
						});
					})
				);

				window.D2L.Siren.EntityStore.addListener(
					'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?zinglewaga=zinglezoo',
					'',
					function() {
						throw new Error('unexpected listener called');
					});
				window.D2L.Siren.EntityStore.addListener(
					'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?foo=bar',
					'',
					function(entity) {
						var description = entity && entity.getSubEntityByClass('description').properties.html;
						expect(description).to.equal('Proper use of grammar should allow query parameters');
						done();
					});
				window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/1.json?foo=bar', '');
			});

			test('can fetch leaf entity that contains canonical self relation', function(done) {
				fetch.withArgs('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json?foo=bar').returns(
					new Promise(function(resolve) {
						origFetch.apply(window.d2lfetch, ['static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json']).then(function(response) {
							resolve(response);
						});
					})
				);

				window.D2L.Siren.EntityStore.addListener(
					'static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json',
					'',
					function(entity) {
						var description = entity && entity.getSubEntityByClass('description').properties.html;
						expect(description).to.equal('Proper use of grammar should allow query parameters');
						done();
					});
				window.D2L.Siren.EntityStore.fetch('static-data/rubrics/organizations/text-only/199/groups/176/criteria/623/2.json?foo=bar', '');
			});
		});
	});
});
