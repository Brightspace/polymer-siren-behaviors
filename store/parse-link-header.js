// parse a Link header
//
// Link:<https://example.org/.meta>; rel=meta
//
// var r = parseLinkHeader(xhr.getResponseHeader('Link');
// r['meta'] outputs https://example.org/.meta
//
export function parseLinkHeader(links) {
	var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
	var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;
	var matches = links.match(linkexp);
	var _links = [];
	for (var i = 0; i < matches.length; i++) {
		var split = matches[i].split('>');
		var href = split[0].substring(1);
		_links.push({
			href: href
		});
		var ps = split[1];
		var s = ps.match(paramexp);
		for (var j = 0; j < s.length; j++) {
			var p = s[j];
			var paramsplit = p.split('=');
			var name = paramsplit[0];
			var val = paramsplit[1].replace(/["']/g, '');
			if (name === 'rel') {
				var relsplit = val.split(' ');
				_links[i][name] = relsplit;
			} else {
				_links[i][name] = val;
			}
		}
	}
	return _links;
}
