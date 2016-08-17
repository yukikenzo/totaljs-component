var MAN = new CMAN();
if (!window.MAN)
	window.MAN = MAN;
var COM_DATA_BIND_SELECTOR = 'input[data-component-bind],textarea[data-component-bind],select[data-component-bind]';
var COM_ATTR = '[data-component]';
var COM_A = 'data-component-';
var COM_ATTR_U = COM_A + 'url';
var COM_ATTR_URL = '[' + COM_ATTR_U + ']';
var COM_ATTR_P = COM_A + 'path';
var COM_ATTR_T = COM_A + 'template';
var COM_ATTR_I = COM_A + 'init';
var COM_ATTR_V = COM_A + 'value';
var COM_ATTR_R = COM_A + 'removed';
var COM_ATTR_C = COM_A + 'class';
var COM_ATTR_S = COM_A + 'scope';
var COM_DIACRITICS = {225:'a',228:'a',269:'c',271:'d',233:'e',283:'e',357:'t',382:'z',250:'u',367:'u',252:'u',369:'u',237:'i',239:'i',244:'o',243:'o',246:'o',353:'s',318:'l',314:'l',253:'y',255:'y',263:'c',345:'r',341:'r',328:'n',337:'o'};

window.isMOBILE = ('ontouchstart' in window || navigator.maxTouchPoints) ? true : false;
window.EMPTYARRAY = [];
window.EMPTYOBJECT = {};

if (Object.freeze) {
	Object.freeze(EMPTYOBJECT);
	Object.freeze(EMPTYARRAY);
}

window.SINGLETON = function(name) {
	return MAN.singletons[name] || (MAN.singletons[name] = {});
};

// Because of file size
window.COM = window.jC = function(container) {
	return MAN.isCompiling ? COM : COM.compile(container);
};

COM.clean = function(timeout) {
	clearTimeout(MAN.tic);
	MAN.tic = setTimeout(function() {
		MAN.cleaner();
	}, timeout || 10);
	return COM;
};

COM.evaluate = function(path, expression, nopath) {
	var key = 'eval' + expression;
	var exp = MAN.cache[key];
	var val;

	if (nopath)
		val = path;
	else
		val = COM.get(path);

	if (exp !== undefined)
		return exp.call(val, val, path);
	if (expression.indexOf('return') === -1)
		expression = 'return ' + expression;
	exp = new Function('value', 'path', expression);
	MAN.cache[key] = exp;
	return exp.call(val, val, path);
};

COM.defaults = {};
COM.defaults.delay = 300;
COM.defaults.keypress = true;
COM.defaults.localstorage = true;
COM.defaults.headers = {};
COM.defaults.devices = { xs: { max: 768 }, sm: { min: 768, max: 992 }, md: { min: 992, max: 1200 }, lg: { min: 1200 }};
COM.version = 'v5.0.0';
COM.$localstorage = 'jcomponent';
COM.$version = '';
COM.$language = '';
COM.$formatter = new Array(0);
COM.$parser = new Array(0);
COM.$parser.push(function(path, value, type) {
	if (type === 'number' || type === 'currency' || type === 'float') {
		if (typeof(value) === 'string')
			value = value.replace(/\s/g, '').replace(/,/g, '.');
		var v = parseFloat(value);
		if (isNaN(v))
			v = null;
		return v;
	}
	return value;
});

COM.cookies = {
	get: function (name) {
		var arr = document.cookie.split(';');
		for (var i = 0; i < arr.length; i++) {
			var c = arr[i];
			if (c.charAt(0) === ' ')
				c = c.substring(1);
			var v = c.split('=');
			if (v.length > 1) {
				if (v[0] === name)
					return v[1];
			}
		}
		return '';
	},
	set: function (name, value, expire) {
		var type = typeof(expire)
		if (type === 'number') {
			var date = new Date();
			date.setTime(date.getTime() + (expire * 24 * 60 * 60 * 1000));
			expire = date;
		} else if (type === 'string')
			expire = new Date(Date.now() + expire.parseExpire());
		document.cookie = name + '=' + value + '; expires=' + expire.toGMTString() + '; path=/';
	},
	rem: function (name) {
		this.set(name, '', -1);
	}
};

COM.formatter = function(value, path, type) {

	if (typeof(value) === 'function') {
		if (!COM.$formatter)
			COM.$formatter = [];
		COM.$formatter.push(value);
		return COM;
	}

	var a = COM.$formatter;
	if (a && a.length) {
		for (var i = 0, length = a.length; i < length; i++)
			value = a[i].call(COM, path, value, type);
	}

	return value;
};

COM.usage = function(name, expire, path, callback) {

	var type = typeof(expire);
	if (type === 'string')
		expire = new Date().add('-' + expire);
	else if (type === 'number')
		expire = Date.now() - expire;

	if (typeof(path) === 'function') {
		callback = path;
		path = undefined;
	}

	var arr = [];

	if (path) {
		COM.findByPath(path, function(c) {
			if (c.usage[name] > expire)
				return;
			if (callback)
				callback(c);
			else
				arr.push(c);
		});
	} else {
		MAN.components.forEach(function(c) {
			if (c.usage[name] > expire)
				return;
			if (callback)
				callback(c);
			else
				arr.push(c);
		});
	}

	return callback ? COM : arr;
};

COM.schedule = function(selector, name, expire, callback) {
	if (expire.substring(0, 1) !== '-')
		expire = '-' + expire;
	var arr = expire.split(' ');
	var type = arr[1].toLowerCase().substring(0, 1);
	if (type === 'y' || type === 'd')
		type = 'h';
	MAN.schedulers.push({ name: name, expire: expire, selector: selector, callback: callback, type: type });
	return COM;
};

COM.parser = function(value, path, type) {

	if (typeof(value) === 'function') {
		if (!COM.$parser)
			COM.$parser = [];
		COM.$parser.push(value);
		return this;
	}

	var a = COM.$parser;
	if (a && a.length) {
		for (var i = 0, length = a.length; i < length; i++)
			value = a[i].call(COM, path, value, type);
	}
	return value;
};

COM.compile = function(container) {

	var jcw = window.jComponent;

	if (jcw && jcw.length) {
		while (true) {
			var fn = jcw.shift();
			if (fn === undefined)
				break;
			fn();
		}
		window.jRouting && window.jRouting.async();
	}

	MAN.isCompiling = true;
	COM.$inject();

	if (MAN.pending.length) {
		MAN.pending.push(function() {
			COM.compile(container);
		});
		return COM;
	}

	var els = container ? container.find(COM_ATTR) : $(COM_ATTR);
	var skip = false;

	if (!els.length && !container) {
		$jc_ready();
		return;
	}

	var scopes = $('[' + COM_ATTR_S + ']');
	var scopes_length = scopes.length;

	els.each(function() {

		if (skip)
			return;

		var el = $(this);
		var name = el.attr('data-component');

		if (el.data(COM_ATTR) || el.attr(COM_ATTR_R))
			return;

		if (MAN.initializers['$ST_' + name]) {
			el.attr(COM_ATTR_R, true);
			el.remove();
			return;
		}

		var component = MAN.register[name || ''];
		if (!component) {

			var x = el.attr(COM_A + 'import');
			if (!x) {
				if (!MAN.initializers['$NE_' + name]) {
					MAN.initializers['$NE_' + name] = true;
					// console.warn('The component "' + name + '" does not exist.');
				}
				return;
			}

			if (MAN.imports[x] === 1)
				return;

			if (MAN.imports[x] === 2) {
				if (!MAN.initializers['$NE_' + name]) {
					MAN.initializers['$NE_' + name] = true;
					// console.warn('The component "' + name + '" does not exist.');
				}
				return;
			}

			MAN.imports[x] = 1;
			IMPORT(x, function() {
				MAN.imports[x] = 2;
			});
			return;
		}

		var obj = component(el);

		if (obj.init) {
			if (!MAN.initializers[name]) {
				MAN.initializers[name] = true;
				obj.init();
			}
			delete obj.init;
		}

		obj.$init = el.attr(COM_ATTR_I) || null;
		obj.type = el.attr('data-component-type') || '';
		obj.id = el.attr('data-component-id') || obj._id;
		obj.dependencies = new Array(0);

		if (!obj.$noscope)
			obj.$noscope = el.attr('data-component-noscope') === 'true';

		if (el.attr('data-component-singleton') === 'true')
			MAN.initializers['$ST_' + name] = true;

		var code = obj.path ? obj.path.charCodeAt(0) : 0;
		if (!obj.$noscope && scopes_length && obj.path && code !== 33 && code !== 35) {
			for (var i = 0; i < scopes_length; i++) {

				if (!$.contains(scopes[i], this))
					continue;

				var p = scopes[i].getAttribute(COM_ATTR_S);

				if (!p || p === '?') {
					p = 'scope' + (Math.floor(Math.random() * 100000) + 1000);
					scopes[i].setAttribute(COM_ATTR_S, p);
				}

				if (!scopes[i].$processed) {
					scopes[i].$processed = true;
					var tmp = scopes[i].getAttribute(COM_ATTR_V);
					if (tmp) {
						var fn = new Function('return ' + tmp);
						MAN.defaults['#' + HASH(p)] = fn; // store by path (DEFAULT() --> can reset scope object)
						MAN.set(p, fn());
					}
				}

				if (obj.path === '?')
					obj.setPath(p);
				else
					obj.setPath(p + '.' + obj.path);

				obj.scope = scopes[i];
			}
		}

		var dep = (el.attr('dependencies') || '').split(',');

		for (var i = 0, length = dep.length; i < length; i++) {
			var d = dep[i].trim();
			if (d)
				obj.dependencies.push(d);
		}

		// A reference to implementation
		el.data(COM_ATTR, obj);

		var template = el.attr(COM_ATTR_T) || obj.template;
		if (template)
			obj.template = template;

		if (el.attr(COM_ATTR_U)) {
			console.warn('You cannot use [data-component-url] for the component: ' + obj.name + '[' + obj.path + ']. Instead of it you must use data-component-template.');
			return;
		}

		if (typeof(template) === 'string') {
			var fn = function(data) {
				if (obj.prerender)
					data = prerender(data);
				if (typeof(obj.make) === 'function')
					obj.make(data);
				$jc_init(el, obj);
			};

			var c = template.substring(0, 1);
			if (c === '.' || c === '#' || c === '[') {
				fn($(c).html());
				return;
			}

			var k = 'TE' + HASH(template);
			var a = MAN.temp[k];
			if (a)
				return fn(a);

			$.get($jc_url(template), function(response) {
				MAN.temp[k] = response;
				fn(response);
			});
			return;
		}

		if (typeof(obj.make) === 'string') {

			if (obj.make.indexOf('<') !== -1) {
				if (obj.prerender)
					obj.make = obj.prerender(obj.make);
				el.html(obj.make);
				$jc_init(el, obj);
				return;
			}

			$.get($jc_url(obj.make), function(data) {
				if (obj.prerender)
					data = prerender(data);
				el.html(data);
				$jc_init(el, obj);
			});

			return;
		}

		if (obj.make) {
			if (obj.make())
				skip = true;
		}

		$jc_init(el, obj);
	});

	if (skip)
		return COM.compile();

	if (container !== undefined)
		return MAN.next();

	if (!MAN.toggle.length)
		return MAN.next();

	$jc_async(MAN.toggle, function(item, next) {
		for (var i = 0, length = item.toggle.length; i < length; i++)
			item.element.toggleClass(item.toggle[i]);
		next();
	}, function() {
		MAN.next();
	});
};

COM.$inject = function() {

	var els = $(COM_ATTR_URL);
	var arr = [];
	var count = 0;

	els.each(function() {
		var el = $(this);
		if (el.data(COM_ATTR_URL))
			return;

		el.data(COM_ATTR_URL, '1');

		var url = el.attr(COM_ATTR_U);

		// Unique
		var once = url.substring(0, 5).toLowerCase() === 'once ';
		if (url.substring(0, 1) === '!' || once) {

			if (once)
				url = url.substring(5);
			else
				url = url.substring(1);

			if (MAN.others[url])
				return;

			MAN.others[url] = 2;
		}

		arr.push({ element: el, cb: el.attr(COM_ATTR_I), path: el.attr(COM_ATTR_P), url: url, toggle: (el.attr(COM_ATTR_C) || '').split(' ') });
	});

	if (!arr.length)
		return;

	$jc_async(arr, function(item, next) {
		item.element.load($jc_url(item.url), function() {

			if (item.path) {
				var com = item.element.find(COM_ATTR);
				com.each(function() {
					var el = $(this);
					$.each(this.attributes, function() {
						if (!this.specified)
							return;
						el.attr(this.name, this.value.replace('$', item.path));
					});
				});
			}

			if (item.toggle.length && item.toggle[0])
				MAN.toggle.push(item);

			if (item.cb && !item.element.attr('data-component')) {
				var cb = MAN.get(item.cb);
				if (typeof(cb) === 'function')
					cb(item.element);
			}

			count++;
			next();
		});

	}, function() {
		MAN.clear('valid', 'dirty', 'broadcast', 'find');
		count && COM.compile();
	});
};

COM.components = function() {
	return Object.keys(MAN.register).trim();
};

COM.inject = COM.import = function(url, target, callback, insert) {

	// unique
	var first = url.substring(0, 1);
	var once = url.substring(0, 5).toLowerCase() === 'once ';

	if (insert === undefined)
		insert = true;

	if (typeof(target) === 'function') {
		timeout = callback;
		callback = target;
		target = 'body';
	}

	if (first === '!' || once) {

		if (once)
			url = url.substring(5);
		else
			url = url.substring(1);

		if (MAN.others[url]) {

			if (!callback)
				return COM;

			if (MAN.others[url] === 2) {
				callback();
				return COM;
			}

			WAIT(function() {
				return MAN.others[url] === 2;
			}, function() {
				callback();
			});

			return COM;
		}

		MAN.others[url] = 1;
	}

	if (target && target.getPath)
		target = target.element;

	if (!target)
		target = 'body';

	var ext = url.lastIndexOf('.');
	if (ext !== -1)
		ext = url.substring(ext).toLowerCase();
	else
		ext = '';

	var d = document;
	if (ext === '.js') {
		var scr = d.createElement('script');
		scr.type = 'text/javascript';
		scr.async = true;
		scr.onload = function() {
			MAN.others[url] = 2;
			callback && callback();
			if (!window.jQuery)
				return;
			setTimeout(COM.compile, 300);
		};

		scr.src = url;
		d.getElementsByTagName('head')[0].appendChild(scr);
		return;
	}

	if (ext === '.css') {
		var stl = d.createElement('link');
		stl.type = 'text/css';
		stl.rel = 'stylesheet';
		stl.href = url;
		d.getElementsByTagName('head')[0].appendChild(stl);
		MAN.others[url] = 2;
		callback && setTimeout(callback, 200);
		return;
	}

	WAIT(function() {
		return window.jQuery ? true : false;
	}, function() {
		MAN.others[url] = 2;
		if (insert) {
			var id = 'data-component-imported="' + ((Math.random() * 100000) >> 0) + '"';
			$(target).append('<div ' + id + '></div>');
			target = $(target).find('> div[' + id + ']');
		}
		$(target).load($jc_url(url), function() {
			COM.compile();
			callback && callback();
		});
	});

	return COM;
};

COM.createURL = function(url, values) {

	if (typeof(url) === 'object') {
		values = url;
		url = location.pathname + location.search;
	}

	var query;
	var index = url.indexOf('?');
	if (index !== -1) {
		query = COM.parseQuery(url.substring(index + 1));
		url = url.substring(0, index);
	} else
		query = {};

	var keys = Object.keys(values);

	for (var i = 0, length = keys.length; i < length; i++) {
		var key = keys[i];
		query[key] = values[key];
	}

	var val = $.param(query, true);
	return url + (val ? '?' + val : '');
};

COM.parseCookie = COM.parseCookies = function() {
	var arr = document.cookie.split(';');
	var obj = {};

	for (var i = 0, length = arr.length; i < length; i++) {
		var line = arr[i].trim();
		var index = line.indexOf('=');
		if (index !== -1)
			obj[line.substring(0, index)] = decodeURIComponent(line.substring(index + 1));
	}

	return obj;
};

COM.parseQuery = function(value) {

	if (!value)
		value = location.search;

	if (!value)
		return EMPTYOBJECT;

	var index = value.indexOf('?');
	if (index !== -1)
		value = value.substring(index + 1);

	var arr = value.split('&');
	var obj = {};
	for (var i = 0, length = arr.length; i < length; i++) {
		var sub = arr[i].split('=');
		var key = sub[0];
		var val = decodeURIComponent((sub[1] || '').replace(/\+/g, '%20'));

		if (!obj[key]) {
			obj[key] = val;
			continue;
		}

		if (!(obj[key] instanceof Array))
			obj[key] = [obj[key]];
		obj[key].push(val);
	}
	return obj;
};

COM.UPLOAD = function(url, data, callback, timeout, progress, error) {

	if (!url)
		url = location.pathname;

	if (typeof(callback) === 'number') {
		timeout = callback;
		callback = undefined;
	}

	if (typeof(timeout) !== 'number') {
		var tmp = progress;
		error = progress;
		progress = timeout;
		timeout = tmp;
	}

	setTimeout(function() {
		var xhr = new XMLHttpRequest();
		xhr.addEventListener('load', function() {

			var r = this.responseText;
			try {
				r = JSON.parse(r);
			} catch (e) {}

			if (this.status === 200) {
				if (typeof(callback) === 'string')
					return MAN.remap(callback, r);
				return callback && callback(r);
			}

			if (!r)
				r = this.status + ': ' + this.statusText;

			COM.emit('error', r, this.status, url);

			if (typeof(error) === 'string')
				return MAN.remap(error, r);

			if (error)
				error(r, this.status);
			else if (typeof(callback) === 'function')
				callback({}, r, this.status);

		}, false);

		xhr.upload.onprogress = function(evt) {
			if (!progress)
				return;
			var percentage = 0;
			if (evt.lengthComputable)
				percentage = Math.round(evt.loaded * 100 / evt.total);
			if (typeof(progress) === 'string')
				return MAN.remap(progress, percentage);
			progress(percentage, evt.transferSpeed, evt.timeRemaining);
		};

		xhr.open('POST', url);
		xhr.send(data);
	}, timeout || 0);

	return COM;
};

COM.TEMPLATE = function(url, callback, prepare) {

	if (MAN.cache[url]) {

		if (typeof(callback) === 'string')
			SET(callback, MAN.cache[url]);
		else
			callback(MAN.cache[url]);

		return COM;
	}

	COM.GET(url, {}, function(response) {
		var value = MAN.cache[url] = prepare ? prepare(response) : response;
		if (typeof(callback) === 'string')
			SET(callback, value);
		else
			callback(value);
	});

	return COM;
};

COM.AJAX = function(url, data, callback, timeout, error) {

	if (typeof(url) === 'function') {
		error = timeout;
		timeout = callback;
		callback = data;
		data = url;
		url = location.pathname;
	}

	var td = typeof(data);
	var tmp;

	if (!callback && (td === 'function' || td === 'string')) {
		error = timeout;
		timeout = callback;
		callback = data;
		data = undefined;
	}

	if (typeof(timeout) === 'string') {
		tmp = error;
		error = timeout;
		timeout = tmp;
	}

	var index = url.indexOf(' ');
	if (index === -1)
		return COM;

	var method = url.substring(0, index).toUpperCase();
	var isCredentials = method.substring(0, 1) === '!';
	if (isCredentials)
		method = method.substring(1);

	var headers = {};
	tmp = url.match(/\{.*?\}/g);

	if (tmp) {
		url = url.replace(tmp, '').replace(/\s{2,}/g, ' ');
		tmp = (new Function('return ' + tmp))();
		if (typeof(tmp) === 'object')
			headers = tmp;
	}

	url = url.substring(index).trim();

	// middleware
	index = url.indexOf(' #');
	var middleware = '';

	if (index !== -1) {
		middleware = url.substring(index);
		url = url.substring(0, index);
	}

	setTimeout(function() {

		if (method === 'GET' && data)
			url += '?' + (typeof(data) === 'string' ? data : jQuery.param(data, true));

		var options = {};
		options.type = method;

		if (method !== 'GET') {
			if (typeof(data) === 'string') {
				options.data = data;
			} else {
				options.contentType = 'application/json; charset=utf-8';
				options.data = JSON.stringify(data);
			}
		}

		options.success = function(r, o, req) {
			$MIDDLEWARE(middleware, r, 1, function(path, value) {
				if (typeof(callback) === 'string')
					return MAN.remap(callback, value);
				callback && callback(value, undefined, req.getAllResponseHeaders());
			});
		};

		if (url.match(/http\:\/\/|https\:\/\//i)) {
			options.crossDomain = true;
			if (isCredentials)
				options.xhrFields = { withCredentials: true };
		}

		options.headers = $.extend(headers, COM.defaults.headers);

		options.error = function(req, status, r) {

			var body = req.responseText;
			var headers = req.getAllResponseHeaders();

			if (headers.indexOf('/json') !== -1) {
				try {
					body = JSON.parse(body);
				} catch (e) {}
			}

			status = status + ': ' + r;
			COM.emit('error', body, status, url, headers);
			if (typeof(error) === 'string')
				return MAN.remap(error, body);
			if (error)
				error(body, status, url);
			else if (typeof(callback) === 'function')
				callback(body, status, url, headers);
		};

		$.ajax($jc_url(url), options);
	}, timeout || 0);

	return COM;
};

COM.AJAXCACHE = function(url, data, callback, expire, timeout, clear) {

	if (typeof(url) === 'function') {
		error = timeout;
		timeout = callback;
		callback = data;
		data = url;
		url = location.pathname;
	}

	var td = typeof(data);
	if ((!callback || typeof(callback) === 'number') && (td === 'function' || td === 'string')) {
		clear = timeout;
		timeout = expire;
		expire = callback;
		callback = data;
		data = undefined;
	}

	if (typeof(timeout) === 'boolean') {
		var tmp = clear;
		clear = timeout;
		timeout = tmp;
	}

	var index = url.indexOf(' ');
	if (index === -1)
		return COM;

	var method = url.substring(0, index).toUpperCase();
	var uri = url.substring(index).trim();

	setTimeout(function() {
		var value = clear ? undefined : MAN.cacherest(method, uri, data);
		if (value !== undefined) {
			if (typeof(callback) === 'string')
				MAN.remap(callback, value);
			else
				callback(value, true);
			return COM;
		}

		COM.AJAX(url, data, function(r, err) {
			if (err)
				r = err;
			MAN.cacherest(method, uri, data, r, expire);
			if (typeof(callback) === 'string')
				MAN.remap(callback, r);
			else
				callback(r, false);
		});
	}, timeout || 1);

	return COM;
}

COM.cache = function(key, value, expire) {
	return MAN.cachestorage(key, value, expire);
};

COM.removeCache = function(key, isSearching) {
	if (isSearching) {
		for (var m in MAN.storage) {
			if (m.indexOf(key) !== -1)
				delete MAN.storage[key];
		}
	} else
		delete MAN.storage[key];
	$jc_save();
	return COM;
};

COM.REMOVECACHE = function(method, url, data) {

	var index = method.indexOf(' ');
	if (index !== -1) {
		data = url;
		url = method.substring(index).trim();
		method = method.substring(0, index);
	}

	data = JSON.stringify(data);
	var key = HASH(method + '#' + url.replace(/\//g, '') + data).toString();
	delete MAN.storage[key];
	$jc_save();
	return COM;
};

COM.ready = function(fn) {
	if (MAN.ready)
		MAN.ready.push(fn);
	return COM;
};

function $jc_url(url) {
	var index = url.indexOf('?');
	var builder = [];

	if (COM.$version)
		builder.push('version=' + encodeURIComponent(COM.$version));

	if (COM.$language)
		builder.push('language=' + encodeURIComponent(COM.$language));

	if (!builder.length)
		return url;

	if (index !== -1)
		url += '&';
	else
		url += '?';

	return url + builder.join('&');
}

function $jc_ready() {
	clearTimeout(MAN.timeout);
	MAN.timeout = setTimeout(function() {

		$MEDIAQUERY();
		MAN.refresh();
		MAN.initialize();

		var count = MAN.components.length;
		$(document).trigger('components', [count]);

		if (!MAN.isReady) {
			MAN.clear('valid', 'dirty', 'broadcast', 'find');
			MAN.isReady = true;
			COM.emit('init');
			COM.emit('ready');
		}

		if (MAN.timeoutcleaner)
			clearTimeout(MAN.timeoutcleaner);

		MAN.timeoutcleaner = setTimeout(function() {
			MAN.cleaner();
		}, 1000);

		MAN.isCompiling = false;
		$('[' + COM_ATTR_S + ']').each(function() {

			if (this.$ready)
				return;

			var scope = $(this);
			this.$ready = true;

			// Applies classes
			var cls = scope.attr(COM_ATTR_C);
			if (cls) {
				(function(cls) {
					cls = cls.split(' ');
					setTimeout(function() {
						for (var i = 0, length = cls.length; i < length; i++)
							scope.toggleClass(cls[i]);
					}, 5);
				})(cls);
			}

			var controller = this.getAttribute('data-component-controller');
			if (controller) {
				var ctrl = CONTROLLER(controller);
				if (ctrl)
					ctrl.$init(undefined, this.getAttribute(COM_ATTR_S), scope);
			}

			var path = this.getAttribute(COM_ATTR_I);
			if (!path)
				return;

			if (MAN.isOperation(path)) {
				var op = OPERATION(path);
				if (op)
					op.call(scope, this.getAttribute(COM_ATTR_S), scope);
				else if (console)
					console.warn('The operation ' + path + ' not found.');
			} else {
				var fn = GET(path);
				typeof(fn) === 'function' && fn.call(scope, this.getAttribute(COM_ATTR_S), scope);
			}
		});

		if (!MAN.ready)
			return;

		var arr = MAN.ready;
		for (var i = 0, length = arr.length; i < length; i++)
			arr[i](count);

		delete MAN.ready;
	}, 300);
}

COM.watch = function(path, fn, init) {
	COM.on('watch', path, fn);

	if (!init)
		return COM;

	fn.call(COM, path, MAN.get(path), 0);
	return COM;
};

COM.on = function(name, path, fn, init) {

	if (typeof(path) === 'function') {
		fn = path;
		path = '';
	} else
		path = path.replace('.*', '');
	var fixed = null;
	if (path.charCodeAt(0) === 33) {
		path = path.substring(1);
		fixed = path;
	}

	if (!MAN.events[path]) {
		MAN.events[path] = {};
		MAN.events[path][name] = [];
	} else if (!MAN.events[path][name])
		MAN.events[path][name] = [];

	MAN.events[path][name].push({ fn: fn, id: this._id, path: fixed });

	if (!init)
		return COM;
	fn.call(COM, path, MAN.get(path), true);
	return COM;
};

function $jc_init(el, obj) {

	var type = el.get(0).tagName;
	var collection;

	// autobind
	if (type === 'INPUT' || type === 'SELECT' || type === 'TEXTAREA') {
		obj.$input = true;
		collection = obj.element;
	} else
		collection = el.find(COM_DATA_BIND_SELECTOR);

	collection.each(function() {
		if (!this.$component)
			this.$component = obj;
	});

	MAN.components.push(obj);
	MAN.init.push(obj);
	COM.compile(el);
	$jc_ready();
}

COM.$emit2 = function(name, path, args) {

	var e = MAN.events[path];
	if (!e)
		return false;

	e = e[name];
	if (!e)
		return false;

	for (var i = 0, length = e.length; i < length; i++) {
		var ev = e[i];
		if (!ev.path || ev.path === path)
			ev.fn.apply(ev.context, args);
	}

	return true;
};

COM.$emitonly = function(name, paths, type, path) {

	var unique = {};
	var keys = Object.keys(paths);

	for (var a = 0, al = keys.length; a < al; a++) {
		var arr = keys[a].split('.');
		var p = '';
		for (var b = 0, bl = arr.length; b < bl; b++) {
			p += (p ? '.' : '') + arr[b];
			unique[p] = paths[p];
		}
	}

	COM.$emit2(name, '*', [path, unique[path], type]);

	Object.keys(unique).forEach(function(key) {
		COM.$emit2(name, key, [path, unique[key], type]);
	});

	return this;
};

COM.$emit = function(name, path) {

	if (!path)
		return;

	var arr = path.split('.');
	var args = [];
	var length = name === 'watch' ? 3 : arguments.length;

	for (var i = name === 'watch' ? 1 : 2; i < length; i++)
		args.push(arguments[i]);

	if (name === 'watch')
		args.push(arguments[3]);

	COM.$emit2(name, '*', args);

	var p = '';
	for (var i = 0, length = arr.length; i < length; i++) {

		var k = arr[i];
		var a = arr[i];

		if (k === '*')
			continue;

		if (a.substring(a.length - 1, a.length) === ']') {
			var beg = a.lastIndexOf('[');
			a = a.substring(0, beg);
		}

		p += (i ? '.' : '');

		args[1] = COM.get(p + k);
		COM.$emit2(name, p + k, args);
		k !== a && COM.$emit2(name, p + a, args);
		p += k;
	}

	return true;
};

COM.emit = function(name) {

	var e = MAN.events[''];
	if (!e)
		return false;

	e = MAN.events[''][name];
	if (!e)
		return false;

	var args = [];

	for (var i = 1, length = arguments.length; i < length; i++)
		args.push(arguments[i]);

	for (var i = 0, length = e.length; i < length; i++) {
		var context = e[i].context;
		if (context !== undefined && (context === null || context.$removed))
			continue;
		e[i].fn.apply(context || window, args);
	}

	return true;
};

COM.change = function(path, value) {
	if (value === undefined)
		return !COM.dirty(path);
	return !COM.dirty(path, !value);
};

COM.used = function(path) {
	COM.each(function(obj) {
		obj.used();
	}, path, true);
	return COM;
};

COM.valid = function(path, value, onlyComponent) {

	var isExcept = value instanceof Array;
	var key = 'valid' + path + (isExcept ? '>' + value.join('|') : '');
	var except;

	if (isExcept) {
		except = value;
		value = undefined;
	}

	if (typeof(value) !== 'boolean' && MAN.cache[key] !== undefined)
		return MAN.cache[key];

	var valid = true;
	var arr = value !== undefined ? [] : null;

	COM.each(function(obj, index, isAsterix) {

		if (isExcept && except.indexOf(obj.path) !== -1)
			return;

		if (obj.disabled || obj.$valid_disabled) {
			if (arr && obj.state)
				arr.push(obj);
			return;
		}

		if (value === undefined) {
			if (obj.$valid === false)
				valid = false;
			return;
		}

		if (obj.state)
			arr.push(obj);

		if (!onlyComponent) {
			if (isAsterix || obj.path === path) {
				obj.$valid = value;
				obj.$validate = false;
				obj.$interaction(102);
			}
		} else if (onlyComponent._id === obj._id) {
			obj.$valid = value;
			obj.$interaction(102);
		}

		if (obj.$valid === false)
			valid = false;

	}, path, true);

	MAN.clear('valid');
	MAN.cache[key] = valid;
	COM.state(arr, 1, 1);
	return valid;
};

COM.dirty = function(path, value, onlyComponent, skipEmitState) {

	var isExcept = value instanceof Array;
	var key = 'dirty' + path + (isExcept ? '>' + value.join('|') : '');
	var except;

	if (isExcept) {
		except = value;
		value = undefined;
	}

	if (typeof(value) !== 'boolean' && MAN.cache[key] !== undefined)
		return MAN.cache[key];

	var dirty = true;
	var arr = value !== undefined ? [] : null;

	COM.each(function(obj, index, isAsterix) {

		if (isExcept && except.indexOf(obj.path) !== -1)
			return;

		if (obj.disabled || obj.$dirty_disabled) {
			if (arr && obj.state)
				arr.push(obj);
			return;
		}

		if (value === undefined) {
			if (obj.$dirty === false)
				dirty = false;
			return;
		}

		if (obj.state)
			arr.push(obj);

		if (!onlyComponent) {
			if (isAsterix || obj.path === path) {
				obj.$dirty = value;
				obj.$interaction(101);
			}
		} else if (onlyComponent._id === obj._id) {
			obj.$dirty = value;
			obj.$interaction(101);
		}

		if (obj.$dirty === false)
			dirty = false;

	}, path, true);

	MAN.clear('dirty');
	MAN.cache[key] = dirty;

	// For double hitting component.state() --> look into COM.invalid()
	if (!skipEmitState)
		COM.state(arr, 1, 2);

	return dirty;
};

// 1 === manually
// 2 === by input
COM.update = function(path, reset, type) {

	var is = path.charCodeAt(0) === 33;
	if (is)
		path = path.substring(1);

	path = path.replace(/\.\*/, '');
	$MIDDLEWARE(path, undefined, type, function(path) {

		if (!path)
			return COM;

		var state = [];
		var was = false;
		var updates = {};

		// Array prevention
		var search = path;

		if (type === undefined)
			type = 1; // manually

		var A = search.split('.');
		var AL = A.length;
		var isarr = path.indexOf('[') !== -1;

		COM.each(function(component) {

			if (!component.path || component.disabled)
				return;

			var isnot = true;

			for (var i = 0; i < AL; i++) {
				var item = component.$$path[i];
				if (!item)
					return;
				if (isarr) {
					if (item.raw !== A[i])
						return;
				} else {
					if (item.path && item.path !== A[i])
						return;
					if (item.is)
						isnot = false;
				}
			}

			if (isnot && component.$path && component.$path !== path)
				return;

			var result = component.get();
			if (component.setter) {
				component.$skip = false;

				$MIDDLEWARE(component.middleware, result, type, function(tmp, value) {
					component.setter(value, path, type);
				});

				component.$interaction(type);
			}

			component.$ready = true;

			if (reset === true) {

				if (!component.$dirty_disabled) {
					component.$dirty = true;
					component.$interaction(101);
				}

				if (!component.$valid_disabled) {
					component.$valid = true;
					component.$validate = false;
					if (component.validate) {
						component.$valid = component.validate(result);
						component.$interaction(102);
					}
				}

				component.element.find(COM_DATA_BIND_SELECTOR).each(function() {
					delete this.$value;
					delete this.$value2;
				});

			} else if (component.validate && !component.$valid_disabled)
				component.valid(component.validate(result), true);

			component.state && state.push(component);

			if (component.path === path)
				was = true;

			updates[component.path] = result;
		}, is ? path : undefined, undefined, is);

		if (reset)
			MAN.clear('dirty', 'valid');

		if (!updates[path])
			updates[path] = COM.get(path);

		for (var i = 0, length = state.length; i < length; i++)
			state[i].state(1, 4);

		// watches
		length = path.length;

		Object.keys(MAN.events).forEach(function(key) {
			if (key === path || key.substring(0, length + 1) === path + '.')
				updates[key] = COM.get(key);
		});

		COM.$emitonly('watch', updates, type, path);
	});

	return COM;
};

COM.notify = function() {

	var arg = arguments;
	var length = arguments.length;

	COM.each(function(component) {

		if (!component.path || component.disabled)
			return;

		var is = false;

		for (var i = 0; i < length; i++) {
			if (component.path === arg[i]) {
				is = true;
				break;
			}
		}

		if (!is)
			return;

		component.setter(component.get(), component.path, 1);
		component.$interaction(1);
	});

	Object.keys(MAN.events).forEach(function(key) {

		var is = false;
		for (var i = 0; i < length; i++) {
			if (key === arg[i]) {
				is = true;
				break;
			}
		}

		if (!is)
			return;

		COM.$emit2('watch', key, [key, COM.get(key)]);
	});

	return COM;
};

COM.extend = function(path, value, type) {
	var val = COM.get(path);
	if (val == null)
		val = {};
	COM.set(path, $.extend(val, value), type);
	return COM;
};

COM.nested = function(element, selector, type, value) {

	element = $(element);

	if (selector === '*') {
		selector = null;
	} else if (!(selector instanceof Array)) {
		selector = selector.split(',');
		var nested = [];
		for (var i = 0, length = selector.length; i < length; i++) {
			var item = selector[i].trim();
			item && nested.push(item);
		}

		if (nested.length)
			selector = nested;
		else
			selector = null;
	}

	var isEach = typeof(type) === 'function';

	if (!isEach) {
		switch (type) {
			case 'path':
			case 'template':
			case 'dependencies':
			case 'class':
			case 'url':
			case 'type':
			case 'init':
			case 'bind':
			case 'keypress':
			case 'keypress-delay':
			case 'keypress-only':
				type = 'data-component-' + type;
				break;
			case 'delay':
			case 'only':
				type = 'data-component-keypress-' + type;
				break;
		}
	}

	var self = this;
	var replacer = function(current, value) {
		if (current && current.indexOf('?') !== -1)
			return current.replace('?', value);
		return value;
	};

	if (!selector) {
		element.find('[data-component]').each(function() {
			var el = $(this);
			var com = el.component();
			if (isEach)
				return type(el, com);
			el.attr(type, type === COM_ATTR_P ? replacer(el.attr(type), value) : value);
			if (com && type === COM_ATTR_P)
				com.setPath(replacer(com.path, value));

		});
		return self;
	}

	element.find('[data-component]').each(function() {
		var el = $(this);
		var id = el.attr('data-component-id');
		var pat = el.attr(COM_ATTR_P);
		var name = el.attr('data-component');
		for (var i = 0, length = selector.length; i < length; i++) {
			var item = selector[i];
			var is = false;
			if (item.charCodeAt(0) === 46)
				is = item.substring(1) === pat;
			else if (item.charCodeAt(0) === 35)
				is = item.substring(1) === id;
			else
				is = item === name;

			if (!is)
				continue;

			var com = el.component();
			if (isEach)
				return type(el, com);

			el.attr(type, type === COM_ATTR_P ? replacer(el.attr(type), value) : value);
			if (com && type === COM_ATTR_P)
				com.setPath(replacer(com.path, value));
		}
	});

	return self;
};

COM.rewrite = function(path, val) {
	$MIDDLEWARE(path, val, 1, function(path, value) {
		MAN.set(path, value, 1);
	});
	return COM;
};

// 1 === manually
// 2 === by input
COM.set = function(path, val, type) {
	$MIDDLEWARE(path, val, type, function(path, value) {
		var is = path.charCodeAt(0) === 33;
		if (is)
			path = path.substring(1);

		if (path.charCodeAt(0) === 43) {
			path = path.substring(1);
			return COM.push(path, value, type);
		}

		if (!path)
			return COM;

		var isUpdate = (typeof(value) === 'object' && !(value instanceof Array) && value !== null && value !== undefined);
		var reset = type === true;
		if (reset)
			type = 1;

		MAN.set(path, value, type);

		if (isUpdate)
			return COM.update(path, reset, type);

		// Is changed value by e.g. middleware?
		// If yes the control/input will be redrawn
		var isChanged = val !== value;
		var result = MAN.get(path);
		var state = [];

		if (type === undefined)
			type = 1;

		var A = path.split('.');
		var AL = A.length;

		COM.each(function(component) {

			if (!component.path || component.disabled)
				return;

			for (var i = 0; i < AL; i++) {
				var item = component.$$path[i];
				if (item && item.raw !== A[i])
					return;
			}

			if (component.$path && component.$path !== path)
				return;

			if (component.path === path) {
				if (component.setter) {
					if (isChanged)
						component.$skip = false;
					$MIDDLEWARE(component.middleware, result, type, function(tmp, value) {
						component.setter(value, path, type);
					});
					component.$interaction(type);
				}
			} else {
				if (component.setter) {
					if (isChanged)
						component.$skip = false;
					$MIDDLEWARE(component.middleware, COM.get(component.path), type, function(tmp, value) {
						component.setter(value, path, type);
					});
					component.$interaction(type);
				}
			}

			component.$ready = true;

			if (component.state)
				state.push(component);

			if (reset) {
				if (!component.$dirty_disabled)
					component.$dirty = true;
				if (!component.$valid_disabled) {
					component.$valid = true;
					component.$validate = false;
					if (component.validate) {
						component.$valid = component.validate(result);
						component.$interaction(102);
					}
				}

				component.element.find(COM_DATA_BIND_SELECTOR).each(function() {
					delete this.$value;
					delete this.$value2;
				});

			} else if (component.validate && !component.$valid_disabled)
				component.valid(component.validate(result), true);

		}, path, true, is);

		if (reset)
			MAN.clear('dirty', 'valid');

		for (var i = 0, length = state.length; i < length; i++)
			state[i].state(type, 5);

		COM.$emit('watch', path, undefined, type, is);
	});
	return COM;
};

COM.push = function(path, value, type) {

	var arr = COM.get(path);
	var n = false;

	if (!(arr instanceof Array)) {
		arr = [];
		n = true;
	}

	var is = true;

	if (value instanceof Array) {
		if (value.length)
			arr.push.apply(arr, value);
		else
			is = false;
	}
	else
		arr.push(value);

	if (n)
		COM.set(path, arr, type);
	else if (is)
		COM.update(path, type);

	return COM;
};

COM.get = function(path, scope) {
	return MAN.get(path, scope);
};

COM.remove = function(path) {

	if (path instanceof jQuery) {
		path.find(COM_ATTR).attr(COM_ATTR_R, 'true').each(function() {
			var com = $(this).data('component');
			if (com)
				com.$removed = true;
		});

		if (path.attr(COM_ATTR_T))
			path.attr(COM_ATTR_R, 'true');

		var com = path.data('component');
		if (com)
			com.$removed = true;

		clearTimeout(MAN.tic);
		MAN.tic = setTimeout(function() {
			MAN.cleaner();
		}, 100);
		return COM;
	}

	MAN.clear();
	COM.each(function(obj) {
		obj.remove(true);
	}, path);

	clearTimeout(MAN.tic);
	MAN.tic = setTimeout(function() {
		MAN.cleaner();
	}, 100);
	return COM;
};

COM.schema = function(name, declaration) {

	if (!declaration)
		return $.extend(true, {}, MAN.schemas[name]);

	if (typeof(declaration) === 'object') {
		MAN.schemas[name] = declaration;
		return declaration;
	}

	if (typeof(declaration) === 'function') {
		var f = declaration();
		MAN.schemas[name] = f;
		return f;
	}

	if (typeof(declaration) !== 'string')
		return undefined;

	var a = declaration.substring(0, 1);
	var b = declaration.substring(declaration.length - 1);

	if ((a === '"' && b === '"') || (a === '[' && b === ']') || (a === '{' && b === '}')) {
		var d = JSON.parse(declaration);
		MAN.schemas[name] = d;
		return d;
	}
};

COM.validate = function(path, except) {

	var arr = [];
	var valid = true;

	COM.each(function(obj) {

		if (obj.disabled || (except && except.indexOf(obj.path) !== -1))
			return;

		if (obj.state)
			arr.push(obj);

		if (obj.$valid_disabled)
			return;

		obj.$validate = true;

		if (obj.validate) {
			obj.$valid = obj.validate(MAN.get(obj.path));
			obj.$interaction(102);
			if (!obj.$valid)
				valid = false;
		}

	}, path);

	MAN.clear('valid');
	COM.state(arr, 1, 1);
	COM.$emit('validate', path);
	return valid;
};

COM.errors = function(path, except) {

	if (path instanceof Array) {
		except = path;
		path = undefined;
	}

	var arr = [];
	COM.each(function(obj) {
		if (except && except.indexOf(obj.path) !== -1)
			return;
		if (obj.$valid === false && !obj.$valid_disabled)
			arr.push(obj);
	}, path);
	return arr;
};

COM.can = function(path, except) {
	return !COM.dirty(path, except) && COM.valid(path, except);
};

COM.disabled = COM.disable = function(path, except) {
	return COM.dirty(path, except) || !COM.valid(path, except);
};

COM.invalid = function(path, onlyComponent) {
	COM.dirty(path, false, onlyComponent, true);
	COM.valid(path, false, onlyComponent);
	return COM;
};

COM.blocked = function(name, timeout, callback) {
	var key = name;
	var item = MAN.cacheblocked[key];
	var now = Date.now();

	if (item > now)
		return true;

	var local = COM.defaults.localstorage && timeout > 10000;
	MAN.cacheblocked[key] = now + timeout;

	local && localStorage.setItem(COM.$localstorage + '.blocked', JSON.stringify(MAN.cacheblocked));
	callback && callback();
	return false;
};

// who:
// 1. valid
// 2. dirty
// 3. reset
// 4. update
// 5. set
COM.state = function(arr, type, who) {
	if (!arr || !arr.length)
		return;
	setTimeout(function() {
		for (var i = 0, length = arr.length; i < length; i++)
			arr[i].state(type, who);
	}, 2);
	return COM;
};

COM.broadcast = function(selector, name, caller) {
	return BROADCAST(selector, name, caller);
};

COM.default = function(path, timeout, onlyComponent, reset) {

	if (timeout > 0) {
		setTimeout(function() {
			COM.default(path, 0, onlyComponent, reset);
		}, timeout);
		return COM;
	}

	if (typeof(onlyComponent) === 'boolean') {
		reset = onlyComponent;
		onlyComponent = null;
	}

	if (reset === undefined)
		reset = true;

	// Reset scope
	var key = path.replace(/\.\*$/, '');
	var fn = MAN.defaults['#' + HASH(key)];
	fn && MAN.set(key, fn());

	var arr = [];

	COM.each(function(obj) {

		if (obj.disabled)
			return;

		if (obj.state)
			arr.push(obj);

		if (onlyComponent && onlyComponent._id !== obj._id)
			return;

		if (obj.$default && obj.path)
			obj.set(obj.path, obj.$default(), 3);

		if (!reset)
			return;

		obj.element.find(COM_DATA_BIND_SELECTOR).each(function() {
			delete this.$value;
			delete this.$value2;
		});

		if (!obj.$dirty_disabled)
			obj.$dirty = true;

		if (!obj.$valid_disabled) {
			obj.$valid = true;
			obj.$validate = false;
			if (obj.validate) {
				obj.$valid = obj.validate(obj.get());
				obj.$interaction(102);
			}
		}

	}, path);

	COM.$emit('default', path);

	if (!reset)
		return COM;

	MAN.clear('valid', 'dirty');
	COM.state(arr, 3, 3);
	COM.$emit('reset', path);
	return COM;
};

COM.reset = function(path, timeout, onlyComponent) {

	if (timeout > 0) {
		setTimeout(function() {
			COM.reset(path);
		}, timeout);
		return COM;
	}

	var arr = [];

	COM.each(function(obj) {

		if (obj.disabled)
			return;

		if (obj.state)
			arr.push(obj);

		if (onlyComponent && onlyComponent._id !== obj._id)
			return;

		obj.element.find(COM_DATA_BIND_SELECTOR).each(function() {
			delete this.$value;
			delete this.$value2;
		});

		if (!obj.$dirty_disabled) {
			obj.$dirty = true;
			obj.$interaction(101);
		}

		if (!obj.$valid_disabled) {
			obj.$valid = true;
			obj.$validate = false;
			if (obj.validate) {
				obj.$valid = obj.validate(obj.get());
				obj.$interaction(102);
			}
		}

	}, path);

	MAN.clear('valid', 'dirty');
	COM.state(arr, 1, 3);
	COM.$emit('reset', path);
	return COM;
};

COM.findByPath = function(path, callback) {

	var tp = typeof(path);
	if (tp === 'function' || tp === 'boolean') {
		callback = path;
		path = undefined;
	}

	var tc = typeof(callback);
	var isCallback = tc === 'function';
	var isMany = tc === 'boolean';

	var com;

	if (isMany) {
		callback = undefined;
		com = [];
	}

	COM.each(function(component) {

		if (isCallback)
			return callback(component);

		if (!isMany) {
			com = component;
			return true; // stop
		}

		com.push(component);
	}, path);

	return isCallback ? COM : com;
};

COM.findByName = function(name, path, callback) {
	return COM.findByProperty('name', name, path, callback);
};

COM.findById = function(id, path, callback) {
	return COM.findByProperty('id', id, path, callback);
};

COM.findByProperty = function(prop, value, path, callback) {

	var tp = typeof(path);
	if (tp === 'function' || tp === 'boolean') {
		callback = path;
		path = undefined;
	}

	var tc = typeof(callback);
	var isCallback = tc === 'function';
	var isMany = tc === 'boolean';

	var com;

	if (isMany) {
		callback = undefined;
		com = [];
	}

	COM.each(function(component) {

		if (component[prop] !== value)
			return;

		if (isCallback)
			return callback(component);

		if (!isMany) {
			com = component;
			return true; // stop
		}

		com.push(component);
	}, path);

	return isCallback ? COM : com;
};

COM.each = function(fn, path, watch, fix) {
	var isAsterix = path ? path.lastIndexOf('*') !== -1 : false;
	if (isAsterix)
		path = path.replace('.*', '');

	var $path;

	if (!path)
		$path = new Array(0);
	else
		$path = path.split('.');

	var index = 0;
	var is = path ? path.indexOf('[') !== -1 : false;

	for (var i = 0, length = MAN.components.length; i < length; i++) {
		var component = MAN.components[i];

		if (!component || component.$removed || (fix && component.path !== path))
			continue;

		if (path) {
			if (!component.path)
				continue;
			if (isAsterix) {
				var a = $jc_compare($path, component.$$path, 0, path, component.path, is);
				if (!a)
					continue;
			} else {
				if (path !== component.path) {
					if (watch) {
						var a = $jc_compare($path, component.$$path, 2, path, component.path || '', is);
						if (!a)
							continue;
					} else
						continue;
				}
			}
		}

		var stop = fn(component, index++, isAsterix);
		if (stop === true)
			return COM;
	}
	return COM;
};

function $jc_compare(a, b, type, ak, bk, isarray) {

	// type 0 === wildcard
	// type 1 === fix path
	// type 2 === in path

	var key = type + '=' + ak + '=' + bk;
	var r = MAN.temp[key];
	if (r !== undefined)
		return r;

	if (type === 0) {

		for (var i = 0, length = a.length; i < length; i++) {
			if (b[i] === undefined)
				continue;
			if (isarray) {
				if (a[i] !== b[i].raw) {
					MAN.temp[key] = false;
					return false;
				}
			} else {
				if (a[i] !== b[i].path) {
					MAN.temp[key] = false;
					return false;
				}
			}
		}

		MAN.temp[key] = true;
		return true;
	}

	if (type === 1) {
		if (a.length !== b.length)
			return false;
		for (var i = 0, length = b.length; i < length; i++) {
			if (a[i] !== b[i].raw) {
				MAN.temp[key] = false;
				return false;
			}
		}
		MAN.temp[key] = true;
		return true;
	}

	if (type === 2) {
		for (var i = 0, length = a.length; i < length; i++) {
			if (b[i] === undefined)
				continue;
			if (a[i] !== b[i].raw) {
				MAN.temp[key] = false;
				return false;
			}
		}
		MAN.temp[key] = true;
		return true;
	}
}

function COMUSAGE() {
	this.init = 0;
	this.manually = 0;
	this.input = 0;
	this.default = 0;
	this.custom = 0;
	this.dirty = 0;
	this.valid = 0;
}

COMUSAGE.prototype.compare = function(type, dt) {
	if (typeof(dt) === 'string' && dt.substring(0, 1) !== '-')
		dt = new Date().add('-' + dt);
	var val = this[type];
	return val === 0 ? false : val < dt.getTime();
};

COMUSAGE.prototype.convert = function(type) {

	var n = Date.now();
	var output = {};
	var num = 1;

	switch (type.toLowerCase().substring(0, 3)) {
		case 'min':
		case 'mm':
		case 'm':
			num = 60000;
			break;

		case 'hou':
		case 'hh':
		case 'h':
			num = 360000;
			break;

		case 'sec':
		case 'ss':
		case 's':
			num = 1000;
			break;
	}

	output.init = this.init === 0 ? 0 : ((n - this.init) / num) >> 0;
	output.manually = this.manually === 0 ? 0 : ((n - this.manually) / num) >> 0;
	output.input = this.input === 0 ? 0 : ((n - this.input) / num) >> 0;
	output.default = this.default === 0 ? 0 : ((n - this.default) / num) >> 0;
	output.custom = this.custom === 0 ? 0 : ((n - this.custom) / num) >> 0;
	output.dirty = this.dirty === 0 ? 0 : ((n - this.dirty) / num) >> 0;
	output.valid = this.valid === 0 ? 0 : ((n - this.valid) / num) >> 0;
	return output;
};

function COMP(name) {

	this._id = 'component' + (MAN.counter++);
	this.usage = new COMUSAGE();
	this.$dirty = true;
	this.$valid = true;
	this.$validate = false;
	this.$parser = new Array(0);
	this.$formatter = new Array(0);
	this.$skip = false;
	this.$ready = false;
	this.$path;
	this.trim = true;
	this.middleware = ''; // internal

	this.name = name;
	this.path;
	this.type;
	this.id;
	this.disabled = false;
	this.caller;

	this.make;
	this.done;
	this.prerender;
	this.destroy;
	this.state;
	this.dependencies;
	this.validate;

	this.getter = function(value, type, dirty, older, skip) {

		value = this.parser(value);

		if (type === 2)
			this.$skip = true;

		if (type !== 2 || (older !== null && older !== undefined)) {
			COM.validate(this.path);
			return this;
		}

		if (this.trim && typeof(value) === 'string')
			value = value.trim();

		if (value === this.get()) {
			if (dirty)
				COM.validate(this.path);
			return this;
		}

		if (skip)
			this.$skip = false;

		this.set(this.path + this.middleware, value, type);
		return this;
	};

	this.setter = function(value, path, type) {

		var self = this;

		if (type === 2) {
			if (self.$skip) {
				self.$skip = false;
				return self;
			}
		}

		var selector = self.$input === true ? this.element : this.element.find(COM_DATA_BIND_SELECTOR);
		var a = 'select-one'
		value = self.formatter(value);

		selector.each(function() {

			var path = this.$component.path;
			if (path && path.length && path !== self.path)
				return;

			var tmp;

			if (this.type === 'checkbox') {
				tmp = value != null ? value.toString().toLowerCase() : '';
				this.checked = tmp === 'true' || tmp === '1' || tmp === 'on';
				return;
			}

			if (value == null)
				value = '';

			if (!type && this.type !== a) {
				if (!value || (self.$default && self.$default() === value)) {
					// Solved problem with Google Chrome autofill
					tmp = this.value;
					if (tmp)
						return MAN.set(path, self.formatter(tmp));
				}
			}

			if (this.type === a || this.type === 'select')
				return $(this).val(value);

			this.value = value;
		});
	};
}

COMP.prototype.$interaction = function(type) {
	// type === 0 : init
	// type === 1 : manually
	// type === 2 : by input
	// type === 3 : by default
	// type === 100 : custom
	// type === 101 : dirty
	// type === 102 : valid
	var now = Date.now();

	switch (type) {
		case 0:
			this.usage.init = now;
			this.$binded = true;
			break;
		case 1:
			this.usage.manually = now;
			this.$binded = true;
			break;
		case 2:
			this.usage.input = now;
			this.$binded = true;
			break;
		case 3:
			this.usage.default = now;
			this.$binded = true;
			break;
		case 100:
			this.usage.custom = now;
			break;
		case 101:
			this.usage.dirty = now;
			break;
		case 102:
			this.usage.valid = now;
			break;
	}

	return this;
};

COMP.prototype.update = COMP.prototype.refresh = function(notify) {
	var self = this;
	if (notify)
		self.set(self.get());
	else {
		self.setter && self.setter(self.get(), self.path, 1);
		self.$interaction(1);
	}
	return self;
};

COMP.prototype.nested = function(selector, type, value) {
	COM.nested(this.element, selector, type, value);
	return this;
};

COMP.prototype.toggle = function(cls, visible, timeout) {

	var manual = false;

	if (typeof(cls) !== 'string') {
		timeout = visible;
		visible = cls;
		cls = 'hidden';
		manual = true;
	}

	if (typeof(visible) === 'number') {
		timeout = visible;
		visible = undefined;
	} else if (manual && visible !== undefined)
		visible = !visible;

	var el = this.element;
	if (!timeout) {
		el.toggleClass(cls, visible);
		return this;
	}

	setTimeout(function() {
		el.toggleClass(cls, visible);
	}, timeout);
	return this;
};

COMP.prototype.noscope = function(value) {
	this.$noscope = value === undefined ? true : value === true;
	return this;
};

COMP.prototype.singleton = function() {
	var self = this;
	MAN.initializers['$ST_' + self.name] = true;
	return self;
};

COMP.prototype.blind = function() {
	var self = this;
	self.path = null;
	self.$path = null;
	self.$$path = null;
	return self;
};

COMP.prototype.readonly = function() {
	this.noDirty();
	this.noValid();
	this.getter = null;
	this.setter = null;
	this.$parser = null;
	this.$formatter = null;
	return this;
};

COMP.prototype.broadcast = function(selector, name) {

	if (name === undefined) {
		name = selector;
		selector = this.dependencies;
	} else if (selector === '*')
		selector = this;

	return BROADCAST(selector, name, this);
};

COMP.prototype.noValid = COMP.prototype.noValidate = function(val) {
	if (val === undefined)
		val = true;
	this.$valid_disabled = val;
	this.$valid = val;
	return this;
};

COMP.prototype.noDirty = function(val) {
	if (val === undefined)
		val = true;
	this.$dirty_disabled = val;
	this.$dirty = val ? false : true;
	return this;
};

COMP.prototype.setPath = function(path, init) {
	var fixed = null;

	if (path.charCodeAt(0) === 33) {
		path = path.substring(1);
		fixed = path;
	}

	var index = path.indexOf(' #');
	if (index !== -1) {
		this.middleware = path.substring(index);
		path = path.substring(0, index);
	} else
		this.middleware = '';

	this.path = path;
	this.$path = fixed;
	var arr = path.split('.');
	var pre = [];

	for (var i = 0, length = arr.length; i < length; i++) {
		var item = arr[i];
		var raw = item;
		index = item.indexOf('[');
		if (index !== -1)
			item = item.substring(0, index);
		pre.push({ path: item, raw: raw, is: index !== -1 });
	}

	this.$$path = pre;
	!init && MAN.isReady && MAN.refresh();
	return this;
};

COMP.prototype.attr = function(name, value) {
	var el = this.element;
	if (value === undefined)
		return el.attr(name);
	el.attr(name, value);
	return this;
};

COMP.prototype.html = function(value) {
	var el = this.element;
	var current = el.html();
	if (value === undefined)
		return current;
	if (value instanceof Array)
		value = value.join('');
	if (value === current)
		return el;
	el.empty();
	var type = typeof(value);
	if (value || type === 'number' || type === 'boolean')
		el.append(value);
	return el;
};

COMP.prototype.empty = function() {
	var el = this.element;
	el.empty();
	return el;
};

COMP.prototype.append = function(value) {
	var el = this.element;
	if (value instanceof Array)
		value = value.join('');
	if (!value)
		return el;
	return el.append(value);
};

COMP.prototype.find = function(selector) {
	return this.element.find(selector);
};

COMP.prototype.isInvalid = function() {
	var is = !this.$valid;
	if (is && !this.$validate)
		is = !this.$dirty;
	return is;
};

COMP.prototype.watch = function(path, fn, init) {

	var self = this;

	if (typeof(path) === 'function') {
		init = fn;
		fn = path;
		path = self.path;
	}

	self.on('watch', path, fn);

	if (!init)
		return self;

	fn.call(self, path, self.get(path), 0);
	return self;
};

COMP.prototype.invalid = function() {
	return COM.invalid(this.path, this);
};

COMP.prototype.valid = function(value, noEmit) {

	if (value === undefined)
		return this.$valid;

	if (this.$valid_disabled)
		return this;

	this.$valid = value;
	this.$validate = false;
	this.$interaction(102);

	MAN.clear('valid');

	if (noEmit)
		return this;

	if (this.state)
		this.state(1, 1);

	return this;
};

COMP.prototype.style = function(value) {
	STYLE(value);
	return this;
};

COMP.prototype.change = function(value) {
	if (value === undefined)
		value = true;
	COM.change(this.path, value, this);
	return this;
};

COMP.prototype.used = function() {
	return this.$interaction(100);
};

COMP.prototype.dirty = function(value, noEmit) {

	if (value === undefined)
		return this.$dirty;

	if (this.$dirty_disabled)
		return this;

	this.$dirty = value;
	this.$interaction(101);
	MAN.clear('dirty');

	if (noEmit)
		return this;

	if (this.state)
		this.state(2, 2);

	return this;
};

COMP.prototype.reset = function() {
	COM.reset(this.path, 0, this);
	return this;
};

COMP.prototype.setDefault = function(value) {
	this.$default = function() {
		return value;
	};
	return this;
};

COMP.prototype.default = function(reset) {
	COM.default(this.path, 0, this, reset);
	return this;
};

COMP.prototype.remove = function(noClear) {

	this.element.removeData(COM_ATTR);
	this.element.find(COM_ATTR).attr(COM_ATTR_R, 'true');
	this.element.attr(COM_ATTR_R, 'true');

	!noClear && MAN.clear();

	COM.$removed = true;

	if (noClear)
		return true;

	clearTimeout(MAN.tic);
	MAN.tic = setTimeout(function() {
		MAN.cleaner();
	}, 100);
	return true;
};

COMP.prototype.on = function(name, path, fn, init) {

	if (typeof(path) === 'function') {
		init = fn;
		fn = path;
		path = '';
	} else
		path = path.replace('.*', '');

	var fixed = null;
	if (path.charCodeAt(0) === 33) {
		path = path.substring(1);
		fixed = path;
	}

	if (!MAN.events[path]) {
		MAN.events[path] = {};
		MAN.events[path][name] = [];
	} else if (!MAN.events[path][name])
		MAN.events[path][name] = [];

	MAN.events[path][name].push({ fn: fn, context: this, id: this._id, path: fixed });

	if (!init)
		return COM;

	fn.call(COM, path, MAN.get(path));
	return this;
};

COMP.prototype.formatter = function(value) {

	if (typeof(value) === 'function') {
		if (!this.$formatter)
			this.$formatter = [];
		this.$formatter.push(value);
		return this;
	}

	var a = this.$formatter;
	if (a && a.length) {
		for (var i = 0, length = a.length; i < length; i++)
			value = a[i].call(this, this.path, value, this.type);
	}

	a = COM.$formatter;
	if (a && a.length) {
		for (var i = 0, length = a.length; i < length; i++)
			value = a[i].call(this, this.path, value, this.type);
	}

	return value;
};

COMP.prototype.parser = function(value) {

	if (typeof(value) === 'function') {
		if (!this.$parser)
			this.$parser = [];
		this.$parser.push(value);
		return this;
	}
	var a = this.$parser;
	if (a && a.length) {
		for (var i = 0, length = a.length; i < length; i++)
			value = a[i].call(this, this.path, value, this.type);
	}

	a = COM.$parser;
	if (a && a.length) {
		for (var i = 0, length = a.length; i < length; i++)
			value = a[i].call(this, this.path, value, this.type);
	}
	return value;
};

COMP.prototype.emit = function() {
	COM.emit.apply(COM, arguments);
};

COMP.prototype.evaluate = function(path, expression, nopath) {

	if (!expression) {
		expression = path;
		path = this.path;
	}

	return COM.evaluate(path, expression, nopath);
};

COMP.prototype.get = function(path) {
	if (!path)
		path = this.path;
	if (path)
		return MAN.get(path);
};

COMP.prototype.set = function(path, value, type) {

	var self = this;

	if (value === undefined) {
		value = path;
		path = this.path;
	}

	if (path)
		COM.set(path, value, type);

	return self;
};

COMP.prototype.inc = function(path, value, type) {

	var self = this;

	if (value === undefined) {
		value = path;
		path = this.path;
	}

	if (path)
		COM.inc(path, value, type);

	return self;
};

COMP.prototype.extend = function(path, value, type) {

	var self = this;

	if (value === undefined) {
		value = path;
		path = this.path;
	}

	if (path)
		COM.extend(path, value, type);

	return self;
};

COMP.prototype.push = function(path, value, type) {
	var self = this;

	if (value === undefined) {
		value = path;
		path = this.path;
	}

	if (path)
		COM.push(path, value, type, self);

	return self;
};

function component(type, declaration) {
	return COMPONENT(type, declaration);
}

window.COMPONENT_EXTEND = function(type, declaration) {
	if (!MAN.extends[type])
		MAN.extends[type] = [];
	MAN.extends[type].push(declaration);
	MAN.components.forEach(function(m) {
		if (!m.$removed || type === m.name)
			declaration.apply(m, m);
	});
};

window.COMPONENT = function(type, declaration) {

	var shared = {};

	var fn = function(el) {
		var obj = new COMP(type);
		obj.global = shared;
		obj.element = el;
		obj.setPath(el.attr(COM_ATTR_P) || obj._id, true);
		declaration.call(obj);
		return obj;
	};

	MAN.register[type] = fn;
};

function $jc_async(arr, fn, done) {

	var item = arr.shift();
	if (item == null)
		return done && done();

	fn(item, function() {
		$jc_async(arr, fn, done);
	});
}

function CMAN() {
	this.counter = 1;
	this.mcounter = 1;
	this.tic;
	this.tis;
	this.isReady = false;
	this.isCompiling = false;
	this.init = [];
	this.register = {};
	this.cache = {};
	this.storage = {};
	this.cacheblocked = {};
	this.temp = {};
	this.model = {};
	this.components = [];
	this.schemas = {};
	this.toggle = [];
	this.ready = [];
	this.events = {};
	this.timeout;
	this.pending = [];
	this.imports = {};
	this.styles = [];
	this.operations = {};
	this.controllers = {};
	this.initializers = {};
	this.waits = {};
	this.defaults = {};
	this.middleware = {};
	this.others = {};
	this.schedulers = [];
	this.singletons = {};
	this.extends = {};
	// this.mediaquery;
}

MAN.cacherest = function(method, url, params, value, expire) {

	if (params && !params.version && COM.$version)
		params.version = COM.$version;

	if (params && !params.language && COM.$language)
		params.language = COM.$language;

	params = JSON.stringify(params);
	var key = HASH(method + '#' + url.replace(/\//g, '') + params).toString();
	return this.cachestorage(key, value, expire);
};

MAN.cachestorage = function(key, value, expire) {

	var now = Date.now();

	if (value !== undefined) {

		if (typeof(expire) === 'string')
			expire = expire.parseExpire();

		this.storage[key] = { expire: now + expire, value: value };
		$jc_save();
		return value;
	}

	var item = this.storage[key];
	if (item && item.expire > now)
		return item.value;
};

MAN.initialize = function() {
	var item = this.init.pop();

	if (item === undefined) {
		COM.compile();
		return this;
	}

	if (!item.$removed)
		this.prepare(item);

	this.initialize();
	return this;
};

MAN.remap = function(path, value) {
	$MIDDLEWARE(path, value, 1, function(path, value) {
		var index = path.replace('-->', '->').indexOf('->');
		if (index === -1)
			return COM.set(path, value);
		var o = path.substring(0, index).trim();
		var n = path.substring(index + 2).trim();
		COM.set(n, value[o]);
	});
	return this;
};

MAN.prepare = function(obj) {

	if (!obj)
		return this;

	var value = obj.get();
	var el = obj.element;
	var tmp;

	MAN.extends[obj.name] && MAN.extends[obj.name].forEach(function(fn) {
		fn.call(obj, obj);
	});

	if (obj.setter) {
		if (!obj.$prepared) {

			obj.$prepared = true;
			obj.$ready = true;

			tmp = obj.attr(COM_ATTR_V);
			if (tmp) {
				if (!MAN.defaults[tmp])
					MAN.defaults[tmp] = new Function('return ' + tmp);
				obj.$default = MAN.defaults[tmp];
				if (value === undefined) {
					value = obj.$default();
					MAN.set(obj.path, value);
				}
			}

			if (!obj.$binded) {
				obj.$binded = true;
				$MIDDLEWARE(obj.middleware, value, 1, function(path, value) {
					obj.setter(value, obj.path, 0);
					obj.$interaction(0);
				});
			} else
				obj.$interaction(0);
		}
	}

	if (obj.validate && !obj.$valid_disabled)
		obj.$valid = obj.validate(obj.get(), true);

	obj.done && setTimeout(function() {
		obj.done();
	}, 20);

	obj.state && obj.state(0, 3);

	obj.$init && setTimeout(function() {
		if (MAN.isOperation(obj.$init)) {
			var op = OPERATION(obj.$init);
			if (op)
				op.call(obj, obj);
			delete obj.$init;
			return;
		}
		var fn = COM.get(obj.$init);
		if (typeof(fn) === 'function')
			fn.call(obj, obj);
		delete obj.$init;
	}, 5);

	el.trigger('component');
	el.off('component');

	var cls = el.attr(COM_ATTR_C);

	cls && (function(cls) {
		setTimeout(function() {
			cls = cls.split(' ');
			for (var i = 0, length = cls.length; i < length; i++)
				el.toggleClass(cls[i]);
		}, 5);
	})(cls)

	obj.id && COM.emit('#' + obj.id, obj);
	COM.emit('@' + obj.name, obj);
	COM.emit('component', obj);
	return this;
};

MAN.next = function() {
	var next = this.pending.shift();
	if (next === undefined) {
		if (this.isReady)
			this.isCompiling = false;
		return this;
	}
	next();
};

/**
 * Clear cache
 * @param {String} name
 * @return {CMAN}
 */
MAN.clear = function() {

	var self = this;

	if (!arguments.length) {
		self.cache = {};
		return self;
	}

	var arr = Object.keys(self.cache);

	for (var i = 0, length = arr.length; i < length; i++) {
		var key = arr[i];
		var remove = false;

		for (var j = 0; j < arguments.length; j++) {
			if (key.substring(0, arguments[j].length) !== arguments[j])
				continue;
			remove = true;
			break;
		}

		if (remove)
			delete self.cache[key];
	}

	return self;
};

MAN.isArray = function(path) {
	var index = path.lastIndexOf('[');
	if (index === -1)
		return false;
	path = path.substring(index + 1, path.length - 1).substring(0, 1);
	return !(path === '"' || path === '\'');
};

MAN.isOperation = function(name) {
	return name.charCodeAt(0) === 35;
};
/**
 * Get value from a model
 * @param {String} path
 * @return {Object}
 */
MAN.get = function(path, scope) {
	if (path.charCodeAt(0) === 35) {
		var op = OPERATION(path);
		if (op)
			return op;
		return NOOP;
	}

	var cachekey = '=' + path;
	var self = this;
	if (self.temp[cachekey])
		return self.temp[cachekey](scope || window);

	// @TODO: Exception?
	if (path.indexOf('?') !== -1)
		return;

	var arr = path.split('.');
	var builder = [];
	var p = '';

	for (var i = 0, length = arr.length - 1; i < length; i++) {
		var tmp = arr[i];
		var index = tmp.lastIndexOf('[');
		if (index !== -1)
			builder.push('if(!w.' + (p ? p + '.' : '') + tmp.substring(0, index) + ')return');
		p += (p !== '' ? '.' : '') + arr[i];
		builder.push('if(!w.' + p + ')return');
	}

	var fn = (new Function('w', builder.join(';') + ';return w.' + path.replace(/\'/, '\'')));
	self.temp[cachekey] = fn;
	return fn(scope || window);
};

/**
 * Set value to a model
 * @param {String} path
 * @param {Object} value
 */
MAN.set = function(path, value) {

	if (path.charCodeAt(0) === 35) {
		var op = OPERATION(path);
		if (op)
			op(value, path);
		else if (console)
			console.warn('The operation ' + path + ' not found.');
		return self;
	}

	var cachekey = '+' + path;
	var self = this;

	if (self.cache[cachekey])
		return self.cache[cachekey](window, value, path);

	// @TODO: Exception?
	if (path.indexOf('?') !== -1) {
		path = '';
		return self;
	}

	var arr = path.split('.');
	var builder = [];
	var p = '';

	for (var i = 0, length = arr.length; i < length; i++) {
		p += (p !== '' ? '.' : '') + arr[i];
		var type = self.isArray(arr[i]) ? '[]' : '{}';

		if (i !== length - 1) {
			builder.push('if(typeof(w.' + p + ')!=="object"||w.' + p + '===null)w.' + p + '=' + type);
			continue;
		}

		if (type === '{}')
			break;

		p = p.substring(0, p.lastIndexOf('['));
		builder.push('if(!(w.' + p + ' instanceof Array))w.' + p + '=' + type);
		break;
	}

	var fn = (new Function('w', 'a', 'b', builder.join(';') + ';var v=typeof(a) === \'function\' ? a(MAN.get(b)) : a;w.' + path.replace(/\'/, '\'') + '=v;return v'));
	self.cache[cachekey] = fn;
	fn(window, value, path);
	return self;
};

COM.inc = function(path, value, type) {
	var current = COM.get(path);
	if (!current) {
		current = 0;
	} else if (typeof(current) !== 'number') {
		current = parseFloat(current);
		if (isNaN(current))
			current = 0;
	}

	current += value;
	COM.set(path, current, type);
	return self;
};

MAN.refresh = function() {
	var self = this;
	clearTimeout(self.$refresh);
	self.$refresh = setTimeout(function() {
		self.components.sort(function(a, b) {
			if (a.$removed || !a.path)
				return 1;
			if (b.$removed || !b.path)
				return -1;
			var al = a.path.length;
			var bl = b.path.length;
			if (al > bl)
				return -1;
			if (al === bl)
				return a.path.localeCompare(b.path);
			return 1;
		});
	}, 200);
	return self;
};

/**
 * Event cleaner
 * @return {CMAN}
 */
MAN.cleaner = function() {

	var self = this;
	var aks = Object.keys(self.events);
	var is = true;

	for (var a = 0, al = aks.length; a < al; a++) {

		var ak = aks[a];
		if (!self.events[ak])
			continue;

		var bks = Object.keys(self.events[ak]);

		for (var b = 0, bl = bks.length; b < bl; b++) {

			var bk = bks[b];
			var arr = self.events[ak][bk];

			if (!arr)
				continue;

			var index = 0;

			while (true) {

				var item = arr[index++];
				if (item === undefined)
					break;

				if (item.context == null || (item.context.element && item.context.element.closest(document.documentElement).length))
					continue;

				if (item.context && item.context.element)
					item.context.element.remove();

				item.context.$removed = true;
				item.context = null;
				self.events[ak][bk].splice(index - 1, 1);

				if (!self.events[ak][bk].length) {
					delete self.events[ak][bk];
					if (!Object.keys(self.events[ak]).length)
						delete self.events[ak];
				}

				index -= 2;
				is = true;
			}
		}
	}

	var index = 0;
	var length = MAN.components.length;

	while (index < length) {
		var component = MAN.components[index++];

		if (!component) {
			index--;
			MAN.components.splice(index, 1);
			length = MAN.components.length;
			continue;
		}

		if (component.$removed)
			continue;

		if (component.element && component.element.closest(document.documentElement).length) {
			if (!component.attr(COM_ATTR_R)) {
				if (component.$parser && !component.$parser.length)
					delete component.$parser;
				if (component.$formatter && !component.$formatter.length)
					delete component.$formatter;
				continue;
			}
		}

		COM.emit('destroy', component.name, component);

		if (component.destroy)
			component.destroy();

		component.element.off();
		component.element.find('*').off();
		component.element.remove();
		component.element = null;
		component.$removed = true;
		component.path = null;
		component.setter = null;
		component.getter = null;

		index--;
		MAN.components.splice(index, 1);
		length = MAN.components.length;
		is = true;
	}

	MAN.clear('find');

	var now = Date.now();
	var is2 = false;
	var is3 = false;

	for (var key in self.cacheblocked) {
		if (self.cacheblocked[key] > now)
			continue;
		delete self.cacheblocked[key];
		is2 = true;
	}

	if (COM.defaults.localstorage && is2)
		localStorage.setItem(COM.$localstorage + '.blocked', JSON.stringify(self.cacheblocked));

	for (var key in self.storage) {
		var item = self.storage[key];
		if (!item.expire || item.expire <= now) {
			delete self.storage[key];
			is3 = true;
		}
	}

	is3 && $jc_save();
	is && self.refresh();
	return self;
};

MAN.$$ = function() {
	delete MAN.$load;
	if (COM.defaults.localstorage) {
		var cache = localStorage.getItem(COM.$localstorage + '.cache');
		if (cache && typeof(cache) === 'string') {
			try {
				MAN.storage = JSON.parse(cache);
			} catch (e) {}
		}
		cache = localStorage.getItem(COM.$localstorage + '.blocked');
		if (cache && typeof(cache) === 'string') {
			try {
				MAN.cacheblocked = JSON.parse(cache);
			} catch (e) {}
		}
	}
	window.jQuery && setTimeout(COM.compile, 2);
};

/**
 * Default component
 */
COMPONENT('', function() {
	var self = this;
	var type = self.element.get(0).tagName;
	if (type !== 'INPUT' && type !== 'SELECT' && type !== 'TEXTAREA') {
		self.readonly();
		self.setter = function(value) {
			value = self.formatter(value, true);
			self.element.html(value);
		};
	} else {
		var a = 'data-component-bind';
		if (!self.element.attr(a))
			self.element.attr(a, '1');
		if (self.element.attr('required')) {
			self.validate = function(value, is) {
				return is ? true : value ? true : false;
			};
		}
		self.element.$component = self;
	}
});

function $jc_save() {
	COM.defaults.localstorage && localStorage.setItem(COM.$localstorage + '.cache', JSON.stringify(MAN.storage));
}

window.REWRITE = COM.rewrite;

window.SET = function(path, value, timeout, reset) {
	if (typeof(timeout) === 'boolean')
		return COM.set(path, value, timeout);
	if (!timeout)
		return COM.set(path, value, reset);
	setTimeout(function() {
		COM.set(path, value, reset);
	}, timeout);
	return COM;
};

window.INC = function(path, value, timeout, reset) {
	if (typeof(timeout) === 'boolean')
		return COM.inc(path, value, timeout);
	if (!timeout)
		return COM.inc(path, value, reset);
	setTimeout(function() {
		COM.inc(path, value, reset);
	}, timeout);
	return COM;
};

window.EXTEND = function(path, value, timeout, reset) {
	if (typeof(timeout) === 'boolean')
		return COM.extend(path, value, timeout);
	if (!timeout)
		return COM.extend(path, value, reset);
	setTimeout(function() {
		COM.extend(path, value, reset);
	}, timeout);
	return COM;
};

window.PUSH = function(path, value, timeout, reset) {
	if (typeof(timeout) === 'boolean')
		return COM.push(path, value, timeout);
	if (!timeout)
		return COM.push(path, value, reset);
	setTimeout(function() {
		COM.push(path, value, reset);
	}, timeout);
	return COM;
};

window.INVALID = COM.invalid;
window.RESET = COM.reset;

window.DEFAULT = function(path, timeout, reset) {
	return COM.default(path, timeout, null, reset);
};

window.WATCH = function(path, callback, init) {
	return COM.on('watch', path, callback, init);
};

window.PING = function(url, timeout, callback) {

	if (navigator.onLine != null && !navigator.onLine)
		return;

	if (typeof(timeout) === 'function') {
		var tmp = callback;
		callback = timeout;
		timeout = tmp;
	}

	var index = url.indexOf(' ');
	var method = 'GET';

	if (index !== -1) {
		method = url.substring(0, index).toUpperCase();
		url = url.substring(index).trim();
	}

	var options = {};
	var uri = $jc_url(url);
	options.type = method;
	options.headers = { 'X-Ping': location.pathname };

	options.success = function(r) {
		if (typeof(callback) === 'string')
			return MAN.remap(callback, r);
		callback && callback(r);
	};

	options.error = function(req, status, r) {
		status = status + ': ' + r;
		COM.emit('error', r, status, url);
		typeof(callback) === 'function' && callback(undefined, status, url);
	};

	return setInterval(function() {
		$.ajax(uri, options);
	}, timeout || 30000);
};

window.AJAX = COM.AJAX;
window.AJAXCACHE = COM.AJAXCACHE;
window.GET = COM.get;
window.CACHE = COM.cache;
window.NOTIFY = COM.notify;
window.NOTMODIFIED = function(path, value, fields) {

	if (value === undefined)
		value = COM.get(path);

	if (value === undefined)
		value = null;

	if (fields)
		path = path.concat('#', fields);

	var hash = HASH(JSON.stringify(value, fields));
	var key = 'notmodified.' + path;
	if (MAN.cache[key] === hash)
		return true;
	MAN.cache[key] = hash;
	return false;
};

window.SCHEDULE = COM.schedule;
window.FIND = function(value, many, noCache, callback) {

	var isWaiting = false;

	if (typeof(many) === 'function') {
		isWaiting = true;
		callback = many;
		many = undefined;
		// noCache = undefined;
		// noCache can be timeout
	} else if (typeof(noCache) === 'function') {
		var tmp = callback;
		isWaiting = true;
		callback = noCache;
		noCache = tmp;
		// noCache can be timeout
	}

	if (isWaiting) {
		WAIT(function() {
			var val = FIND(value, many, noCache);
			if (val instanceof Array)
				return val.length > 0;
			return val ? true : false;
		}, function(err) {
			// timeout
			if (err)
				return;
			var val = FIND(value, many);
			callback.call(val ? val : window, val);
		}, 500, noCache);
		return;
	}

	// var path;
	// var index = value.indexOf('[');
	// if (index !== -1) {
	// 	path = value.substring(index + 1, value.length - 1);
	// 	value = value.substring(0, index);
	// }

	var key;
	var output;

	if (!noCache) {
		key = 'find.' + value + '.' + (many ? 0 : 1);
		output = MAN.cache[key];
		if (output)
			return output;
	}

	if (value.charCodeAt(0) === 46) {
		output = COM.findByPath(value.substring(1), many);
		if (!noCache)
			MAN.cache[key] = output;
		return output;
	}

	if (value.charCodeAt(0) === 35) {
		output = COM.findById(value.substring(1), undefined, many);
		if (!noCache)
			MAN.cache[key] = output;
		return output;
	}

	output = COM.findByName(value, undefined, many);
	if (!noCache)
		MAN.cache[key] = output;
	return output;
};

window.BROADCAST = function(selector, name, caller) {

	if (typeof(selector) === 'object') {

		if (selector.element)
			selector = selector.element;
		else
			selector = $(selector);

		var components = [];

		selector.find(COM_ATTR).each(function() {
			var com = $(this).data(COM_ATTR);
			com && components.push(com);
		});

		return $BROADCAST_EVAL(components, name, caller);
	}

	var key = 'broadcast=';

	if (typeof(selector) === 'string') {
		key += selector;
		if (MAN.cache[key])
			return $BROADCAST_EVAL(MAN.cache[key], name, caller);
		selector = selector.split(',');
	} else {
		key += selector.join(',');
		if (MAN.cache[key])
			return $BROADCAST_EVAL(MAN.cache[key], name, caller);
	}

	var components = [];

	for (var i = 0, length = selector.length; i < length; i++) {
		var item = selector[i].trim();
		var com = FIND(item, true, true);
		if (!com)
			continue;
		components.push.apply(components, com);
	}

	MAN.cache[key] = components;
	return $BROADCAST_EVAL(components, name, caller);
};

function $BROADCAST_EVAL(components, name, caller) {

	if (!caller)
		caller = null;

	return function() {
		var arg = arguments;
		for (var i = 0, length = components.length; i < length; i++) {
			var component = components[i];
			if (typeof(component[name]) !== 'function')
				continue;
			component.caller = caller;
			component[name].apply(component[name], arg);
			component.caller = null;
		}
	};
}

window.UPDATE = function(path, timeout, reset) {
	if (typeof(timeout) === 'boolean')
		return COM.update(path, timeout);
	if (!timeout)
		return COM.update(path, reset);
	setTimeout(function() {
		COM.update(path, reset);
	}, timeout);
};

window.CHANGE = COM.change;
window.INJECT = window.IMPORT = COM.import;

window.SCHEMA = function(name, declaration) {
	return COM.schema(name, declaration);
};

window.OPERATION = function(name, fn) {
	if (!fn) {
		if (name.charCodeAt(0) === 35)
			return MAN.operations[name.substring(1)];
		return MAN.operations[name];
	}
	MAN.operations[name] = fn;
	return fn;
};

window.ON = function(name, path, fn, init) {
	COM.on(name, path, fn, init);
};

window.EMIT = COM.emit;
window.EVALUATE = COM.evaluate;

window.STYLE = function(value) {
	clearTimeout(MAN.tis);
	MAN.styles.push(value);
	MAN.tis = setTimeout(function() {
		$('<style type="text/css">' + MAN.styles.join('') + '</style>').appendTo('head');
		MAN.styles = [];
	}, 50);
};

window.BLOCKED = function(name, timeout, callback) {
	return COM.blocked(name, timeout, callback);
};

window.HASH = function(s) {
	if (!s)
		return 0;
	if (typeof(s) !== 'string')
		s = JSON.stringify(s);
	var hash = 0, i, char;
	if (!s.length)
		return hash;
	var l = s.length;
	for (i = 0; i < l; i++) {
		char = s.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

window.GUID = function(size) {
	if (!size)
		size = 10;
	var l = ((size / 24) >> 0) + 1;
	var b = [];
	for (var i = 0; i < l; i++)
		b.push(Math.random().toString(36).substring(2));
	return b.join('').substring(0, size);
};

window.KEYPRESS = function(fn, timeout, key) {
	if (!timeout)
		timeout = 300;
	var str = fn.toString();
	var beg = str.length - 20;
	if (beg < 0)
		beg = 0;
	var tkey = key ? key : HASH(str.substring(0, 20) + 'X' + str.substring(beg)) + '_keypress';
	clearTimeout(MAN.waits[tkey]);
	MAN.waits[tkey] = setTimeout(fn, timeout);
};

window.WAIT = function(fn, callback, interval, timeout) {
	var key = ((Math.random() * 10000) >> 0).toString(16);
	var tkey = timeout > 0 ? key + '_timeout' : 0;

	if (typeof(callback) === 'number') {
		var tmp = interval;
		interval = callback;
		callback = tmp;
	}

	var is = typeof(fn) === 'string';
	var run = false;

	if (is) {
		var result = MAN.get(fn);
		if (result)
			run = true;
	} else if (fn())
		run = true;

	if (run) {
		callback(null, function(sleep) {
			setTimeout(function() {
				WATCH(fn, callback, interval, timeout);
			}, sleep || 1);
		});
		return COM;
	}

	if (tkey) {
		MAN.waits[tkey] = setTimeout(function() {
			clearInterval(MAN.waits[key]);
			delete MAN.waits[tkey];
			delete MAN.waits[key];
			callback(new Error('Timeout.'));
		}, timeout);
	}

	MAN.waits[key] = setInterval(function() {

		if (is) {
			var result = MAN.get(fn);
			if (result == null)
				return;
		} else if (!fn())
			return;

		clearInterval(MAN.waits[key]);
		delete MAN.waits[key];

		if (tkey) {
			clearTimeout(MAN.waits[tkey]);
			delete MAN.waits[tkey];
		}

		if (!callback)
			return;

		callback(null, function(sleep) {
			setTimeout(function() {
				WATCH(fn, callback, interval);
			}, sleep || 1);
		});

	}, interval || 500);

	return COM;
};

window.COMPILE = function(timeout) {
	$.components();
	return COM;
};

window.CONTROLLER = function() {
	var callback = arguments[arguments.length - 1];

	if (typeof(callback) !== 'function')
		return MAN.controllers[arguments[0]];

	var obj = {};
	obj.name = obj.path = arguments[0];
	var replacer = function(path) {

		var arg = arguments;
		var is = false;

		path = path.replace(/\{\d+\}/g, function(text) {
			is = true;
			return arg[parseInt(text.substring(1, text.length - 1)) + 1];
		}).replace(/\{\w+\}/g, function(text) {
			is = true;
			return obj[text.substring(1, text.length - 1)];
		});

		if (is)
			return path;
		return obj.path + '.' + path;
	};
	MAN.controllers[obj.name] = obj;
	return obj.$init = function(arg, path, element) {
		delete obj.$init;
		if (path)
			obj.path = path;
		obj.element = element;
		callback.call(obj, replacer, arg);
		return obj;
	};
};

MAN.$load = setTimeout(MAN.$$, 2);

// Waits for jQuery
WAIT(function() {
	return window.jQuery ? true : false;
}, function() {

	setInterval(function() {
		MAN.temp = {};
		MAN.cleaner();
	}, (1000 * 60) * 5);

	// scheduler
	MAN.sc = 0;
	setInterval(function() {
		MAN.sc++;
		for (var i = 0, length = MAN.schedulers.length; i < length; i++) {
			var item = MAN.schedulers[i];

			if (item.type === 'm') {
				if (MAN.sc % 30 !== 0)
					continue;
			} else if (item.type === 'h') {
				// 1800 seconds --> 30 minutes
				// 1800 / 2 (seconds) --> 900
				if (MAN.sc % 900 !== 0)
					continue;
			}

			var dt = new Date().add(item.expire);
			FIND(item.selector, true).forEach(function(component) {
				component && component.usage.compare(item.name, dt) && item.callback(component);
			});
		}
	}, 2000);

	$.fn.component = function() {
		return this.data(COM_ATTR);
	};

	$.fn.components = function(fn) {
		var all = this.find(COM_ATTR);
		var output;
		all.each(function(index) {
			var com = $(this).data(COM_ATTR);
			if (com && com.$ready && !com.$removed) {
				if (fn)
					return fn.call(com, index);
				if (!output)
					output = [];
				output.push(com);
			}
		});
		return fn ? all : output;
	};

	$.components = window.COM || window.jC;

	$(document).ready(function() {

		if (MAN.$load) {
			clearTimeout(MAN.$load);
			MAN.$$();
		}

		$(window).on('resize', $MEDIAQUERY);
		$(window).on('orientationchange', $MEDIAQUERY);
		$MEDIAQUERY();

		$(document).on('input change keypress keydown blur', COM_DATA_BIND_SELECTOR, function(e) {

			var self = this;

			// IE 9+ PROBLEM
			if ((e.type === 'input' && self.type !== 'range') || (e.type === 'keypress'))
				return !(self.tagName !== 'TEXTAREA' && e.keyCode === 13)

			var special = self.type === 'checkbox' || self.type === 'radio' || self.type === 'range';// || self.tagName === 'SELECT';
			if ((e.type === 'focusout' && special) || (e.type === 'change' && (!special && self.tagName !== 'SELECT')) || (!self.$component || self.$component.$removed || !self.$component.getter))
				return;

			// tab, alt, ctrl, shift, capslock
			var code = e.keyCode;
			if (e.metaKey || code === 9 || (code > 15 && code < 21) || (code > 36 && code < 41)) {
				// Paste / Cut
				if (code !== 86 && code !== 88)
					return;
			}

			// Backspace
			if (e.keyCode === 8 && !self.value)
				return;

			if (self.$skip && e.type === 'focusout') {
				$jc_keypress(self, self.$value, e);
				return;
			}

			var old = self.$value;
			var value;

			// cleans old value
			self.$value = null;

			if (self.type === 'checkbox' || self.type === 'radio') {
				if (e.type === 'keydown')
					return;
				var value = self.checked;
				self.$component.dirty(false, true);
				self.$component.getter(value, 2);
				self.$component.$skip = false;
				return;
			}

			if (self.tagName === 'SELECT') {
				if (e.type === 'keydown' || self.selectedIndex === -1)
					return;
				var selected = self[self.selectedIndex];
				value = selected.value;
				var dirty = false;
				if (self.$component.$dirty)
					dirty = true;
				self.$component.dirty(false, true);
				self.$component.getter(value, 2, dirty, old, e.type === 'focusout');
				self.$component.$skip = false;
				return;
			}

			if (self.$delay === undefined)
				self.$delay = parseInt(self.getAttribute('data-component-keypress-delay') || '0');

			if (self.$only === undefined)
				self.$only = self.getAttribute('data-component-keypress-only') === 'true';

			if (self.$only && (e.type === 'focusout' || e.type === 'change'))
				return;

			if (e.type === 'keydown' && (e.keyCode === undefined || e.keyCode === 9))
				return;

			if (e.keyCode < 41 && e.keyCode !== 8 && e.keyCode !== 32) {
				if (e.keyCode !== 13)
					return;
				if (e.tagName !== 'TEXTAREA') {
					self.$value = self.value;
					clearTimeout(self.$timeout);
					$jc_keypress(self, old, e);
					return;
				}
			}

			if (self.$nokeypress === undefined) {
				var v = self.getAttribute('data-component-keypress');
				if (v)
					self.$nokeypress = v === 'false';
				else
					self.$nokeypress = COM.defaults.keypress === false;
			}

			var delay = self.$delay;
			if (self.$nokeypress) {
				if (e.type === 'keydown' || e.type === 'focusout')
					return;
				if (!delay)
					delay = 1;
			} else if (!delay)
				delay = COM.defaults.delay;

			if (e.type === 'focusout')
				delay = 0;

			clearTimeout(self.$timeout);
			self.$timeout = setTimeout(function() {
				$jc_keypress(self, old, e);
			}, delay);
		});

		setTimeout(COM.compile, 2);
	});
}, 100);

function $jc_keypress(self, old, e) {

	if (self.value === old)
		return;

	clearTimeout(self.$timeout);
	self.$timeout = null;

	if (self.value !== self.$value2) {
		var dirty = false;

		if (e.keyCode !== 9) {
			if (self.$component.$dirty)
				dirty = true;
			self.$component.dirty(false, true);
		}

		self.$component.getter(self.value, 2, dirty, old, e.type === 'focusout' || e.keyCode === 13);
		self.value2 = self.value;
	}

	clearTimeout(self.$cleanupmemory);
	self.$cleanupmemory = setTimeout(function() {
		delete self.$value2;
		delete self.$value;
	}, 60000 * 5);
}

Array.prototype.waitFor = function(fn, callback) {

	if (fn.index === undefined)
		fn.index = 0;

	var index = fn.index;
	var self = this;
	var item = self[fn.index++];

	if (!item) {
		callback && callback(fn.value);
		delete fn.value;
		return self;
	}

	fn.call(self, item, function(value) {
		fn.value = value;
		self.waitFor(fn, callback);
	}, index);

	return self;
};

Array.prototype.compare = function(id, b, fields) {
	var a = this;
	var update = [];
	var append = [];
	var remove = [];
	var il = a.length;
	var jl = b.length;

	for (var i = 0; i < il; i++) {
		var aa = a[i];
		var is = false;

		for (var j = 0; j < jl; j++) {
			var bb = b[j];
			if (bb[id] !== aa[id])
				continue;
			if (JSON.stringify(aa, fields) !== JSON.stringify(bb, fields))
				update.push({ oldIndex: i, newIndex: j, oldItem: aa, newItem: bb });
			is = true;
			break;
		}

		!is && remove.push({ oldIndex: i, newIndex: j, oldItem: aa, newItem: bb });
	}

	for (var i = 0; i < jl; i++) {
		var aa = b[i];
		var is = true;

		for (var j = 0; j < il; j++) {
			var bb = a[j];
			if (bb[id] === aa[id]) {
				is = false;
				break;
			}
		}

		if (!is)
			continue;
		append.push({ oldIndex: null, newIndex: i, oldItem: null, newItem: aa });
	}

	var pr = (remove.length / il) * 100;
	var pu = (update.length / il) * 100;

	var redraw = pr > 60 || pu > 60;
	return {
		change: append.length || remove.length || update.length ? true : false,
		redraw: redraw,
		append: append,
		remove: remove,
		update: update
	};
};

Array.prototype.async = function(context, callback) {

	if (typeof(context) === 'function') {
		var tmp = callback;
		callback = context;
		context = tmp;
	}

	if (!context)
		context = {};

	var arr = this;
	var index = 0;

	var c = function() {
		var fn = arr[index++];
		if (!fn)
			return callback && callback.call(context);
		fn.call(context, c, index - 1);
	};

	c();
	return this;
};

Array.prototype.take = function(count) {
	var arr = [];
	var self = this;
	var length = self.length;
	for (var i = 0; i < length; i++) {
		arr.push(self[i]);
		if (arr.length >= count)
			return arr;
	}
	return arr;
};

Array.prototype.skip = function(count) {
	var arr = [];
	var self = this;
	var length = self.length;
	for (var i = 0; i < length; i++) {
		if (i >= count)
			arr.push(self[i]);
	}
	return arr;
};

String.prototype.parseExpire = function() {

	var str = this.split(' ');
	var number = parseInt(str[0]);

	if (isNaN(number))
		return 0;

	switch (str[1].trim().replace(/\./g, '')) {
		case 'minutes':
		case 'minute':
		case 'min':
		case 'mm':
		case 'm':
			return 60000 * number;
		case 'hours':
		case 'hour':
		case 'HH':
		case 'hh':
		case 'h':
		case 'H':
			return (60000 * 60) * number;
		case 'seconds':
		case 'second':
		case 'sec':
		case 'ss':
		case 's':
			return 1000 * number;
		case 'days':
		case 'day':
		case 'DD':
		case 'dd':
		case 'd':
			return (60000 * 60 * 24) * number;
		case 'months':
		case 'month':
		case 'MM':
		case 'M':
			return (60000 * 60 * 24 * 28) * number;
		case 'weeks':
		case 'week':
		case 'W':
		case 'w':
			return (60000 * 60 * 24 * 7) * number;
		case 'years':
		case 'year':
		case 'yyyy':
		case 'yy':
		case 'y':
			return (60000 * 60 * 24 * 365) * number;
		default:
			return 0;
	}
};

String.prototype.removeDiacritics = function() {
	var buf = '';
	for (var i = 0, length = this.length; i < length; i++) {
		var c = this[i];
		var code = c.charCodeAt(0);
		var isUpper = false;

		var r = COM_DIACRITICS[code];

		if (r === undefined) {
			code = c.toLowerCase().charCodeAt(0);
			r = COM_DIACRITICS[code];
			isUpper = true;
		}

		if (r === undefined) {
			buf += c;
			continue;
		}

		c = r;
		if (isUpper)
			c = c.toUpperCase();
		buf += c;
	}
	return buf;
};

String.prototype.slug = function(max) {
	max = max || 60;

	var self = this.trim().toLowerCase().removeDiacritics();
	var builder = '';
	var length = self.length;

	for (var i = 0; i < length; i++) {
		var c = self.substring(i, i + 1);
		var code = self.charCodeAt(i);

		if (builder.length >= max)
			break;

		if (code > 31 && code < 48) {
			if (builder.substring(builder.length - 1, builder.length) !== '-')
				builder += '-';
			continue;
		}

		if (code > 47 && code < 58) {
			builder += c;
			continue;
		}

		if (code > 94 && code < 123) {
			builder += c;
			continue;
		}
	}
	var l = builder.length - 1;
	if (builder[l] === '-')
		return builder.substring(0, l);
	return builder;
};

String.prototype.isEmail = function() {
	var str = this;
	var r = /^[a-zA-Z0-9-_.+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
	return str.length <= 4 ? false : r.test(str);
};

String.prototype.isPhone = function() {
	var str = this;
	var r = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
	return str.length < 6 ? false : r.test(str);
};

String.prototype.isURL = function() {
	var str = this;
	var r = /^(http|https):\/\/(?:(?:(?:[\w\.\-\+!$&'\(\)*\+,;=]|%[0-9a-f]{2})+:)*(?:[\w\.\-\+%!$&'\(\)*\+,;=]|%[0-9a-f]{2})+@)?(?:(?:[a-z0-9\-\.]|%[0-9a-f]{2})+|(?:\[(?:[0-9a-f]{0,4}:)*(?:[0-9a-f]{0,4})\]))(?::[0-9]+)?(?:[\/|\?](?:[\w#!:\.\?\+=&@!$'~*,;\/\(\)\[\]\-]|%[0-9a-f]{2})*)?$/i;
	return str.length <= 7 ? false : r.test(str);
};

String.prototype.parseInt = function(def) {
	var str = this.trim();
	var val = str.match(/(\-|\+)?[0-9]+/);
	if (!val)
		return def || 0;
	val = +val[0];
	return isNaN(val) ? def || 0 : val;
};

String.prototype.parseFloat = function(def) {
	var str = this.trim();
	var val = str.match(/(\-|\+)?[0-9\.\,]+/);
	if (!val)
		return def || 0;
	val = val[0];
	if (val.indexOf(',') !== -1)
		val = val.replace(',', '.');
	val = +val;
	return isNaN(val) ? def || 0 : val;
};

Array.prototype.trim = function() {
	var self = this;
	var output = [];
	for (var i = 0, length = self.length; i < length; i++) {
		if (typeof(self[i]) === 'string')
			self[i] = self[i].trim();
		if (self[i])
			output.push(self[i]);
	}
	return output;
};

Array.prototype.findIndex = function(cb, value) {

	var self = this;
	var isFN = typeof(cb) === 'function';
	var isV = value !== undefined;

	for (var i = 0, length = self.length; i < length; i++) {
		if (isFN) {
			if (cb.call(self, self[i], i))
				return i;
			continue;
		}
		if (isV) {
			if (self[i][cb] === value)
				return i;
			continue;
		}
		if (self[i] === cb)
			return i;
	}
	return -1;
};

Array.prototype.findItem = function(cb, value) {
	var index = this.findIndex(cb, value);
	if (index === -1)
		return;
	return this[index];
};

Array.prototype.remove = function(cb, value) {

	var self = this;
	var arr = [];
	var isFN = typeof(cb) === 'function';
	var isV = value !== undefined;

	for (var i = 0, length = self.length; i < length; i++) {

		if (isFN) {
			if (!cb.call(self, self[i], i))
				arr.push(self[i]);
			continue;
		}

		if (isV) {
			if (self[i][cb] !== value)
				arr.push(self[i]);
			continue;
		}

		if (self[i] !== cb)
			arr.push(self[i]);
	}
	return arr;
};

Date.prototype.add = function(type, value) {

	if (value === undefined) {
		var arr = type.split(' ');
		type = arr[1];
		value = parseInt(arr[0]);
	}

	var self = this;
	var dt = new Date(self.getTime());

	switch(type.substring(0, 3)) {
		case 's':
		case 'ss':
		case 'sec':
			dt.setSeconds(dt.getSeconds() + value);
			return dt;
		case 'm':
		case 'mm':
		case 'min':
			dt.setMinutes(dt.getMinutes() + value);
			return dt;
		case 'h':
		case 'hh':
		case 'hou':
			dt.setHours(dt.getHours() + value);
			return dt;
		case 'd':
		case 'dd':
		case 'day':
			dt.setDate(dt.getDate() + value);
			return dt;
		case 'w':
		case 'ww':
		case 'wee':
			dt.setDate(dt.getDate() + (value * 7));
			return dt;
		case 'M':
		case 'MM':
		case 'mon':
			dt.setMonth(dt.getMonth() + value);
			return dt;
		case 'y':
		case 'yy':
		case 'yyy':
		case 'yea':
			dt.setFullYear(dt.getFullYear() + value);
			return dt;
	}
	return dt;
};

Date.prototype.format = function(t) {
	var e = this, r = !1;
	if (t && 33 === t.charCodeAt(0) && (r = !0, t = t.substring(1)), void 0 === t || null === t || '' === t) return e.getFullYear() + '-' + (e.getMonth() + 1).toString().padLeft(2, '0') + '-' + e.getDate().toString().padLeft(2, '0') + 'T' + e.getHours().toString().padLeft(2, '0') + ':' + e.getMinutes().toString().padLeft(2, '0') + ':' + e.getSeconds().toString().padLeft(2, '0') + '.' + e.getMilliseconds().padLeft(3, '0').toString() + 'Z';
	var n = e.getHours();
	return r && n >= 12 && (n -= 12), t.replace(/yyyy|yy|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s|a|ww|w/g, function(t) {
		switch (t) {
			case 'yyyy':
				return e.getFullYear();
			case 'yy':
				return e.getYear().toString().substring(1);
			case 'MM':
				return (e.getMonth() + 1).toString().padLeft(2, '0');
			case 'M':
				return e.getMonth() + 1;
			case 'dd':
				return e.getDate().toString().padLeft(2, '0');
			case 'd':
				return e.getDate();
			case 'HH':
			case 'hh':
				return n.toString().padLeft(2, '0');
			case 'H':
			case 'h':
				return e.getHours();
			case 'mm':
				return e.getMinutes().toString().padLeft(2, '0');
			case 'm':
				return e.getMinutes();
			case 'ss':
				return e.getSeconds().toString().padLeft(2, '0');
			case 's':
				return e.getSeconds();
			case 'w':
			case 'ww':
				var tmp = new Date(+e);
				tmp.setHours(0, 0, 0);
				tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
				tmp = Math.ceil((((tmp - new Date(tmp.getFullYear(), 0, 1)) / 8.64e7) + 1) / 7);
				if (key === 'ww')
					return tmp.toString().padLeft(2, '0');
				return tmp;
			case 'a':
				var r = 'AM';
				return e.getHours() >= 12 && (r = 'PM'), r
		}
	});
};

Number.prototype.pluralize = function(zero, one, few, other) {

	var num = this;
	var value = '';

	if (num == 0)
		value = zero || '';
	else if (num == 1)
		value = one || '';
	else if (num > 1 && num < 5)
		value = few || '';
	else
		value = other;

	var beg = value.indexOf('#');
	if (beg === -1)
		return value;

	return value.replace(/\#{1,}/g, function(text) {
		if (text === '##')
			return num.format();
		return num.toString();
	});
};

Number.prototype.format = function(decimals, separator, separatorDecimal) {
	var self = this;
	var num = self.toString();
	var dec = '';
	var output = '';
	var minus = num.substring(0, 1) === '-' ? '-' : '';
	if (minus)
		num = num.substring(1);

	var index = num.indexOf('.');

	if (typeof(decimals) === 'string') {
		var tmp = separator;
		separator = decimals;
		decimals = tmp;
	}

	if (separator === undefined)
		separator = ' ';

	if (index !== -1) {
		dec = num.substring(index + 1);
		num = num.substring(0, index);
	}

	index = -1;
	for (var i = num.length - 1; i >= 0; i--) {
		index++;
		if (index > 0 && index % 3 === 0)
			output = separator + output;
		output = num[i] + output;
	}

	if (decimals || dec.length) {
		if (dec.length > decimals)
			dec = dec.substring(0, decimals || 0);
		else
			dec = dec.padRight(decimals || 0, '0');
	}

	if (dec.length && separatorDecimal === undefined)
		separatorDecimal = separator === '.' ? ',' : '.';

	return minus + output + (dec.length ? separatorDecimal + dec : '');
};

String.prototype.padLeft = function(t, e) {
	var r = this.toString();
	return Array(Math.max(0, t - r.length + 1)).join(e || ' ') + r;
};

String.prototype.padRight = function(t, e) {
	var r = this.toString();
	return r + Array(Math.max(0, t - r.length + 1)).join(e || ' ');
};

Number.prototype.padLeft = function(t, e) {
	return this.toString().padLeft(t, e || '0');
};

Number.prototype.padRight = function(t, e) {
	return this.toString().padRight(t, e || '0');
};

String.prototype.format = function() {
	var arg = arguments;
	return this.replace(/\{\d+\}/g, function(text) {
		var value = arg[+text.substring(1, text.length - 1)];
		if (value == null)
			value = '';
		return value;
	});
};

String.prototype.parseDate = function() {
	var self = this.trim();
	if (!self)
		return null;

	var lc = self.charCodeAt(self.length - 1);

	// Classic date
	if (lc === 41)
		return new Date(self);

	// JSON format
	if (lc === 90)
		return new Date(Date.parse(self));

	var arr = self.indexOf(' ') === -1 ? self.split('T') : self.split(' ');
	var index = arr[0].indexOf(':');
	var length = arr[0].length;

	if (index !== -1) {
		var tmp = arr[1];
		arr[1] = arr[0];
		arr[0] = tmp;
	}

	if (arr[0] === undefined)
		arr[0] = '';

	var noTime = arr[1] === undefined ? true : arr[1].length === 0;

	for (var i = 0; i < length; i++) {
		var c = arr[0].charCodeAt(i);
		if (c > 47 && c < 58)
			continue;
		if (c === 45 || c === 46)
			continue;
		if (noTime)
			return new Date(self);
	}

	if (arr[1] === undefined)
		arr[1] = '00:00:00';

	var firstDay = arr[0].indexOf('-') === -1;

	var date = (arr[0] || '').split(firstDay ? '.' : '-');
	var time = (arr[1] || '').split(':');
	var parsed = [];

	if (date.length < 4 && time.length < 2)
		return new Date(self);

	index = (time[2] || '').indexOf('.');

	// milliseconds
	if (index !== -1) {
		time[3] = time[2].substring(index + 1);
		time[2] = time[2].substring(0, index);
	} else
		time[3] = '0';

	parsed.push(+date[firstDay ? 2 : 0]); // year
	parsed.push(+date[1]); // month
	parsed.push(+date[firstDay ? 0 : 2]); // day
	parsed.push(+time[0]); // hours
	parsed.push(+time[1]); // minutes
	parsed.push(+time[2]); // seconds
	parsed.push(+time[3]); // miliseconds

	var def = new Date();

	for (var i = 0, length = parsed.length; i < length; i++) {
		if (isNaN(parsed[i]))
			parsed[i] = 0;

		var value = parsed[i];
		if (value !== 0)
			continue;

		switch (i) {
			case 0:
				if (value <= 0)
					parsed[i] = def.getFullYear();
				break;
			case 1:
				if (value <= 0)
					parsed[i] = def.getMonth() + 1;
				break;
			case 2:
				if (value <= 0)
					parsed[i] = def.getDate();
				break;
		}
	}

	return new Date(parsed[0], parsed[1] - 1, parsed[2], parsed[3], parsed[4], parsed[5]);
};

Array.prototype.attr = function(name, value) {

	if (arguments.length === 2) {
		if (value == null)
			return this;
	} else if (value === undefined)
		value = name.toString();

	this.push(name + '="' + value.toString().replace(/[<>&"]/g, function(c) {
		switch (c) {
			case '&': return '&amp;'
			case '<': return '&lt;'
			case '>': return '&gt;'
			case '"': return '&quot;'
		}
		return c;
	}) + '"');

	return this;
};

Array.prototype.scalar = function(type, key, def) {

	var output = def;
	var isDate = false;
	var isAvg = type === 'avg' || type === 'average';
	var isDistinct = type === 'distinct';

	for (var i = 0, length = this.length; i < length; i++) {
		var val = key ? this[i][key] : this[i];

		if (typeof(val) === 'string')
			val = val.parseFloat();

		if (val instanceof Date) {
			isDate = true;
			val = val.getTime();
		}

		if (isDistinct) {
			if (!output)
				output = [];
			if (output.indexOf(val) === -1)
				output.push(val);
			continue;
		}

		if (type === 'median') {
			if (!output)
				output = [];
			output.push(val);
			continue;
		}

		if (type === 'sum' || isAvg) {
			if (!output)
				output = val;
			else
				output += val;
			continue;
		}

		if (type !== 'range') {
			if (!output)
				output = val;
		} else {
			if (!output) {
				output = new Array(2);
				output[0] = val;
				output[1] = val;
			}
		}

		switch (type) {
			case 'range':
				output[0] = Math.min(output[0], val);
				output[1] = Math.max(output[1], val);
				break;
			case 'min':
				output = Math.min(output, val);
				break;
			case 'max':
				output = Math.max(output, val);
				break;
		}
	}

	if (isDistinct)
		return output;

	if (isAvg) {
		output = output / this.length;
		return isDate ? new Date(output) : output;
	}

	if (type === 'median') {
		output.sort(function(a, b) {
			return a - b;
		});
		var half = Math.floor(output.length / 2);
		output = output.length % 2 ? output[half] : (output[half - 1] + output[half]) / 2.0;
	}

	if (isDate) {
		if (typeof(output) === 'number')
			return new Date(output);
		output[0] = new Date(output[0]);
		output[1] = new Date(output[1]);
	}

	return output;
};

window.WIDTH = function(el) {
	if (!el)
		el = $(window);
	var w = el.width();
	var d = COM.defaults.devices;
	return w >= d.md.min && w <= d.md.max ? 'md' : w >= d.sm.min && w <= d.sm.max ? 'sm' : w > d.lg.min ? 'lg' : w <= d.xs.max ? 'xs' : '';
};

window.WORKFLOW = function(name, fn) {

	if (!fn) {
		if (!MAN.workflows)
			return NOOP;
		var w = MAN.workflows[name];
		if (!(w instanceof Array))
			return NOOP;
		return function() {
			for (var i = 0, length = w.length; i < length; i++)
				w[i].apply(this, arguments);
		};
	}

	if (!MAN.workflows)
		MAN.workflows = {};

	var w = MAN.workflows[name];
	if (w)
		w.push(fn);
	else
		MAN.workflows[name] = [fn];
};

window.MEDIAQUERY = function(query, element, fn) {

	if (typeof(query) === 'number') {
		MAN.mediaquery.remove('id', query);
		return true;
	}

	if (typeof(element) === 'function') {
		fn = element;
		element = null;
	}

	if (!MAN.mediaquery)
		MAN.mediaquery = [];

	query = query.toLowerCase();
	var type;

	if (query.indexOf(',') !== -1) {
		var ids = [];
		query.split(',').forEach(function(q) {
			q = q.trim();
			q && ids.push(window.MEDIAQUERY(q, element, fn));
		});
		return ids;
	}

	var d = COM.defaults.devices;

	if (query === 'md')
		query = 'min-width:{0}px and max-width:{1}px'.format(d.md.min, d.md.max);
	else if (query === 'lg')
		query = 'min-width:{0}px'.format(d.lg.min);
	else if (query === 'xs')
		query = 'max-width:{0}px'.format(d.xs.max);
	else if (query === 'sm')
		query = 'min-width:{0}px and max-width:{1}px'.format(d.sm.min, d.sm.max);

	var arr = query.match(/(max-width|min-width|max-device-width|min-device-width|max-height|min-height|max-device-height|height|width):(\s)\d+(px|em|in)?/gi);
	var obj = {};

	var num = function(val) {
		var n = parseInt(val.match(/\d+/), 10);
		return val.match(/\d+(em)/) ? n * 16 : val.match(/\d+(in)/) ? (n * 0.010416667) >> 0 : n;
	};

	if (arr) {
		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			var index = item.indexOf(':');
			switch (item.substring(0, index).toLowerCase().trim()) {
				case 'min-width':
				case 'min-device-width':
				case 'width':
					obj.minW = num(item);
					break;
				case 'max-width':
				case 'max-device-width':
				case 'width':
					obj.maxW = num(item);
					break;
				case 'min-height':
				case 'min-device-height':
				case 'height':
					obj.minH = num(item);
					break;
				case 'max-height':
				case 'max-device-height':
				case 'height':
					obj.maxH = num(item);
					break;
			}
		}
	}

	arr = query.match(/orientation:(\s)(landscape|portrait)/gi);
	if (arr) {
		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.toLowerCase().indexOf('portrait') !== -1)
				obj.orientation = 'portrait';
			else
				obj.orientation = 'landscape';
		}
	}

	obj.id = MAN.mcounter++;
	obj.fn = fn;
	obj.type = type;

	if (element)
		obj.element = element;

	MAN.mediaquery.push(obj);
	return obj.id;
}

function $MEDIAQUERY() {

	if (!MAN.mediaquery || !MAN.mediaquery.length)
		return;

	var orientation = window.orientation ? Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait' : '';

	var $w = $(window);
	var w = $w.width();
	var h = $w.height();
	var d = COM.defaults.devices;

	for (var i = 0, length = MAN.mediaquery.length; i < length; i++) {
		var mq = MAN.mediaquery[i];
		var cw = w;
		var ch = h;

		if (mq.element) {
			cw = mq.element.width();
			ch = mq.element.height();
		}

		if (mq.orientation) {
			if (!orientation && mq.orientation !== 'portrait')
				continue;
			else if (orientation !== mq.orientation)
				continue;
		}

		if (mq.minW && mq.minW >= cw)
			continue;
		if (mq.maxW && mq.maxW <= cw)
			continue;
		if (mq.minH && mq.minH >= ch)
			continue;
		if (mq.maxH && mq.maxH <= ch)
			continue;

		if (mq.oldW === cw && mq.oldH !== ch) {
			// changed height
			if (!mq.maxH && !mq.minH)
				continue;
		}

		if (mq.oldH === ch && mq.oldW !== cw) {
			// changed width
			if (!mq.maxW && !mq.minW)
				continue;
		}

		if (mq.oldW === cw && mq.oldH === ch)
			continue;

		var type;

		if (cw >= d.md.min && cw <= d.md.max)
			type = 'md';
		else if (cw >= d.sm.min && cw <= d.sm.max)
			type = 'sm';
		else if (cw > d.lg.min)
			type = 'lg';
		else if (cw <= d.xs.max)
			type = 'xs';

		mq.oldW = cw;
		mq.oldH = ch;
		mq.fn(cw, ch, type, mq.id);
	}
};

function $MIDDLEWARE(path, value, type, callback) {

	var index = path.indexOf(' #');

	if (index === -1) {
		callback(path, value);
		return path;
	}

	var a = path.substring(0, index);
	if (value === undefined)
		value = COM.get(a);

	MIDDLEWARE(path.substring(index + 1).trim().replace(/\#/g, '').split(' '), value, function(value) {
		callback(a, value);
	}, a);

	return a;
}

window.UPLOAD = function(url, data, callback, timeout, progress, error) {
	return COM.UPLOAD(url, data, callback, timeout, progress, error);
};

window.MIDDLEWARE = function(name, value, callback, path) {

	if (!(name instanceof Array)) {
		MAN.middleware[name] = value;
		return;
	}

	if (typeof(callback) !== 'function') {
		var tmp = callback;
		callback = value;
		value = tmp;
	}

	var context = {};
	name.waitFor(function(name, next) {
		var mid = MAN.middleware[name];

		if (!mid) {
			console.warn('Middleware "' + name + '" not found.');
			next();
			return;
		}

		mid.call(context, next, value, path);
	}, function(val) {
		if (callback)
			callback.call(context, val !== undefined ? val : value, path);
	});
};

window.FN = function(exp) {
	var index = exp.indexOf('=>');
	var arg = exp.substring(0, index).trim();
	var val = exp.substring(index + 2).trim();
	var is = false;

	arg = arg.replace(/\(|\)|\s/g, '').trim();
	if (arg)
		arg = arg.split(',');

	if (val.charCodeAt(0) === 123) {
		is = true;
		val = val.substring(1, val.length - 1).trim();
	}

	var output = (is ? '' : 'return ') + val;
	switch (arg.length) {
		case 1:
			return new Function(arg[0], output);
		case 2:
			return new Function(arg[0], arg[1], output);
		case 3:
			return new Function(arg[0], arg[1], arg[2], output);
		case 4:
			return new Function(arg[0], arg[1], arg[2], arg[3], output);
		case 0:
		default:
			return new Function(output);
	}
};

window.SETTER = function(selector, name) {
	var w = window;
	var arg = [];

	for (var i = 2; i < arguments.length; i++)
		arg.push(arguments[i]);

	FIND(selector, true).forEach(function(o) {
		if (typeof(o[name]) === 'function')
			o[name].apply(o, arg);
		else
			o[name] = arg[0];
	});

	return w.SETTER;
};

window.EXEC = function(path) {
	var w = window;
	var arg = [];

	for (var i = 1; i < arguments.length; i++)
		arg.push(arguments[i]);

	var fn = GET(path);
	if (typeof(fn) === 'function')
		fn.apply(w, arg);

	return w.EXEC;
};

window.MAKE = function(fn) {
	var obj = {};
	fn.call(obj, obj);
	return obj;
};

window.NOOP = function(){};