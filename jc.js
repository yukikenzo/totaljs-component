(function() {

	// Constants
	var REGCOM = /(data--|data---|data-jc|data-import|-bind|bind)=|COMPONENT\(/;
	var REGSCRIPT = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
	var REGCSS = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
	var REGENV = /(\[.*?\])/gi;
	var REGPARAMS = /\{{1,2}[a-z0-9_.-\s]+\}{1,2}/gi;
	var REGEMPTY = /\s/g;
	var REGCOMMA = /,/g;
	var REGSEARCH = /[^a-zA-Zá-žÁ-Žа-яА-Я\d\s:]/g;
	var REGFNPLUGIN = /[a-z0-9_-]+\/[a-z0-9_]+\(|(^|(?=[^a-z0-9]))@[a-z0-9-_]+\./i;
	var REGMETA = /_{2,}/;
	var REGBINDERCOMPARE = /^[^a-z0-9.]/;
	var REGWILDCARD = /\.\*/;
	var REGISARR = /\[\d+\]$/;
	var REGSCOPEINLINE = /\?/g;
	var REGSCOPECHECK = /\?\/|\?\./;
	var REGSCOPEREPLACE = /\?\//g;
	var T_COM = '---';
	var T_DATA = 'data-';
	var ATTRCOM = '[data-jc],[data--],[data' + T_COM + ']';
	var ATTRBIND = '[data-bind],[bind],[data-vbind]';
	var ATTRJCBIND = 'data-jc-bind';
	var ATTRDATA = 'jc';
	var ATTRDEL = T_DATA + 'jc-removed';
	var SELINPUT = 'input,textarea,select';
	var DIACRITICS = { 225:'a',228:'a',269:'c',271:'d',233:'e',283:'e',357:'t',382:'z',250:'u',367:'u',252:'u',369:'u',237:'i',239:'i',244:'o',243:'o',246:'o',353:'s',318:'l',314:'l',253:'y',255:'y',263:'c',345:'r',341:'r',328:'n',337:'o' };
	var ACTRLS = { INPUT: true, TEXTAREA: true, SELECT: true };
	var DEFMODEL = { value: null };
	var MULTIPLE = ' + ';
	var SCOPENAME = 'scope';
	var ATTRSCOPE2 = T_DATA + '' + SCOPENAME;
	var ATTRREL2 = T_DATA + 'released';
	var TYPE_FN = 'function';
	var TYPE_S = 'string';
	var TYPE_N = 'number';
	var TYPE_O = 'object';
	var TYPE_B = 'boolean';
	var TYPE_NULL = 'null';
	var KEY_ENV = 'environment';
	var REG_DATE = /\.|-|\/|\\|:|\s/g;
	var REG_TIME = /am|pm/i;
	var T_BODY = 'BODY';
	var T_DISABLED = 'disabled';
	var T_HIDDEN = 'hidden';
	var T_WIDTH = 'width';
	var T_HEIGHT = 'height';
	var T_CHECKED = 'checked';
	var T_VALUE = 'value';
	var T_RESIZE = 'resize';
	var T_FALSE = 'false';
	var T_TRUE = 'true';
	var T_RESPONSE = 'response';
	var T_VALID = 'valid';
	var T_DIRTY = 'dirty';
	var T_BIND = 'bind';
	var T_TEMPLATE = 'template';
	var T_VBINDARR = 'vbindarray';
	var T_SCRIPT = 'script';
	var T_PATHS = 'PATHS';
	var T_CLASS = 'class';
	var T_HTML = 'html';
	var T_CONFIG = 'config';
	var T_COMPILED = 'jc-compile';
	var T_IMPORT = 'import';
	var T_TMP = 'jctmp.';
	var T_UNKNOWN = 'UNKNOWN';
	var T_CLICK = 'click';
	var ERRCONN = 'ERR_CONNECTION_CLOSED';
	var OK = Object.keys;

	// No scrollbar
	var cssnoscrollbar = {};
	var clsnoscrollbar = 'noscrollbar';
	var selnoscrollbar = '.' + clsnoscrollbar;

	var LCOMPARER = window.Intl ? window.Intl.Collator().compare : function(a, b) {
		return a.localeCompare(b);
	};

	var C = {}; // COMPILER
	var M = {}; // MAIN
	var W = window;
	var LS = W.localStorage;
	var PREF = {};
	var PREFBLACKLIST = { set: 1, get: 1, save: 1, load: 1, keys: 1 };
	var PREFLOADED = 0;

	var warn = W.WARN = function() {
		W.console && W.console.warn.apply(W.console, arguments);
	};

	W.HIDDEN = function(el) {

		if (el == null)
			return true;

		if (el instanceof jQuery)
			el = el[0];

		if (el.parentNode && el.parentNode.tagName === T_BODY)
			return false;

		if (W.isIE)
			return !el.offsetWidth && !el.offsetHeight;
		else
			return !el.offsetParent;
	};

	var prefsave = function() {
		var keys = Object.keys(PREF);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var item = PREF[key];
			if (item && item.expire > NOW)
				PREF[key] = item;
			else
				delete PREF[key];
		}
		W.PREF.save(PREF);
	};

	var prefload = function(data) {

		if (typeof(data) === TYPE_S)
			data = PARSE(data);

		if (data) {
			var keys = Object.keys(data);
			var remove = false;
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var item = data[key];
				if (item && item.expire > NOW) {
					PREF[key] = item;
					if (!PREFBLACKLIST[key])
						W.PREF[key] = item.value;
				} else
					remove = true;
			}

			PREF.PATHS && OK(PREF.PATHS).forEach(function(key) {
				M.set(key, PREF.PATHS[key], true);
			});

			remove && setTimeout2('PREF', W.PREF.save, 1000, null, PREF);
		}
		M.loaded = true;
		PREFLOADED = 1;
		for (var i = 0; i < plugininit.length; i++) {
			var tmp = plugininit[i];
			W.PLUGIN(tmp.name, tmp.fn);
		}
		compile();
	};

	var PR = W.PREF = {};

	PR.get = function(key, expire) {
		var tmp = PREF[key];
		var val = tmp && tmp.expire > NOW ? tmp.value : undefined;
		if (expire && val !== undefined)
			PR.set(key, val, expire);
		return val;
	};

	PR.set = function(key, value, expire) {

		if (value === undefined) {
			delete PREF[key];
			if (!PREFBLACKLIST[key])
				delete W.PREF[key];
		} else {
			PREF[key] = { value: value, expire: NOW.add(expire || '1 month') };
			if (!PREFBLACKLIST[key])
				W.PREF[key] = value;
		}

		setTimeout2('PREF', prefsave, MD.delaypref);
		return value;
	};

	PR.keys = function() {
		return Object.keys(PREF);
	};

	PR.load = function(callback) {
		callback(!W.isPRIVATEMODE && PARSE(LS.getItem(MD.localstorage + '.pref')));
	};

	PR.save = function(data) {
		!W.isPRIVATEMODE && LS.setItem(MD.localstorage + '.pref', STRINGIFY(data));
	};

	// temporary
	W.jctmp = {};
	W.W = window;
	W.FUNC = {};
	W.REPO = {};

	try {
		var pmk = 'jc.test';
		LS.setItem(pmk, '1');
		W.isPRIVATEMODE = LS.getItem(pmk) !== '1';
		LS.removeItem(pmk);
	} catch (e) {
		W.isPRIVATEMODE = true;
		warn('jC: localStorage is disabled');
	}

	// Internal cache
	var scrollbarwidth = null;
	var blocked = {};
	var storage = {};
	var extensions = {}; // COMPONENT_EXTEND()
	var configs = [];
	var cache = {};
	var fallback = { $: 0 }; // $ === count of new items in fallback
	var fallbackpending = [];
	var paths = {}; // saved paths from get() and set()
	var events = {};
	var watches = [];
	var temp = {};
	var toggles = [];
	var versions = {};
	var autofill = [];
	var plugininit = [];
	var defaults = {};
	var waits = {};
	var statics = {};
	var queues = {};
	var ajaxconfig = {};
	var $ready = setTimeout(load, 2);
	var $loaded = false;
	var $domready = false;
	var knockknockcounter = 0;
	var pendingrequest = 0;
	var binders = {};
	var bindersnew = [];
	var lazycom = {};

	var current_owner = null;
	var current_element = null;
	var current_com = null;
	var current_scope = null;

	W.MAIN = W.M = M;
	W.PLUGINS = {};
	W.EMPTYARRAY = [];
	W.EMPTYOBJECT = {};
	W.NOW = new Date();

	var MD = W.DEF = M.defaults = {};
	var ENV = MD.environment = {};

	MD.scope = W;
	MD.delay = 555;
	MD.delaywatcher = 555;
	MD.delaybinder = 200;
	MD.delayrepeat = 2000;
	MD.delaypref = 1000;
	MD.keypress = true;
	MD.scrollbaranimate = true;
	MD.jsoncompress = false;
	MD.jsondate = true;
	MD.ajaxerrors = false;
	MD.fallback = 'https://cdn.componentator.com/j-{0}.html';
	MD.fallbackcache = '';
	MD.version = '';
	MD.headers = { 'X-Requested-With': 'XMLHttpRequest' };
	MD.devices = { xs: { max: 768 }, sm: { min: 768, max: 992 }, md: { min: 992, max: 1200 }, lg: { min: 1200 }};
	MD.importcache = 'session';
	MD.baseurl = ''; // String or Function
	MD.root = ''; // String or Function
	MD.makeurl = null; // Function
	MD.empty = T_COM;
	MD.jsonconverter = {
		'text json': function(text) {
			return text;
		}
	};

	MD.thousandsseparator = ' ';
	MD.decimalseparator = '.';
	MD.dateformat = null;
	// MD.currency = ''; DEFAULT CURRENCY
	MD.localstorage = ATTRDATA;
	MD.languagekey = 'language';
	MD.versionkey = 'version';
	MD.currencies = {};

	// MD.language
	// MD.languagehtml
	// MD.version
	// MD.versionhtml

	W.MONTHS = M.months = 'January,February,March,April,May,June,July,August,September,October,November,December'.split(',');
	W.DAYS = M.days = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(',');

	var MV = M.validators = {};
	MV.url = /^(https?:\/\/(?:www\.|(?!www))[^\s.#!:?+=&@!$'~*,;/()[\]]+\.[^\s#!?+=&@!$'~*,;()[\]\\]{2,}\/?|www\.[^\s#!:.?+=&@!$'~*,;/()[\]]+\.[^\s#!?+=&@!$'~*,;()[\]\\]{2,}\/?)/i;
	MV.phone = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im;
	MV.email = /^[a-zA-Z0-9-_.+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

	var MR = M.regexp = {};
	MR.int = /(-|\+)?[0-9]+/;
	MR.float = /(-|\+)?[0-9.,]+/;
	MR.date = /yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|a|ww|w/g;
	MR.pluralize = /#{1,}/g;
	MR.format = /\{\d+\}/g;

	M.loaded = false;
	M.version = 18.061;
	M.scrollbars = [];
	M.$components = {};
	M.binders = [];
	M.components = [];
	M.$formatter = [];
	M.$parser = [];
	M.compiler = C;
	M.paths = {};

	C.is = false;
	C.recompile = false;
	C.importing = 0;
	C.pending = [];
	C.init = [];
	C.imports = {};
	C.ready = [];
	C.counter = 0;

	if (Object.freeze) {
		Object.freeze(EMPTYOBJECT);
		Object.freeze(EMPTYARRAY);
	}

	M.compile = compile;

	function VBinder(html) {
		var t = this;
		var e = t.element = $(html);
		t.binders = [];
		var fn = function() {
			var dom = this;
			var el = $(dom);
			var b = el.attrd(T_BIND) || el.attr(T_BIND);
			dom.$jcbind = parsebinder(dom, b, EMPTYARRAY);
			dom.$jcbind && t.binders.push(dom.$jcbind);
		};
		e.filter(ATTRBIND).each(fn);
		e.find(ATTRBIND).each(fn);
	}

	var VBP = VBinder.prototype;

	VBP.on = function() {
		var t = this;
		t.element.on.apply(t.element, arguments);
		return t;
	};

	VBP.remove = function() {
		var t = this;
		var e = t.element;
		e.find('*').off();
		e.off().remove();
		t.element = null;
		t.binders = null;
		t.value = {};
		t = null;
		return t;
	};

	VBP.get = function(path) {
		var val = this.value;
		return path ? get(path, val) : val;
	};

	// A temporary variable for the performance
	var VBPA = [null];

	VBP.set = function(path, model) {

		var t = this;

		if (model == null) {
			t.value = model = path;
			path = '';
		} else
			set2(t.value, path, model);

		for (var i = 0; i < t.binders.length; i++) {
			var b = t.binders[i];

			if (!(b instanceof Array)) {
				VBPA[0] = b;
				b = VBPA;
			}

			for (var j = 0; j < b.length; j++) {
				var bi = b[j];
				bi && bi.exec(path || !bi.path ? model : get(bi.path, model), bi.path);
			}
		}

		return t;
	};

	W.VBIND = function(html) {
		return new VBinder(html);
	};

	W.VBINDARRAY = function(html, el) {
		var obj = {};
		obj.html = html;
		obj.items = [];
		obj.element = el instanceof COM ? el.element : $(el);
		obj.element[0].$vbindarray = obj;
		obj.value = [];
		obj.remove = function() {
			for (var i = 0; i < obj.items.length; i++)
				obj.items[i].remove();
			obj.checksum = null;
			obj.items = null;
			obj.html = null;
			obj.element = null;
		};

		var serialize = function(val) {
			switch (typeof(val)) {
				case TYPE_N:
					return val + '';
				case TYPE_B:
					return val ? '1' : '0';
				case TYPE_S:
					return val;
				default:
					return val == null ? '' : val instanceof Date ? val.getTime() : JSON.stringify(val);
			}
		};

		var checksum = function(item) {
			var sum = 0;
			var binder = obj.items[0];
			if (binder) {
				for (var j = 0; j < binder.binders.length; j++) {
					var b = binder.binders[j];
					var p = b.path;
					if (b.track) {
						for (var i = 0; i < b.track.length; i++)
							sum += serialize(get((p ? (p + '.') : '') + b.track[i].substring(1), item));
					} else
						sum += serialize(p ? get(p, item) : item);
				}
			}
			return HASH(sum);
		};

		obj.get = function(index) {
			var val = obj.value;
			return index == null ? val : val[index];
		};

		obj.set = function(index, value) {

			var sum = null;

			if (!(index instanceof Array)) {
				var item = obj.items[index];
				if (item) {
					sum = checksum(value);
					var el = item.element[0];
					if (el.$bchecksum !== sum) {
						el.$bchecksum = sum;
						item.set(value);
						obj.value[index] = value;
					}
				}
				return obj;
			}

			obj.value = value = index;

			if (obj.items.length > value.length) {
				var rem = obj.items.splice(value.length);
				for (var i = 0; i < rem.length; i++)
					rem[i].remove();
			}

			for (var i = 0; i < value.length; i++) {
				var val = value[i];
				var item = obj.items[i];

				if (!item) {
					item = VBIND(obj.html);
					obj.items.push(item);
					item.element.attrd('index', i);
					item.element[0].$vbind = item;
					item.index = i;
					obj.element.append(item.element);
				}

				var el = item.element[0];
				sum = checksum(val);

				if (el.$bchecksum !== sum) {
					el.$bchecksum = sum;
					item.set(val);
				}
			}
		};

		return obj;
	};

	// ===============================================================
	// MAIN FUNCTIONS
	// ===============================================================

	W.ENV = function(name, value) {

		if (typeof(name) === TYPE_O) {
			name && OK(name).forEach(function(key) {
				ENV[key] = name[key];
				events[KEY_ENV] && EMIT(KEY_ENV, key, name[key]);
			});
			return name;
		}

		if (value !== undefined) {
			events[KEY_ENV] && EMIT(KEY_ENV, name, value);
			ENV[name] = value;
			return value;
		}

		return ENV[name];
	};

	W.ENVIRONMENT = function(name, version, language, env) {
		var reload = MD.localstorage != name;
		MD.localstorage = name;
		MD.version = version || '';
		MD.languagehtml = language || '';
		env && ENV(env);
		reload && load();
	};

	W.FREE = function(timeout) {
		setTimeout2('$clean', cleaner, timeout || 10);
	};

	W.EVALUATE = function(path, expression, nopath) {

		var key = 'eval' + expression;
		var exp = temp[key];
		var val = null;

		if (nopath)
			val = path;
		else
			val = get(path);

		if (exp)
			return exp.call(val, val, path);

		if (expression.indexOf('return') === -1)
			expression = 'return ' + expression;

		exp = new Function(T_VALUE, 'path', expression);
		temp[key] = exp;
		return exp.call(val, val, path);
	};

	W.COOKIES = {
		get: function(name) {
			name = name.env();
			var arr = document.cookie.split(';');
			for (var i = 0; i < arr.length; i++) {
				var c = arr[i];
				if (c.charAt(0) === ' ')
					c = c.substring(1);
				var v = c.split('=');
				if (v.length > 1 && v[0] === name)
					return v[1];
			}
			return '';
		},
		set: function(name, value, expire, samesite) {
			var type = typeof(expire);
			if (type === TYPE_N) {
				var date = W.NOW;
				date.setTime(date.getTime() + (expire * 24 * 60 * 60 * 1000));
				expire = date;
			} else if (type === TYPE_S)
				expire = new Date(Date.now() + expire.parseExpire());
			document.cookie = name.env() + '=' + value + '; expires=' + expire.toGMTString() + '; path=/' + (samesite ? ('; samesite=' + samesite.charAt(0).toUpperCase() + samesite.substring(1)) : '');
		},
		rem: function(name) {
			COOKIES.set(name.env(), '', -1);
		}
	};

	W.FORMATTER = function(value, path, type) {

		if (typeof(value) === TYPE_FN) {
			!M.$formatter && (M.$formatter = []);

			// Prepend
			if (path === true)
				M.$formatter.unshift(value);
			else
				M.$formatter.push(value);

			return;
		}

		var a = M.$formatter;
		if (a && a.length) {
			for (var i = 0, length = a.length; i < length; i++) {
				var val = a[i].call(M, path, value, type);
				if (val !== undefined)
					value = val;
			}
		}

		return value;
	};

	W.PARSER = function(value, path, type) {

		if (typeof(value) === TYPE_FN) {
			!M.$parser && (M.$parser = []);

			// Prepend
			if (path === true)
				M.$parser.unshift(value);
			else
				M.$parser.push(value);

			return this;
		}

		var a = M.$parser;
		if (a && a.length) {
			for (var i = 0, length = a.length; i < length; i++)
				value = a[i].call(M, path, value, type);
		}

		return value;
	};

	function parseHeaders(val) {
		var h = {};
		val.split('\n').forEach(function(line) {
			var index = line.indexOf(':');
			if (index !== -1)
				h[line.substring(0, index).toLowerCase()] = line.substring(index + 1).trim();
		});
		return h;
	}

	function findformat(val) {
		var a = val.indexOf('-->');
		var s = 3;

		if (a === -1) {
			a = val.indexOf('->');
			s = 2;
		}

		if (a !== -1) {
			if (val.indexOf('/') !== -1 && val.indexOf('(') === -1)
				val += '(value)';
		}

		var fn = val.substring(a + s).trim();
		var is = false;
		if (fn.indexOf('?/') !== -1) {
			s = fn.indexOf('(');
			fn = '(value,path,type,scope)=>scope?scope.$format(\'' + fn.substring(2, s) + '\')' + fn.substring(s) + ':value';
			is = true;
		}

		return a === -1 ? null : { path: val.substring(0, a).trim(), fn: FN(fn), scope: is };
	}

	W.UPLOAD = function(url, data, callback, timeout, progress) {

		if (typeof(timeout) !== TYPE_N && progress == null) {
			progress = timeout;
			timeout = null;
		}

		if (!url)
			url = location.pathname;

		var method = 'POST';
		var index = url.indexOf(' ');
		var tmp = null;

		if (index !== -1)
			method = url.substring(0, index).toUpperCase();

		var isCredentials = method.charAt(0) === '!';
		if (isCredentials)
			method = method.substring(1);

		var headers = {};
		tmp = url.match(/\{.*?\}/g);

		if (tmp) {
			url = url.replace(tmp, '').replace(/\s{2,}/g, ' ');
			tmp = (new Function('return ' + tmp))();
			if (typeof(tmp) === TYPE_O)
				headers = tmp;
		}

		url = url.substring(index).trim().$env();

		if (typeof(callback) === TYPE_N) {
			timeout = callback;
			callback = undefined;
		}

		var output = {};
		output.throw = ajaxcustomerror;
		output.respond = ajaxcustomresponse;
		output.url = url;
		output.process = true;
		output.error = false;
		output.upload = true;
		output.method = method;
		output.data = data;
		output.scope = current_scope;
		output.callback = callback;
		output.duration = Date.now();
		output.progress = progress;

		events.request && EMIT('request', output);

		if (output.cancel)
			return;

		setTimeout(function() {

			var xhr = new XMLHttpRequest();

			if (isCredentials)
				xhr.withCredentials = true;

			xhr.addEventListener('error', function() {
				var req = this;
				ajaxprocess(output, req.status, req.statusText || ERRCONN, req.responseText, parseHeaders(req.getAllResponseHeaders()), output.status > 399);
			});

			xhr.addEventListener('load', function() {
				var req = this;
				ajaxprocess(output, req.status, req.statusText, req.responseText, parseHeaders(req.getAllResponseHeaders()));
			}, false);

			xhr.upload.onprogress = function(evt) {
				var p = output.progress;
				if (p) {
					var percentage = 0;
					if (evt.lengthComputable)
						percentage = Math.round(evt.loaded * 100 / evt.total);
					if (typeof(p) === TYPE_S)
						remap(p, percentage);
					else
						p(percentage, evt.transferSpeed, evt.timeRemaining);
				}
			};

			xhr.open(method, makeurl(output.url));

			var keys = OK(MD.headers);
			for (var i = 0; i < keys.length; i++)
				xhr.setRequestHeader(keys[i].env(), MD.headers[keys[i]].env());

			if (headers) {
				var keys = OK(headers);
				for (var i = 0; i < keys.length; i++)
					xhr.setRequestHeader(keys[i], headers[keys[i]]);
			}

			xhr.send(data);

		}, timeout || 0);
	};

	W.UNWATCH = function(path, fn) {

		if (path.indexOf(MULTIPLE) !== -1) {
			var arr = path.split(MULTIPLE).trim();
			for (var i = 0; i < arr.length; i++)
				UNWATCH(arr[i], fn);
		} else
			OFF('watch', path, fn);
	};

	W.WATCH = function(path, fn, init) {

		if (path.indexOf(MULTIPLE) !== -1) {
			var arr = path.split(MULTIPLE).trim();
			for (var i = 0; i < arr.length; i++)
				WATCH(arr[i], fn, init);
			return;
		}

		if (typeof(path) === TYPE_FN) {
			init = fn;
			fn = path;
			path = '*';
		}

		var push = '';

		if (path.charAt(0) === '^') {
			path = path.substring(1).trim();
			push = '^';
		}

		var index = path.indexOf('?');
		path = pathmaker(path, 1);

		ON(push + 'watch', path, fn, init, null, index === -1 ? '' : current_scope);
	};

	W.ON = function(name, path, fn, init, context, scope) {

		if (name.indexOf(MULTIPLE) !== -1) {
			var arr = name.split(MULTIPLE).trim();
			for (var i = 0; i < arr.length; i++)
				ON(arr[i], path, fn, init, context);
			return;
		}

		var push = true;

		if (name.charAt(0) === '^') {
			push = false;
			name = name.substring(1).trim();
		}

		var owner = null;
		var index = name.indexOf('#');

		if (index) {
			owner = name.substring(0, index).trim();
			name = name.substring(index + 1).trim();
		}

		if (typeof(path) === TYPE_FN) {
			fn = path;
			path = name === 'watch' ? '*' : '';
		} else
			path = path.replace('.*', '');

		if (path) {
			index = path.indexOf('/');
			if (index !== -1)
				scope = path.substring(0, index);
		}

		var obj = { name: name, fn: fn, owner: owner || current_owner, context: context || (current_com == null ? undefined : current_com), scope: scope };

		if (name === 'watch') {
			var arr = [];

			var tmp = findformat(path.replace(REGSCOPEREPLACE, scope || T_UNKNOWN));
			if (tmp) {
				path = tmp.path;
				obj.format = tmp.fn;
				obj.format.scope = tmp.scope;
			}

			if (path.substring(path.length - 1) === '.')
				path = path.substring(0, path.length - 1);

			// Temporary
			if (path.charCodeAt(0) === 37)
				path = T_TMP + path.substring(1);

			path = path.env();

			// !path = fixed path
			if (path.charCodeAt(0) === 33) {
				obj.$pathfixed = true;
				path = path.substring(1);
				arr.push(path);
			} else {
				var p = path.split('.');
				var s = [];
				for (var j = 0; j < p.length; j++) {
					var b = p[j].lastIndexOf('[');
					if (b !== -1) {
						var c = s.join('.');
						arr.push(c + (c ? '.' : '') + p[j].substring(0, b));
					}
					s.push(p[j]);
					arr.push(s.join('.'));
				}
				obj.$pathfixed = false;
			}

			obj.path = path;
			obj.$path = arr;

			if (M.paths[path])
				M.paths[path]++;
			else
				M.paths[path] = 1;

			if (push)
				watches.push(obj);
			else
				watches.unshift(obj);

			if (init) {
				obj.scope && (current_scope = obj.scope);
				fn.call(context || M, path, obj.format ? obj.format(get(path), path, 0) : get(path), 0);
			}

		} else {
			if (events[name]) {
				if (push)
					events[name].push(obj);
				else
					events[name].unshift(obj);
			} else
				events[name] = [obj];
			(!C.ready && (name === 'ready' || name === 'init')) && fn();
		}
	};

	W.OFF = function(name, path, fn) {

		if (name.indexOf('+') !== -1) {
			var arr = name.split('+').trim();
			for (var i = 0; i < arr.length; i++)
				OFF(arr[i], path, fn);
			return;
		}

		if (typeof(path) === TYPE_FN) {
			fn = path;
			path = '';
		}

		if (path === undefined)
			path = '';

		var owner = null;
		var index = name.indexOf('#');
		if (index) {
			owner = name.substring(0, index).trim();
			name = name.substring(index + 1).trim();
		}

		if (path) {
			path = path.replace('.*', '').trim();
			var tmp = findformat(path);
			if (tmp)
				path = tmp.path;
			if (path.substring(path.length - 1) === '.')
				path = path.substring(0, path.length - 1);
		}

		var type = 0;

		if (owner && !path && !fn && !name)
			type = 1;
		else if (owner && name && !fn && !path)
			type = 2;
		else if (owner && name && path)
			type = 3;
		else if (owner && name && path && fn)
			type = 4;
		else if (name && path && fn)
			type = 5;
		else if (name && path)
			type = 7;
		else if (fn)
			type = 6;

		var cleararr = function(arr, key) {
			return arr.remove(function(item) {
				if (type > 2 && type < 5) {
					if (item.path !== path)
						return false;
				}
				var v = false;
				if (type === 1)
					v = item.owner === owner;
				else if (type === 2)
					v = key === name && item.owner === owner;
				else if (type === 3)
					v = key === name && item.owner === owner;
				else if (type === 4)
					v = key === name && item.owner === owner && item.fn === fn;
				else if (type === 5 || type === 6)
					v = key === name && item.fn === fn;
				else if (type === 6)
					v = item.fn === fn;
				else if (type === 7)
					v = key === name && item.path === path;
				else
					v = key === name;

				if (v && item.path && M.paths[item.path])
					M.paths[item.path]--;

				return v;
			});
		};

		OK(events).forEach(function(p) {
			events[p] = cleararr(events[p], p);
			if (!events[p].length)
				delete events[p];
		});

		watches = cleararr(watches, 'watch');
	};

	W.EMIT = function(name) {

		var e = events[name];
		if (!e)
			return false;

		var args = [];

		for (var i = 1, length = arguments.length; i < length; i++)
			args.push(arguments[i]);

		for (var i = 0, length = e.length; i < length; i++) {
			var context = e[i].context;
			if (context !== undefined && (context === null || context.$removed))
				continue;
			e[i].fn.apply(context || W, args);
		}

		return true;
	};

	W.CHANGED = function(path) {
		path = pathmaker(path);
		return !com_dirty(path);
	};

	W.CHANGE = function(path, value) {
		if (value == null)
			value = true;
		path = pathmaker(path);
		return !com_dirty(path, !value);
	};

	function com_valid(path, value, onlyComponent) {

		var isExcept = value instanceof Array;
		var key = T_VALID + path + (isExcept ? '>' + value.join('|') : '');
		var except = null;

		if (isExcept) {
			except = value;
			value = undefined;
		}

		if (typeof(value) !== TYPE_B && cache[key] !== undefined)
			return cache[key];

		var flags = null;

		if (isExcept) {
			var is = false;
			flags = {};
			except = except.remove(function(item) {
				if (item.charAt(0) === '@') {
					flags[item.substring(1)] = true;
					is = true;
					return true;
				}
				return false;
			});
			!is && (flags = null);
			isExcept = except.length > 0;
		}

		var valid = true;
		var arr = value !== undefined ? [] : null;

		var index = path.lastIndexOf('.*');
		var wildcard = index !== -1;
		if (index !== -1)
			path = path.substring(0, index);

		path = pathmaker(path, 0, 1);

		var all = M.components;
		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];

			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path) || (isExcept && com.$except(except)))
				continue;

			if (flags && ((flags.visible && !com.visible()) || (flags.hidden && !com.hidden()) || (flags.enabled && com.find(SELINPUT).is(':disabled')) || (flags.disabled && com.find(SELINPUT).is(':enabled'))))
				continue;

			if (com.$valid_disabled) {
				arr && com.state && arr.push(com);
				continue;
			}

			if (value === undefined) {
				if (com.$valid === false)
					valid = false;
				continue;
			}

			com.state && arr.push(com);

			if (!onlyComponent) {
				if (wildcard || com.path === path)
					com.$valid = value;
			} else if (onlyComponent._id === com._id)
				com.$valid = value;
			if (com.$valid === false)
				valid = false;
		}

		clear(T_VALID);
		cache[key] = valid;
		state(arr, 1, 1);
		return valid;
	}

	function com_dirty(path, value, onlyComponent, skipEmitState) {

		var isExcept = value instanceof Array;
		var key = T_DIRTY + path + (isExcept ? '>' + value.join('|') : '');
		var except = null;

		if (isExcept) {
			except = value;
			value = undefined;
		}

		if (typeof(value) !== TYPE_B && cache[key] !== undefined)
			return cache[key];

		var dirty = true;
		var arr = value !== undefined ? [] : null;
		var flags = null;

		if (isExcept) {
			var is = false;
			flags = {};
			except = except.remove(function(item) {
				if (item.charAt(0) === '@') {
					flags[item.substring(1)] = true;
					is = true;
					return true;
				}
				return false;
			});
			!is && (flags = null);
			isExcept = except.length > 0;
		}

		var index = path.lastIndexOf('.*');
		var wildcard = index !== -1;
		if (index !== -1)
			path = path.substring(0, index);

		path = pathmaker(path, 0, 1);

		var all = M.components;
		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];

			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path) || (isExcept && com.$except(except)))
				continue;

			if (flags && ((flags.visible && !com.visible()) || (flags.hidden && !com.hidden()) || (flags.enabled && com.find(SELINPUT).is(':disabled')) || (flags.disabled && com.find(SELINPUT).is(':enabled'))))
				continue;

			if (com.$dirty_disabled) {
				arr && com.state && arr.push(com);
				continue;
			}

			if (value === undefined) {
				if (com.$dirty === false)
					dirty = false;
				continue;
			}

			com.state && arr.push(com);

			if (!onlyComponent) {
				if (wildcard || com.path === path)
					com.$dirty = value;
			} else if (onlyComponent._id === com._id)
				com.$dirty = value;
			if (com.$dirty === false)
				dirty = false;
		}

		clear(T_DIRTY);
		cache[key] = dirty;

		// For double hitting component.state() --> look into COM.invalid()
		!skipEmitState && state(arr, 1, 2);
		return dirty;
	}

	W.IMPORTCACHE = function(url, expire, target, callback, insert, preparator) {

		var w;

		url = url.$env().replace(/<.*?>/, function(text) {
			w = text.substring(1, text.length - 1).trim();
			return '';
		}).trim();

		// unique
		var first = url.charAt(0);
		var once = url.substring(0, 5).toLowerCase() === 'once ';

		if (typeof(target) === TYPE_FN) {

			if (typeof(callback) === TYPE_FN) {
				preparator = callback;
				insert = true;
			} else if (typeof(insert) === TYPE_FN) {
				preparator = insert;
				insert = true;
			}

			callback = target;
			target = 'body';
		} else if (typeof(insert) === TYPE_FN) {
			preparator = insert;
			insert = true;
		}

		if (w) {

			var wf = w.substring(w.length - 2) === '()';
			if (wf)
				w = w.substring(0, w.length - 2);

			var wo = GET(w);
			if (wf && typeof(wo) === TYPE_FN) {
				if (wo()) {
					callback && callback(0);
					return;
				}
			} else if (wo) {
				callback && callback(0);
				return;
			}
		}

		if (url.substring(0, 2) === '//')
			url = location.protocol + url;

		var index = url.lastIndexOf(' .');
		var ext = '';

		if (index !== -1) {
			ext = url.substring(index).trim().toLowerCase();
			url = url.substring(0, index).trim();
		}

		if (first === '!' || once) {

			if (once)
				url = url.substring(5);
			else
				url = url.substring(1);

			if (statics[url]) {
				if (callback) {
					if (statics[url] === 2)
						callback(0);
					else {
						WAIT(function() {
							return statics[url] === 2;
						}, function() {
							callback(0);
						});
					}
				}
				return;
			}

			statics[url] = 1;
		}

		if (target && target.setPath)
			target = target.element;

		if (!target)
			target = 'body';

		if (!ext) {
			index = url.lastIndexOf('?');
			if (index !== -1) {
				var index2 = url.lastIndexOf('.', index);
				if (index2 !== -1)
					ext = url.substring(index2, index).toLowerCase();
			} else {
				index = url.lastIndexOf('.');
				if (index !== -1)
					ext = url.substring(index).toLowerCase();
			}
		}

		var d = document;
		if (ext === '.js') {
			var scr = d.createElement(T_SCRIPT);
			scr.type = 'text/java' + T_SCRIPT;
			scr.async = false;
			scr.onload = function() {
				statics[url] = 2;
				callback && callback(1);
				W.jQuery && setTimeout(compile, 300);
			};
			scr.src = makeurl(url, true);
			d.getElementsByTagName('head')[0].appendChild(scr);
			events.import && EMIT(T_IMPORT, url, $(scr));
			return;
		}

		if (ext === '.css') {
			var stl = d.createElement('link');
			stl.type = 'text/css';
			stl.rel = 'stylesheet';
			stl.href = makeurl(url, true);
			d.getElementsByTagName('head')[0].appendChild(stl);
			statics[url] = 2;
			callback && setTimeout(callback, 200, 1);
			events.import && EMIT(T_IMPORT, url, $(stl));
			return;
		}

		WAIT(function() {
			return !!W.jQuery;
		}, function() {

			statics[url] = 2;
			var id = T_IMPORT + HASH(url);

			var cb = function(response, code, output) {

				if (!response) {
					callback && callback(0);
					return;
				}

				url = '$import' + url;

				if (preparator)
					response = preparator(response, output);

				var is = REGCOM.test(response);
				response = importscripts(importstyles(response, id)).trim();
				target = $(target);

				if (response) {
					current_element = target[0];
					if (insert === false)
						target.html(response);
					else
						target.append(response);
					current_element = null;
				}

				setTimeout(function() {
					// is && compile(response ? target : null);
					// because of scopes
					is && compile();
					callback && WAIT(function() {
						return C.is == false;
					}, function() {
						callback(1);
					});
					events.import && EMIT(T_IMPORT, url, target);
				}, 10);
			};

			if (expire)
				AJAXCACHE('GET ' + url, null, cb, expire);
			else
				AJAX('GET ' + url, cb);
		});
	};

	W.IMPORT = function(url, target, callback, insert, preparator) {
		if (url instanceof Array) {

			if (typeof(target) === TYPE_FN) {
				preparator = insert;
				insert = callback;
				callback = target;
				target = null;
			}

			url.wait(function(url, next) {
				IMPORTCACHE(url, null, target, next, insert, preparator);
			}, function() {
				callback && callback();
			});
		} else
			IMPORTCACHE(url, null, target, callback, insert, preparator);
	};

	W.CACHEPATH = function(path, expire, rebind, preferences) {
		WATCH(path, function(p, value) {
			var obj = preferences ? W.PREF.get(T_PATHS) : cachestorage(T_PATHS);
			if (obj)
				obj[path] = value;
			else {
				obj = {};
				obj[path] = value;
			}
			if (preferences)
				W.PREF.set(T_PATHS, value, expire);
			else
				cachestorage(T_PATHS, obj, expire);
		});
		if (rebind === undefined || rebind) {
			var cache = preferences ? W.PREF.get(T_PATHS) : cachestorage(T_PATHS);
			cache && cache[path] !== undefined && cache[path] !== get(path) && M.set(path, cache[path], true);
		}
	};

	W.CACHE = function(key, value, expire) {
		return cachestorage(key, value, expire);
	};

	W.SCROLLBARWIDTH = function() {
		var id = 'jcscrollbarwidth';
		if (scrollbarwidth != null)
			return scrollbarwidth;
		var b = document.body;
		$(b).append('<div id="{0}" style="width{1}height{1}overflow:scroll;position:absolute;top{2}left{2}"></div>'.format(id, ':100px;', ':9999px;'));
		var el = document.getElementById(id);
		if (el) {
			scrollbarwidth = el.offsetWidth - el.clientWidth;
			b.removeChild(el);
		}
		return scrollbarwidth || 0;
	};

	W.REMOVECACHE = function(key, isSearching) {
		if (isSearching) {
			for (var m in storage) {
				if (m.indexOf(key) !== -1)
					delete storage[key];
			}
		} else
			delete storage[key];
		save();
	};

	W.MODIFY = function(path, value, timeout) {
		if (path && typeof(path) === TYPE_O) {
			var keys = OK(path);
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				MODIFY(key, path[key], value);
			}
		} else {
			if (typeof(value) === TYPE_FN)
				value = value(GET(path));
			SET(path, value, timeout);
			if (timeout)
				setTimeout(CHANGE, timeout + 5, path);
			else
				CHANGE(path);
		}
	};

	W.AJAXCONFIG = function(name, fn) {
		ajaxconfig[name] = fn;
	};

	W.AJAX = function(url, data, callback, timeout) {

		if (typeof(url) === TYPE_FN) {
			timeout = callback;
			callback = data;
			data = url;
			url = location.pathname;
		}

		var td = typeof(data);
		var arg = EMPTYARRAY;
		var rawurl = url;
		var tmp;

		if (!callback && (td === TYPE_FN || td === TYPE_S)) {
			timeout = callback;
			callback = data;
			data = undefined;
		}

		var index = url.indexOf(' ');
		if (index === -1)
			return;

		var sync = false;

		url = url.replace(/\ssync/i, function() {
			sync = true;
			return '';
		});

		if (sync) {
			if (pendingrequest) {
				setTimeout(function(a, b, c, d) {
					W.AJAX.call(W, a, b, c, d);
				}, MD.delay, rawurl, data, callback, timeout);
				return;
			}
		}

		var repeat = false;
		var cancel = false;
		var reqid = null;

		url = url.replace(/\s(repeat|cancel|#[a-z]+)/i, function(text) {
			var c = text.charAt(1);
			if (c === '#')
				reqid = text.substring(2);
			else if (c.toLowerCase() === 'r')
				repeat = true;
			else
				cancel = true;
			return '';
		});

		if (repeat)
			arg = [url, data, callback, timeout];

		var method = url.substring(0, index).toUpperCase();
		var isCredentials = method.charAt(0) === '!';
		if (isCredentials)
			method = method.substring(1);

		var headers = {};
		tmp = url.match(/\{.*?\}/g);

		if (tmp) {
			url = url.replace(tmp, '').replace(/\s{2,}/g, ' ');
			tmp = (new Function('return ' + tmp))();
			if (typeof(tmp) === TYPE_O)
				headers = tmp;
		}

		url = url.substring(index).trim().$env();

		var mainurl = (reqid || (method + ' ' + url));
		if (cancel) {
			if (cache[mainurl]) {
				cache[mainurl].output.cancel = true;
				cache[mainurl].xhr.abort();
			}
		}

		var curr_scope = current_scope;
		pendingrequest++;

		setTimeout(function() {

			if (method === 'GET' && data) {
				var qs = (typeof(data) === TYPE_S ? data : jQuery.param(data, true));
				if (qs)
					url += '?' + qs;
			}

			var options = {};
			options.method = method;
			options.converters = MD.jsonconverter;

			if (reqid)
				options.id = reqid;

			if (method !== 'GET') {
				if (typeof(data) === TYPE_S) {
					options.data = data;
				} else {
					options.contentType = 'application/json; charset=utf-8';
					options.data = STRINGIFY(data);
				}
			}

			options.headers = $.extend(headers, MD.headers);
			options.scope = curr_scope;
			options.process = true;
			options.error = false;
			options.upload = false;
			options.callback = callback;
			options.throw = ajaxcustomerror;
			options.respond = ajaxcustomresponse;
			options.duration = Date.now();

			if (url.match(/http:\/\/|https:\/\//i)) {
				options.crossDomain = true;
				delete options.headers['X-Requested-With'];
				if (isCredentials)
					options.xhrFields = { withCredentials: true };
			} else
				url = url.ROOT();

			var custom = url.match(/\([a-z0-9\-.,]+\)/i);
			if (custom) {
				url = url.replace(custom, '').replace(/\s+/g, '');
				options.url = url;
				custom = custom.toString().replace(/\(|\)/g, '').split(',');
				for (var i = 0; i < custom.length; i++) {
					var opt = ajaxconfig[custom[i].trim()];
					opt && opt(options);
				}
			}

			if (!options.url)
				options.url = url;

			events.request && EMIT('request', options);

			if (options.cancel)
				return;

			options.type = options.method;
			delete options.method;

			var output = {};
			output.throw = ajaxcustomerror;
			output.respond = ajaxcustomresponse;
			output.url = options.url;
			output.process = true;
			output.error = false;
			output.upload = false;
			output.method = method;
			output.data = data;
			output.scope = curr_scope;
			output.callback = callback;
			output.duration = options.duration;

			if (cancel)
				cache[mainurl] = { options: options, output: output };

			delete options.url;

			options.success = function(r, s, req) {
				if (cancel)
					delete cache[mainurl];
				pendingrequest--;
				ajaxprocess(output, req.status, s, r, parseHeaders(req.getAllResponseHeaders()));
			};

			options.error = function(req, s) {

				if (cancel)
					delete cache[mainurl];

				pendingrequest--;
				var code = req.status;

				if (repeat && (!code || code === 408 || code === 502 || code === 503 || code === 504 || code === 509)) {
					// internal error
					// internet doesn't work
					setTimeout(function() {
						arg[0] += ' REPEAT';
						current_scope = curr_scope;
						AJAX.apply(M, arg);
					}, MD.delayrepeat);
				} else
					ajaxprocess(output, code, s, req.responseText, parseHeaders(req.getAllResponseHeaders()), true);
			};
			var xhr = $.ajax(makeurl(output.url), options);
			if (cancel)
				cache[mainurl].xhr = xhr;

		}, timeout || 0);
	};

	function ajaxcustomerror(response, headers, code) {
		var t = this;

		if (typeof(headers) === TYPE_N) {
			code = headers;
			headers = null;
		}

		t.cancel = false;
		t.process = true;
		ajaxprocess(t, code, ATTRDATA, response, headers || EMPTYOBJECT, true);
		t.cancel = true;
	}

	function ajaxcustomresponse(response, headers) {
		var t = this;
		t.cancel = false;
		t.process = true;
		ajaxprocess(t, 200, ATTRDATA, response, headers || EMPTYOBJECT);
		t.cancel = true;
	}

	function ajaxprocess(output, code, status, response, headers, error) {

		var p = output.progress;
		if (p) {
			if (typeof(p) === TYPE_S)
				remap(p, 100);
			else
				p(100);
		}

		if (!code)
			code = 999;

		if (!response && error)
			response = code + ': ' + status;

		output.response = response;
		output.status = code;
		output.text = status;
		output.error = error;
		output.headers = headers;
		output.duration = Date.now() - output.duration;

		var callback = output.callback;
		var ct = output.headers['content-type'];

		if (ct && ct.indexOf('/json') !== -1) {
			try {
				output.response = PARSE(output.response, MD.jsondate);
			} catch (e) {}
		}

		current_scope = output.scope;
		events[T_RESPONSE] && EMIT(T_RESPONSE, output);
		current_scope = output.scope;

		if (output.cancel || !output.process)
			return;

		if (error) {
			if (MD.ajaxerrors) {
				if (typeof(callback) === TYPE_S)
					remap(callback, output.response);
				else
					callback && callback.call(output, output.response, output.status, output);
			} else {
				events.error && EMIT('error', output);
				typeof(callback) === TYPE_FN && callback.call(output, output.response, output.status, output);
			}
		} else {
			if (typeof(callback) === TYPE_S)
				remap(callback, output.response);
			else
				callback && callback.call(output, output.response, undefined, output);
		}
	}

	W.AJAXCACHEREVIEW = function(url, data, callback, expire, timeout, clear) {
		return AJAXCACHE(url, data, callback, expire, timeout, clear, true);
	};

	W.AJAXCACHE = function(url, data, callback, expire, timeout, clear, review) {

		var tdata = typeof(data);

		if (tdata === TYPE_FN || (tdata === TYPE_S && typeof(callback) === TYPE_S && typeof(expire) !== TYPE_S)) {
			clear = timeout;
			timeout = expire;
			expire = callback;
			callback = data;
			data = null;
		}

		if (typeof(timeout) === TYPE_B) {
			clear = timeout === true;
			timeout = 0;
		}

		var index = url.indexOf(' ');
		if (index === -1)
			return;

		var method = url.substring(0, index).toUpperCase();
		var uri = url.substring(index).trim().$env();
		var curr_scope = current_scope;

		setTimeout(function() {
			var value = clear ? undefined : cacherest(method, uri, data, undefined, expire);
			if (value !== undefined) {

				var diff = review ? STRINGIFY(value) : null;

				current_scope = curr_scope;

				if (typeof(callback) === TYPE_S)
					remap(callback, value);
				else
					callback(value, true);

				if (!review || navigator.onLine === false)
					return;

				current_scope = curr_scope;

				AJAX(url, data, function(r, err) {

					if (err)
						r = err;

					current_scope = curr_scope;

					// Is same?
					if (diff !== STRINGIFY(r)) {

						if (!err)
							cacherest(method, uri, data, r, expire);

						if (typeof(callback) === TYPE_S)
							remap(callback, r);
						else
							callback(r, false, true);
					}
				});
				return;
			}

			current_scope = curr_scope;
			AJAX(url, data, function(r, err) {
				if (err)
					r = err;

				current_scope = curr_scope;

				if (!err)
					cacherest(method, uri, data, r, expire);

				if (typeof(callback) === TYPE_S)
					remap(callback, r);
				else
					callback(r, false);
			});
		}, timeout || 1);
	};

	W.CLEARCACHE = function() {
		if (!W.isPRIVATEMODE) {
			var rem = LS.removeItem;
			var k = MD.localstorage;
			rem(k);
			rem(k + '.cache');
			rem(k + '.blocked');
		}
	};

	W.ERRORS = function(path, except, highlight) {

		if (path instanceof Array) {
			except = path;
			path = undefined;
		}

		if (except === true) {
			except = highlight instanceof Array ? highlight : null;
			highlight = true;
		}

		path = path.replace('.*', '');

		var isExcept = except instanceof Array;
		var flags = null;

		if (isExcept) {
			var is = false;
			flags = {};
			except = except.remove(function(item) {
				if (item.charAt(0) === '@') {
					flags[item.substring(1)] = true;
					is = true;
					return true;
				}
				return false;
			});
			!is && (flags = null);
			isExcept = except.length > 0;
		}

		var arr = [];

		M.each(function(com) {

			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path) || (isExcept && com.$except(except)))
				return;

			if (flags && ((flags.visible && !com.visible()) || (flags.hidden && !com.hidden()) || (flags.enabled && com.find(SELINPUT).is(':disabled')) || (flags.disabled && com.find(SELINPUT).is(':enabled'))))
				return;

			if (!com.$valid)
				arr.push(com);

		}, pathmaker(path));

		highlight && state(arr, 1, 1);
		return arr;
	};

	W.CAN = function(path, except) {
		path = pathmaker(path);
		return !com_dirty(path, except) && com_valid(path, except);
	};

	W.VALID = function(path, except) {
		return com_valid(pathmaker(path), except);
	};

	W.DISABLED = function(path, except) {
		return !CAN(path, except);
	};

	W.INVALID = function(path, onlyComponent) {
		path = pathmaker(path);
		if (path) {
			com_dirty(path, false, onlyComponent, true);
			com_valid(path, false, onlyComponent);
		}
	};

	W.BLOCKED = function(name, timeout, callback) {

		var key = name.replace(REGSCOPEINLINE, current_scope || '?');
		var item = blocked[key];
		var now = Date.now();

		if (item > now)
			return true;

		if (typeof(timeout) === TYPE_S)
			timeout = timeout.env().parseExpire();

		var local = timeout > 10000;
		blocked[key] = now + timeout;
		!W.isPRIVATEMODE && local && LS.setItem(MD.localstorage + '.blocked', JSON.stringify(blocked));
		callback && callback();
		return false;
	};

	M.scope = function(val) {
		return val === undefined ? current_scope : (current_scope = val);
	};

	// 1 === manually
	// 2 === by input
	M.update = function(path, reset, type, wasset) {

		if (path instanceof Array) {
			for (var i = 0; i < path.length; i++)
				M.update(path[i], reset, type);
			return;
		}

		path = pathmaker(path);
		if (!path)
			return;

		var is = path.charCodeAt(0) === 33;
		if (is)
			path = path.substring(1);

		path = path.replace(REGWILDCARD, '');
		if (!path)
			return;

		!wasset && set(path, get(path), true);
		var state = [];

		if (type === undefined)
			type = 1; // manually

		var all = M.components;
		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];

			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path))
				continue;

			var result = com.get();
			if (com.setter) {
				com.$skip = false;
				com.setterX(result, path, type);
			}

			if (!com.$ready)
				com.$ready = true;

			if (reset === true) {

				if (!com.$dirty_disabled)
					com.$dirty = true;

				if (!com.$valid_disabled) {
					com.$valid = true;
					com.$validate = false;
					if (com.validate)
						com.$valid = com.validate(result);
				}

				findcontrol2(com);

			} else if (com.validate && !com.$valid_disabled)
				com.valid(com.validate(result), true);

			com.state && state.push(com);
		}

		reset && clear(T_DIRTY, T_VALID);

		for (var i = 0, length = state.length; i < length; i++)
			state[i].stateX(1, 4);

		emitwatch(path, get(path), type);
	};

	W.NOTIFY = function() {

		var arg = arguments;
		var all = M.components;

		var $ticks = Math.random().toString().substring(2, 8);
		for (var j = 0; j < arg.length; j++) {
			var p = arg[j];
			binders[p] && binderbind(p, p, $ticks);
		}

		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];
			if (!com || com.$removed || !com.$loaded || !com.path)
				continue;

			var is = 0;
			for (var j = 0; j < arg.length; j++) {
				if (com.path === arg[j]) {
					is = 1;
					break;
				}
			}

			if (is) {
				var val = com.get();
				com.setter && com.setterX(val, com.path, 1);
				com.state && com.stateX(1, 6);
			}
		}

		for (var j = 0; j < arg.length; j++)
			emitwatch(arg[j], GET(arg[j]), 1);
	};

	M.extend = function(path, value, type) {
		path = pathmaker(path);
		if (path) {
			var val = get(path);
			M.set(path, $.extend(val == null ? {} : val, value), type);
		}
	};

	W.REWRITE = function(path, value, type) {
		path = pathmaker(path);
		if (path) {
			set(path, value);
			emitwatch(path, value, type);
		}
	};

	M.inc = function(path, value, type) {

		if (path instanceof Array) {
			for (var i = 0; i < path.length; i++)
				M.inc(path[i], value, type);
			return;
		}

		path = pathmaker(path);

		if (!path)
			return;

		var current = get(path);
		if (!current) {
			current = 0;
		} else if (typeof(current) !== TYPE_N) {
			current = parseFloat(current);
			if (isNaN(current))
				current = 0;
		}

		current += value;
		M.set(path, current, type);
	};

	// 1 === manually
	// 2 === by input
	// 3 === default
	M.set = function(path, value, type) {

		if (path instanceof Array) {
			for (var i = 0; i < path.length; i++)
				M.set(path[i], value, type);
			return;
		}

		path = pathmaker(path);

		if (!path)
			return;

		var is = path.charCodeAt(0) === 33;
		if (is)
			path = path.substring(1);

		if (path.charCodeAt(0) === 43) {
			path = path.substring(1);
			return M.push(path, value, type);
		}

		if (!path)
			return;

		var isUpdate = (typeof(value) === TYPE_O && value != null && !(value instanceof Array) && !(value instanceof Date));
		var reset = type === true;
		if (reset)
			type = 1;

		set(path, value);

		if (isUpdate)
			return M.update(path, reset, type, true);

		var result = get(path);
		var state = [];

		if (type === undefined)
			type = 1;

		var all = M.components;

		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];

			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path))
				continue;

			if (com.setter) {
				if (com.path === path) {
					if (com.setter)
						com.setterX(result, path, type);
				} else {
					if (com.setter)
						com.setterX(get(com.path), path, type);
				}
			}

			if (!com.$ready)
				com.$ready = true;

			type !== 3 && com.state && state.push(com);

			if (reset) {
				if (!com.$dirty_disabled)
					com.$dirty = true;
				if (!com.$valid_disabled) {
					com.$valid = true;
					com.$validate = false;
					if (com.validate)
						com.$valid = com.validate(result);
				}

				findcontrol2(com);

			} else if (com.validate && !com.$valid_disabled)
				com.valid(com.validate(result), true);
		}

		reset && clear(T_DIRTY, T_VALID);

		for (var i = 0, length = state.length; i < length; i++)
			state[i].stateX(type, 5);

		emitwatch(path, result, type);
	};

	M.push = function(path, value, type) {

		if (path instanceof Array) {
			for (var i = 0; i < path.length; i++)
				M.push(path[i], value, type);
			return;
		}

		var unshift = 0;

		if (path.charAt(0) === '^') {
			path = path.substring(1);
			unshift = 1;
		}

		path = pathmaker(path);

		var arr = get(path);
		var n = false;

		if (!(arr instanceof Array)) {
			arr = [];
			n = true;
		}

		var is = true;

		if (value instanceof Array) {
			if (value.length) {
				if (unshift)
					arr.unshift.apply(arr, value);
				else
					arr.push.apply(arr, value);
			} else
				is = false;
		} else {
			if (unshift)
				arr.unshift(value);
			else
				arr.push(value);
		}

		if (n)
			M.set(path, arr, type);
		else if (is)
			M.update(path, undefined, type);
	};

	function pathmaker(path, clean, noscope) {

		if (!path)
			return path;

		var tmp = '';

		if (clean) {
			var index = path.indexOf(' ');
			if (index !== -1) {
				tmp = path.substring(index);
				path = path.substring(0, index);
			}
		}

		if (!noscope && current_scope)
			path = path.replace(REGSCOPEINLINE, current_scope);

		// temporary
		if (path.charCodeAt(0) === 37)
			return T_TMP + path.substring(1) + tmp;

		if (path.charCodeAt(0) === 64) {
			// parent component.data()
			return path;
		}

		var index = path.indexOf('/');

		if (index === -1)
			return path + tmp;

		var p = path.substring(0, index);
		var rem = W.PLUGINS[p];
		return ((rem ? ('PLUGINS.' + p) : (p + '_plugin_not_found')) + '.' + path.substring(index + 1)) + tmp;
	}

	W.GET = M.get = function(path, scope) {
		path = pathmaker(path);
		if (scope === true) {
			scope = null;
			RESET(path, true);
		} else if (typeof(scope) === TYPE_FN) {
			var val = get(path);
			if (val == null) {
				setTimeout(GET, MD.delaywatcher, path, scope);
			} else
				scope(val);
			return;
		}
		return get(path, scope);
	};

	W.GETM = function(path) {
		var model = null;
		var arr = MODIFIED(path);
		var index = path.indexOf('.*');
		if (index !== -1)
			path = path.substring(0, index);
		for (var i = 0; i < arr.length; i++) {
			var p = arr[i];
			if (model == null)
				model = {};
			set2(model, p.substring(path.length + 1), get(p));
		}
		return model;
	};

	W.GETU = function(path) {
		var m = get(pathmaker(path));
		setTimeout(UPD, 1, path);
		return m;
	};

	W.GETR = function(path) {
		return GET(path, true);
	};

	W.VALIDATE = function(path, except) {

		var arr = [];
		var valid = true;

		path = pathmaker(path.replace(REGWILDCARD, ''));

		var flags = null;
		if (except) {
			var is = false;
			flags = {};
			except = except.remove(function(item) {
				if (item.charAt(0) === '@') {
					flags[item.substring(1)] = true;
					is = true;
					return true;
				}
				return false;
			});
			!is && (flags = null);
			!except.length && (except = null);
		}

		var all = M.components;
		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];
			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path))
				continue;

			if (flags && ((flags.visible && !com.visible()) || (flags.hidden && !com.hidden()) || (flags.enabled && com.find(SELINPUT).is(':disabled')) || (flags.disabled && com.find(SELINPUT).is(':enabled'))))
				continue;

			com.state && arr.push(com);

			if (com.$valid_disabled)
				continue;

			com.$validate = true;
			if (com.validate) {
				com.$valid = com.validate(get(com.path));
				if (!com.$valid)
					valid = false;
			}
		}

		clear(T_VALID);
		state(arr, 1, 1);
		return valid;
	};

	function com_validate2(com) {

		var valid = true;

		if (com.$valid_disabled)
			return valid;

		var arr = [];
		com.state && arr.push(com);
		com.$validate = true;

		if (com.validate) {
			com.$valid = com.validate(get(com.path));
			if (!com.$valid)
				valid = false;
		}

		clear(T_VALID);
		state(arr, 1, 1);
		return valid;
	}

	M.default = function(path, timeout, onlyComponent, reset) {

		if (timeout > 0) {
			setTimeout(function() {
				M.default(path, 0, onlyComponent, reset);
			}, timeout);
			return;
		}

		if (typeof(onlyComponent) === TYPE_B) {
			reset = onlyComponent;
			onlyComponent = null;
		}

		if (reset === undefined)
			reset = true;

		path = pathmaker(path).replace(REGWILDCARD, '');

		// Reset scope
		var key = path.replace(/\.\*$/, '');
		var fn = defaults['#' + HASH(key)];
		var tmp;

		if (fn) {
			tmp = fn();
			set(key, tmp);
		}

		var arr = [];
		var all = M.components;

		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];

			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path))
				continue;

			if (com.state)
				arr.push(com);

			if (onlyComponent && onlyComponent._id !== com._id)
				continue;

			com.$default && com.set(com.$default(), 3);

			if (!reset)
				return;

			findcontrol2(com);

			if (!com.$dirty_disabled)
				com.$dirty = true;
			if (!com.$valid_disabled) {
				com.$valid = true;
				com.$validate = false;
				if (com.validate)
					com.$valid = com.validate(com.get());
			}
		}

		if (reset) {
			clear(T_VALID, T_DIRTY);
			state(arr, 3, 3);
		}
	};

	W.RESET = M.reset = function(path, timeout, onlyComponent) {

		if (timeout > 0) {
			setTimeout(function() {
				M.reset(path);
			}, timeout);
			return;
		}

		path = pathmaker(path).replace(REGWILDCARD, '');

		var arr = [];
		var all = M.components;

		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];
			if (!com || com.$removed || !com.$loaded || !com.path || !com.$compare(path))
				continue;

			com.state && arr.push(com);

			if (onlyComponent && onlyComponent._id !== com._id)
				continue;

			findcontrol2(com);

			if (!com.$dirty_disabled)
				com.$dirty = true;

			if (!com.$valid_disabled) {
				com.$valid = true;
				com.$validate = false;
				if (com.validate)
					com.$valid = com.validate(com.get());
			}
		}

		clear(T_VALID, T_DIRTY);
		state(arr, 1, 3);
	};

	M.each = function(fn, path) {
		var wildcard = path ? path.lastIndexOf('*') !== -1 : false;
		if (wildcard)
			path = path.replace('.*', '');
		var all = M.components;
		var index = 0;
		for (var i = 0, length = all.length; i < length; i++) {
			var com = all[i];
			if (!com || !com.$loaded || com.$removed || (path && (!com.path || !com.$compare(path))))
				continue;
			var stop = fn(com, index++, wildcard);
			if (stop === true)
				return;
		}
	};

	// ===============================================================
	// PRIVATE FUNCTIONS
	// ===============================================================

	function attrcom(el, name) {
		if (!el.attrd)
			el = $(el);
		return name ? el.attrd(ATTRDATA + '-' + name) : (el.attrd(ATTRDATA) || el.attrd('-') || el.attrd('--') || el.attrd(T_COM));
	}

	function attrrel(el) {
		if (el instanceof jQuery)
			el = el[0];
		return el.getAttribute(ATTRREL2) || el.getAttribute(T_DATA + 'jc-released');
	}

	function crawler(container, onComponent, level, released) {

		if (container)
			container = $(container)[0];
		else
			container = document.body;

		if (!container)
			return;

		var comp = container ? attrcom(container, 'compile') : '1';
		if (comp === '0' || comp === T_FALSE)
			return;

		if (!released)
			released = container ? attrrel(container) === T_TRUE : false;

		var b = null;
		var binders = null;

		if (!container.$jcbind) {
			b = container.getAttribute(T_DATA + T_BIND) || container.getAttribute(T_BIND);
			if (b) {
				!binders && (binders = []);
				binders.push({ el: container, b: b });
			}
		}

		var name = attrcom(container);
		!container.$com && name != null && onComponent(name, container, 0);

		var arr = container.childNodes;
		var sub = [];

		if (level === undefined)
			level = 0;
		else
			level++;

		for (var i = 0, length = arr.length; i < length; i++) {
			var el = arr[i];
			if (el) {

				if (!el.tagName)
					continue;

				comp = el.getAttribute(T_DATA + T_COMPILED);
				if (comp === '0' || comp === T_FALSE)
					continue;

				if (el.$com === undefined) {
					name = attrcom(el);
					if (name != null) {
						released && el.setAttribute(ATTRREL2, T_TRUE);
						onComponent(name || '', el, level);
					}
				}

				if (!el.$jcbind) {
					b = el.getAttribute(T_DATA + T_BIND) || el.getAttribute(T_BIND);
					if (b) {
						el.$jcbind = 1;
						!binders && (binders = []);
						binders.push({ el: el, b: b });
					}
				}

				comp = el.getAttribute(T_DATA + T_COMPILED);
				if (comp !== '0' && comp !== T_FALSE)
					el.childNodes.length && el.tagName !== 'SCRIPT' && REGCOM.test(el.innerHTML) && sub.indexOf(el) === -1 && sub.push(el);
			}
		}

		for (var i = 0, length = sub.length; i < length; i++) {
			el = sub[i];
			el && crawler(el, onComponent, level, released);
		}

		if (binders) {
			for (var i = 0; i < binders.length; i++) {
				var a = binders[i];
				a.el.$jcbind = parsebinder(a.el, a.b);
			}
		}
	}

	function findcomponent(container, selector, callback) {

		var s = (selector ? selector.split(' ') : EMPTYARRAY);
		var path = '';
		var name = '';
		var id = '';
		var version = '';
		var index;

		for (var i = 0, length = s.length; i < length; i++) {
			switch (s[i].charAt(0)) {
				case '*':
					break;
				case '.':
					// path
					path = s[i].substring(1);
					break;
				case '#':
					// id;
					id = s[i].substring(1);
					index = id.indexOf('[');
					if (index !== -1) {
						path = id.substring(index + 1, id.length - 1).trim();
						id = id.substring(0, index);
					}
					break;
				default:
					// name
					name = s[i];
					index = name.indexOf('[');

					if (index !== -1) {
						path = name.substring(index + 1, name.length - 1).trim();
						name = name.substring(0, index);
					}

					index = name.lastIndexOf('@');

					if (index !== -1) {
						version = name.substring(index + 1);
						name = name.substring(0, index);
					}

					break;
			}
		}

		var arr = callback ? undefined : [];
		if (container) {
			for (var j = 0; j < container.length; j++) {
				var childs = container[j].querySelectorAll(ATTRCOM);
				for (var i = 0; i < childs.length; i++) {
					var com = childs[i].$com;
					if (!com || !com.$loaded || com.$removed || (id && com.id !== id) || (name && com.$name !== name) || (version && com.$version !== version) || (path && (com.$pp || (com.path !== path && (!com.pathscope || ((com.pathscope + '.' + path) !== com.path))))))
						continue;
					if (callback) {
						if (callback(com) === false)
							break;
					} else
						arr.push(com);
				}
			}
		} else {
			for (var i = 0, length = M.components.length; i < length; i++) {
				var com = M.components[i];
				if (!com || !com.$loaded || com.$removed || (id && com.id !== id) || (name && com.$name !== name) || (version && com.$version !== version) || ((path && (com.$pp || (com.path !== path && (!com.pathscope || ((com.pathscope + '.' + path) !== com.path)))))))
					continue;
				if (callback) {
					if (callback(com) === false)
						break;
				} else
					arr.push(com);
			}
		}

		return arr;
	}

	function findcontrol2(com, input) {
		if (com.$inputcontrol) {
			if (com.$inputcontrol % 2 !== 0) {
				com.$inputcontrol++;
				return;
			}
		}
		var target = input ? input : com.element;
		findcontrol(target[0], function(el) {
			if (!el.$com || el.$com !== com) {
				el.$com = com;
				com.$inputcontrol = 1;
			}
		});
	}

	function findcontrol(container, onElement, level) {

		var arr = container.childNodes;
		var sub = [];

		ACTRLS[container.tagName] && onElement(container);

		if (level == null)
			level = 0;
		else
			level++;

		for (var i = 0, length = arr.length; i < length; i++) {
			var el = arr[i];
			if (el && el.tagName) {
				el.childNodes.length && el.tagName !== 'SCRIPT' && !attrcom(el) && sub.push(el);
				if (ACTRLS[el.tagName] && el.getAttribute(ATTRJCBIND) != null && onElement(el) === false)
					return;
			}
		}

		for (var i = 0, length = sub.length; i < length; i++) {
			el = sub[i];
			if (el && findcontrol(el, onElement, level) === false)
				return;
		}
	}

	var loaddone = false;

	function load() {

		$ready && clearTimeout($ready);
		$ready = null;

		if (loaddone) {
			// Clears previous cache
			storage = {};
			blocked = {};
		} else
			loaddone = true;

		var cache;

		try {
			cache = LS.getItem(MD.localstorage + '.cache');
			if (cache && typeof(cache) === TYPE_S)
				storage = PARSE(cache);
		} catch (e) {}
		try {
			cache = LS.getItem(MD.localstorage + '.blocked');
			if (cache && typeof(cache) === TYPE_S)
				blocked = PARSE(cache);
		} catch (e) {}

		if (storage) {
			var obj = storage[T_PATHS];
			obj && OK(obj.value).forEach(function(key) {
				M.set(key, obj.value[key], true);
			});
		}
	}

	function dependencies(declaration, callback, obj, el) {

		if (declaration.importing) {
			WAIT(function() {
				return declaration.importing !== true;
			}, function() {
				callback(obj, el);
			});
			return;
		}

		if (!declaration.dependencies || !declaration.dependencies.length) {
			setTimeout(function(callback, obj, el) {
				callback(obj, el);
			}, 5, callback, obj, el);
			return;
		}

		declaration.importing = true;
		declaration.dependencies.wait(function(item, next) {
			if (typeof(item) === TYPE_FN)
				item(next);
			else
				IMPORT((item.indexOf('<') === -1 ? 'once ' : '') + item, next);
		}, function() {
			declaration.importing = false;
			callback(obj, el);
		}, 3);
	}

	function compile(container) {

		if (C.is) {
			C.recompile = true;
			return;
		}

		var arr = [];

		W.READY instanceof Array && arr.push.apply(arr, W.READY);

		if (arr.length) {
			while (true) {
				var fn = arr.shift();
				if (!fn)
					break;
				fn();
			}
		}

		C.is = true;
		download();

		if (C.pending.length) {
			(function(container) {
				C.pending.push(function() {
					compile(container);
				});
			})(container);
			return;
		}

		var has = false;
		crawler(container, function(name, dom) {

			var el = $(dom);
			var meta = name.split(REGMETA);
			if (meta.length) {
				meta = meta.trim(true);
				name = meta[0];
			} else
				meta = null;

			has = true;

			// Check singleton instance
			if (statics['$ST_' + name]) {
				remove(el);
				return;
			}

			var instances = [];
			var all = name.split(',');

			for (var y = 0; y < all.length; y++) {

				var name = all[y].trim();
				var is = false;

				if (name.indexOf('|') !== -1) {

					// Multiple versions
					var keys = name.split('|');
					for (var i = 0; i < keys.length; i++) {
						var key = keys[i].trim();
						if (key && M.$components[key]) {
							name = key;
							is = true;
							break;
						}
					}

					if (!is)
						name = keys[0].trim();
				}

				var lazy = false;

				if (name.substring(0, 5).toLowerCase() === 'lazy ') {
					name = name.substring(5);
					lazy = true;
				}

				if (!is && name.lastIndexOf('@') === -1) {
					if (versions[name])
						name += '@' + versions[name];
					else if (MD.version)
						name += '@' + MD.version;
				}

				var com = M.$components[name];
				var lo = null;

				if (lazy && name) {
					var namea = name.substring(0, name.indexOf('@'));
					lo = lazycom[name];
					if (!lo) {
						if (namea && name !== namea)
							lazycom[name] = lazycom[namea] = { state: 1 };
						else
							lazycom[name] = { state: 1 };
						continue;
					}
					if (lo.state === 1)
						continue;
				}

				if (!com) {

					if (!fallback[name]) {
						fallback[name] = 1;
						fallback.$++;
					}

					var x;

					if (meta[2]) {
						var index = meta[2].indexOf('$url:');
						if (index !== -1) {
							var end = meta[2].indexOf(';', index + 5);
							if (end === -1)
								end = meta[2].length;
							x = meta[2].substring(index + 5, end);
						}
					}

					if (!x) {
						!statics['$NE_' + name] && (statics['$NE_' + name] = true);
						continue;
					}

					if (C.imports[x] === 1)
						continue;

					if (C.imports[x] === 2) {
						!statics['$NE_' + name] && (statics['$NE_' + name] = true);
						continue;
					}

					C.imports[x] = 1;
					C.importing++;

					IMPORT(x, function() {
						C.importing--;
						C.imports[x] = 2;
					});

					continue;
				}

				if (fallback[name] === 1) {
					fallback.$--;
					delete fallback[name];
				}

				var obj = new COM(com.name);
				var parent = dom.parentNode;

				while (true) {
					if (parent.$com) {
						var pc = parent.$com;
						obj.owner = pc;
						if (pc.$children)
							pc.$children++;
						else
							pc.$children = 1;
						break;
					} else if (parent.tagName === T_BODY)
						break;
					parent = parent.parentNode;
					if (parent == null)
						break;
				}

				obj.global = com.shared;
				obj.element = el;
				obj.dom = dom;

				var p = attrcom(el, 'path') || (meta ? meta[1] === TYPE_NULL ? '' : meta[1] : '') || obj._id;
				var tmp = attrcom(el, T_CONFIG) || (meta ? meta[2] === TYPE_NULL ? '' : meta[2] : '');

				if (p.charAt(0) === '%' || (tmp && tmp.indexOf('$noscope:') !== -1))
					obj.$noscope = true;

				obj.setPath(pathmaker(p, 1, 1), 1);

				if (tmp && tmp.charAt(0) === '%')
					obj.config = W[tmp.substring(1)] || {};
				else
					obj.config = {};

				// Default config
				com.config && obj.reconfigure(com.config, NOOP);
				tmp && obj.reconfigure(tmp, NOOP);

				if (!obj.id)
					obj.id = obj._id;

				obj.siblings = all.length > 1;
				obj.$lazy = lo;

				for (var i = 0; i < configs.length; i++) {
					var con = configs[i];
					con.fn(obj) && obj.reconfigure(typeof(con.config) === TYPE_FN ? con.config.call(obj) : con.config, NOOP);
				}

				var at = obj.name.lastIndexOf('@');
				current_com = obj;
				com.declaration.call(obj, obj, obj.config, 'ui-' + (at === - 1 ? obj.name : obj.name.substring(0, at)));
				current_com = null;

				meta[3] && el.attrd('jc-value', meta[3]);

				if (obj.init && !statics[name]) {
					statics[name] = true;
					obj.init();
				}

				dom.$com = obj;

				if (!obj.$noscope)
					obj.$noscope = attrcom(el, 'noscope') === T_TRUE;

				var code = obj.path ? obj.path.charCodeAt(0) : 0;
				if (!obj.$noscope && !obj.$pp) {

					var scope = findscope(dom);
					var is = false;

					if (obj.path && code !== 33 && code !== 35) {
						if (scope) {

							is = (obj.path || '').indexOf('?') !== -1;

							if (obj.path === '?') {
								obj.setPath(scope.path, 2);
								is = true;
							} else
								is && obj.setPath(scope.makepath(obj.path), 2);
						} else {
							var pn = dom.parentNode;
							if (pn && !pn.$noscope)
								pn.$noscope = true;
						}

					} else {
						obj.$$path = EMPTYARRAY;
						obj.path = '';
					}

					if (is) {
						obj.scope = scope;
						obj.pathscope = scope.path;
					}
				}

				instances.push(obj);

				if (attrrel(el) === T_TRUE)
					obj.isreleased = true;

				if (typeof(obj.make) === TYPE_S) {

					if (obj.make.indexOf('<') !== -1) {
						dependencies(com, function(obj, el) {
							if (obj.prerender)
								obj.make = obj.prerender(obj.make);
							el.html(obj.make);
							init(el, obj);
						}, obj, el);
						continue;
					}

					$.get(makeurl(obj.make), function(data) {
						dependencies(com, function(obj, el) {
							if (obj.prerender)
								data = obj.prerender(data);
							el.html(data);
							init(el, obj);
						}, obj, el);
					});

					continue;
				}

				if (com.dependencies) {
					dependencies(com, function(obj, el) {

						if (obj.make) {
							var parent = current_com;
							current_com = obj;
							obj.make();
							current_com = parent;
						}

						init(el, obj);
					}, obj, el);
				} else {

					// Because sometimes make doesn't contain the content of the element
					setTimeout(function(init, el, obj) {

						if (obj.make) {
							var parent = current_com;
							current_com = obj;
							obj.make();
							current_com = parent;
						}

						init(el, obj);
					}, 5, init, el, obj);
				}
			}

			// A reference to instances
			if (instances.length > 0)
				el.$com = instances.length > 1 ? instances : instances[0];

		}, undefined);

		// perform binder
		rebindbinder();

		if (!has || !C.pending.length)
			C.is = false;

		if (container !== undefined || !toggles.length)
			return nextpending();

		async(toggles, function(item, next) {
			for (var i = 0, length = item.toggle.length; i < length; i++)
				item.element.tclass(item.toggle[i]);
			next();
		}, nextpending);
	}

	function findscope(el) {

		el = el.parentNode;

		// For quick DOM travelsation (this is a simple cache)
		if (el && el.$noscope)
			return;

		while (el && el.tagName !== T_BODY) {

			var path = el.getAttribute ? (el.getAttribute(ATTRSCOPE2) || el.getAttribute(SCOPENAME)) : null;
			if (path) {

				if (el.$scopedata)
					return el.$scopedata;

				var independent = path.charAt(0) === '!';
				if (independent)
					path = path.substring(1);

				var meta = path.split(REGMETA);
				if (meta.length > 1)
					path = meta[0];

				var scope = new Scope();
				var conf = (meta[1] || '').replace(/\$/g, '').parseConfig();
				var isolated = path.charAt(0) === '!';

				scope.isolated = isolated || !!conf.isolated;

				if (isolated)
					path = path.substring(1);

				if (!path || path === '?')
					path = GUID(25).replace(/\d/g, '');

				scope._id = scope.ID = scope.id = GUID(10);
				scope.element = $(el);
				scope.config = conf;
				el.$scopedata = scope;

				// find parent
				scope.parent = findscope(el);
				scope.elements = [];

				var parent = scope.parent;

				if (!parent) {
					var pn = el.parentNode;
					if (pn)
						pn.$noscope = true;
				}

				while (parent) {
					scope.elements.push(parent.element[0]);
					if (parent.isolated)
						break;
					parent = parent.parent;
					if (parent == null)
						break;
				}

				scope.elements.push(el);

				if (scope.isolated)
					scope.path = path;
				else if (scope.parent)
					scope.path = scope.parent.path + '.' + path;
				else
					scope.path = path;

				var tmp = meta[2] || attrcom(el, T_VALUE);
				if (tmp) {
					var fn = new Function('return ' + tmp);
					defaults['#' + HASH(path)] = fn; // store by path (DEFAULT() --> can reset scope object)
					tmp = fn();
					set(path, tmp);
					emitwatch(path, tmp, 1);
				}

				// Applies classes
				var cls = conf.class || attrcom(el, T_CLASS);
				if (cls) {
					(function(cls) {
						cls = cls.split(' ');
						setTimeout(function() {
							for (var i = 0, length = cls.length; i < length; i++)
								scope.element.tclass(cls[i]);
						}, 5);
					})(cls);
				}

				tmp = conf.init || attrcom(el, 'init');
				if (tmp) {
					tmp = GET(tmp);
					if (tmp) {
						var a = current_owner;
						current_owner = SCOPENAME + scope._id;
						tmp.call(scope, path, scope.element);
						current_owner = a;
					}
				}

				return scope;

			} else {
				el = el.parentNode;
				if (el && el.$noscope)
					return;
			}
		}
	}

	function download() {

		var arr = [];
		var items = $('[' + T_DATA + T_IMPORT + ']');

		for (var i = 0; i < items.length; i++) {

			var t = items[i];
			if (t.$downloaded)
				continue;

			var el = $(t);
			t.$downloaded = 1;

			var data = el.attrd(T_IMPORT).parseConfig();

			// data.url
			// data.cache
			// data.init
			// data.path
			// data.class
			// data.make
			// data.replace
			// data.target

			// Unique
			var url = data.url;

			var once = url.substring(0, 5).toLowerCase() === 'once ';
			if (url.charAt(0) === '!' || once) {
				if (once)
					url = url.substring(5);
				else
					url = url.substring(1);
				if (statics[url])
					continue;
				statics[url] = 2;
			}

			data.url = url;
			data.element = el;
			data.toggle = data.class;
			arr.push(data);
		}

		if (!arr.length)
			return;

		C.importing++;

		async(arr, function(item, next) {

			var key = makeurl(item.url);

			AJAXCACHE('GET ' + item.url, null, function(response) {

				key = '$import' + key;

				current_element = item.element[0];

				if (statics[key])
					response = removescripts(response);
				else
					response = importscripts(importstyles(response));

				statics[key] = true;
				item.toggle && item.toggle.length && item.toggle[0] && toggles.push(item);

				if (item.path)
					response = response.replace(/~PATH~/g, item.path);

				if (item.make) {
					var fn = get(item.make);
					if (fn && typeof(fn) === TYPE_FN) {
						response = fn(response, item.element, item.path);
						if (!response) {
							current_element = null;
							next();
							return;
						}
					}
				}

				if (item.target)
					$(item.target).append(response);
				else if (item.replace)
					item.element.replaceWith(response);
				else
					item.element.html(response);

				if (item.init) {
					var init = get(item.init);
					if (typeof(init) === TYPE_FN)
						init(item.element);
				}

				current_element = null;
				next();

			}, item.cache || MD.importcache);

		}, function() {
			C.importing--;
			clear(T_VALID, T_DIRTY, 'find');
			compile();
		});
	}

	function remove(el) {
		var dom = el[0];
		dom.$com = null;
		el.attr(ATTRDEL, true);
		el.remove();
	}

	function cacherest(method, url, params, value, expire) {

		if (params) {

			var ishtml = url.indexOf('.html') !== -1;
			var k = MD.versionkey;

			if (!params[k]) {
				if (MD.version)
					params[k] = MD.version;
				else if (MD.versionhtml && ishtml)
					params[k] = MD.versionhtml;
			}

			k = MD.languagekey;
			if (!params[k]) {
				if (MD.language)
					params[k] = MD.language;
				else if (MD.languagehtml && ishtml)
					params[k] = MD.languagehtml;
			}
		}

		params = STRINGIFY(params);
		var key = HASH(method + '#' + url.replace(/\//g, '') + params).toString();
		return cachestorage(key, value, expire);
	}

	function cachestorage(key, value, expire) {

		var now = Date.now();

		if (value !== undefined) {

			if (expire === 'session') {
				cache['$session' + key] = value;
				return value;
			}

			if (typeof(expire) === TYPE_S)
				expire = expire.parseExpire();

			storage[key] = { expire: now + expire, value: value };
			save();
			return value;
		}

		var item = cache['$session' + key];
		if (item !== undefined)
			return item;

		item = storage[key];
		if (item && item.expire > now)
			return item.value;
	}

	function makeurl(url, make) {

		MD.makeurl && (url = MD.makeurl(url));

		if (make)
			return url;

		var builder = [];
		var en = encodeURIComponent;

		var ishtml = url.indexOf('.html') !== -1;

		if (MD.version)
			builder.push(MD.versionkey + '=' + en(MD.version));
		else if (MD.versionhtml && ishtml)
			builder.push(MD.versionkey + '=' + en(MD.versionhtml));

		if (MD.language)
			builder.push(MD.languagekey + '=' + en(MD.language));
		else if (MD.languagehtml && ishtml)
			builder.push(MD.languagekey + '=' + en(MD.languagehtml));

		if (!builder.length)
			return url;

		var index = url.indexOf('?');
		if (index == -1)
			url += '?';
		else
			url += '&';

		return url + builder.join('&');
	}

	function init(el, obj) {

		var dom = el[0];
		var type = dom.tagName;
		var collection;

		// autobind
		if (ACTRLS[type]) {
			obj.$input = true;
			collection = obj.element;
		} else
			collection = el;

		findcontrol2(obj, collection);

		obj.released && obj.released(obj.isreleased);
		M.components.push(obj);
		C.init.push(obj);
		type !== T_BODY && REGCOM.test(el[0].innerHTML) && compile(el);
		ready();
	}

	function initialize() {
		var item = C.init.pop();
		if (item === undefined)
			!C.ready && compile();
		else {
			!item.$removed && prepare(item);
			initialize();
		}
	}

	function resizenoscrollbar(el) {
		el.find(selnoscrollbar).noscrollbar();
	}

	function prepare(obj) {

		if (!obj)
			return;

		var el = obj.element;

		extensions[obj.name] && extensions[obj.name].forEach(function(item) {
			item.config && obj.reconfigure(item.config, NOOP);
			item.fn.call(obj, obj, obj.config, 'ui-' + obj.name);
		});

		var value = obj.get();
		var tmp;

		obj.configure && obj.reconfigure(obj.config, undefined, true);
		obj.$loaded = true;

		if (obj.setter) {
			if (!obj.$prepared) {

				obj.$prepared = true;
				obj.$ready = true;

				tmp = attrcom(obj, T_VALUE);

				if (tmp) {
					if (!defaults[tmp])
						defaults[tmp] = new Function('return ' + tmp);
					obj.$default = defaults[tmp];
					if (value === undefined) {
						value = obj.$default();
						set(obj.path, value);
						emitwatch(obj.path, value, 0);
					}
				}

				if (!obj.$binded) {
					obj.$binded = true;
					obj.setterX(value, obj.path, 0);
				}
			}
		} else
			obj.$binded = true;

		if (obj.validate && !obj.$valid_disabled)
			obj.$valid = obj.validate(obj.get(), true);

		obj.done && setTimeout(obj.done, 20);
		obj.state && obj.stateX(0, 3);

		obj.$init && setTimeout(function() {
			var fn = get(obj.$init);
			typeof(fn) === TYPE_FN && fn.call(obj, obj);
			obj.$init = undefined;
		}, 5);

		var n = 'component';
		el.trigger(n);
		el.off(n);

		var cls = attrcom(el, T_CLASS);
		cls && (function(cls) {
			setTimeout(function() {
				cls = cls.split(' ');
				var tmp = el[0].$jclass || {};
				for (var i = 0, length = cls.length; i < length; i++) {
					if (!tmp[cls[i]]) {
						el.tclass(cls[i]);
						tmp[cls[i]] = true;
					}
				}
				el[0].$jclass = tmp;
			}, 5);
		})(cls);

		setTimeout(resizenoscrollbar, 777, el);

		if (obj.$releaseready != null) {
			obj.release(obj.$releaseready, null, true);
			delete obj.$releaseready;
		}

		obj.id && EMIT('#' + obj.id, obj);

		var e = '@' + obj.name;
		events[e] && EMIT(e, obj);
		events[n] && EMIT(n, obj);

		clear('find.');

		if (obj.$lazy) {
			obj.$lazy.state = 3;
			delete obj.$lazy;
			events.lazy && EMIT('lazy', obj.$name, false);
		}
	}

	function async(arr, fn, done) {
		var item = arr.shift();
		if (item == null)
			return done && done();
		fn(item, function() {
			async(arr, fn, done);
		});
	}

	function nextpending() {

		var next = C.pending.shift();
		if (next)
			next();
		else if ($domready) {

			if (C.ready)
				C.is = false;

			if (MD.fallback && fallback.$ && !C.importing) {
				var arr = OK(fallback);
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] !== '$') {
						var num = fallback[arr[i]];
						if (num === 1) {
							fallbackpending.push(arr[i].toLowerCase());
							fallback[arr[i]] = 2;
						}
					}
				}
				fallback.$ = 0;
				fallbackpending.length && downloadfallback();
			}
		}
	}

	function downloadfallback() {
		if (C.importing) {
			setTimeout(downloadfallback, 1000);
		} else {
			setTimeout2('$fallback', function() {
				fallbackpending.splice(0).wait(function(item, next) {
					if (M.$components[item])
						next();
					else {
						warn('Downloading: ' + item);
						IMPORTCACHE(MD.fallback.format(item), MD.fallbackcache, next);
					}
				}, 3);
			}, 100);
		}
	}

	function emitwatch(path, value, type) {

		for (var i = 0, length = watches.length; i < length; i++) {
			var self = watches[i];

			if (self.$pathfixed) {
				if (self.path === path || (path.length < self.path.length && self.path.substring(0, path.length) === path)) {
					self.scope && (current_scope = self.scope);
					self.fn.call(self.context, path, self.format ? self.format(value, path, type) : value, type);
				}
				continue;
			}

			if (self.path === '*') {
				self.scope && (current_scope = self.scope);
				self.fn.call(self.context, path, self.format ? self.format(value, path, type) : value, type);
			} else if (path.length > self.path.length) {
				var index = path.lastIndexOf('.', self.path.length);
				if (index === -1 ? false : self.path === path.substring(0, index)) {
					self.scope && (current_scope = self.scope);
					var val = GET(self.path);
					self.fn.call(self.context, path, self.format ? self.format(val, path, type) : val, type);
				}
			} else {
				for (var j = 0, jl = self.$path.length; j < jl; j++) {
					if (self.$path[j] === path) {
						var val = GET(self.path);
						self.scope && (current_scope = self.scope);
						self.fn.call(self.context, path, self.format ? self.format(val, path, type) : val, type);
						break;
					}
				}
			}
		}
	}

	function ready() {

		setTimeout2('$ready', function() {

			refresh();
			initialize();

			var count = M.components.length;
			$(document).trigger('components', [count]);

			if (!$loaded) {
				$loaded = true;
				clear(T_VALID, T_DIRTY, 'find');
				events.init && EMIT('init');
				events.ready && EMIT('ready');
			}

			setTimeout2('$initcleaner', function() {
				cleaner();
				var arr = autofill.splice(0);
				for (var i = 0; i < arr.length; i++) {
					var com = arr[i];
					!com.$default && findcontrol(com.dom, function(el) {
						var val = $(el).val();
						if (val) {
							var tmp = com.parser(val);
							if (tmp) {
								com.dirty(false, true);
								com.set(tmp, 0);
							}
						}
						return true;
					});
				}
			}, 1000);

			C.is = false;

			if (C.recompile) {
				C.recompile = false;
				compile();
			}

			if (C.ready) {
				var arr = C.ready;
				for (var i = 0, length = arr.length; i < length; i++)
					arr[i](count);
				C.ready = undefined;
				compile();
				setTimeout(compile, 3000);
				setTimeout(compile, 6000);
				setTimeout(compile, 9000);
			}
		}, 100);
	}

	function removescripts(str) {
		return str.replace(REGSCRIPT, function(text) {
			var index = text.indexOf('>');
			var scr = text.substring(0, index + 1);
			return scr.substring(0, 6) === '<style' || (scr.substring(0, 7) === ('<' + T_SCRIPT) && scr.indexOf('type="') === -1) || scr.indexOf('/javascript"') !== -1 ? '' : text;
		});
	}

	function importscripts(str) {

		var beg = -1;
		var output = str;
		var external = [];
		var scr;

		while (true) {

			beg = str.indexOf('<' + T_SCRIPT, beg);
			if (beg === -1)
				break;
			var end = str.indexOf('</script>', beg + 8);
			var code = str.substring(beg, end + 9);
			beg = end + 9;
			end = code.indexOf('>');
			scr = code.substring(0, end);

			if (scr.indexOf('type=') !== -1 && scr.lastIndexOf('java' + T_SCRIPT) === -1)
				continue;

			var tmp = code.substring(end + 1, code.length - 9).trim();
			if (!tmp) {
				output = output.replace(code, '').trim();
				var eid = 'external' + HASH(code);
				if (!statics[eid]) {
					external.push(code);
					statics[eid] = true;
				}
			}
		}

		external.length && $('head').append(external.join('\n'));
		return output;
	}

	function importstyles(str, id) {
		var builder = [];

		str = str.replace(REGCSS, function(text) {
			text = text.replace('<style>', '<style type="text/css">');
			builder.push(text.substring(23, text.length - 8).trim());
			return '';
		});

		var key = 'css' + (id || '');

		if (id) {
			if (statics[key])
				$('#' + key).remove();
			else
				statics[key] = true;
		}

		builder.length && $('<style' + (id ? ' id="' + key + '"' : '') + '>{0}</style>'.format(builder.join('\n'))).appendTo('head');
		return str;
	}

	function remap(path, value) {

		var index = path.replace('-->', '->').indexOf('->');

		if (index !== -1) {
			value = value[path.substring(0, index).trim()];
			path = path.substring(index + 3).trim();
		}

		M.set(path.env(), value);
	}

	function set(path, value, is) {

		if (path == null)
			return;

		var key = '+' + path;

		if (paths[key])
			return paths[key](MD.scope, value, path, binders, binderbind, is);

		if (path.indexOf('?') !== -1) {
			path = '';
			return;
		}

		var arr = parsepath(path);
		var builder = [];
		var binder = [];

		for (var i = 0; i < arr.length - 1; i++) {
			var item = arr[i];
			var type = arr[i + 1] ? (REGISARR.test(arr[i + 1]) ? '[]' : '{}') : '{}';
			var p = 'w' + (item.charAt(0) === '[' ? '' : '.') + item;
			builder.push('if(typeof(' + p + ')!==\'object\'||' + p + '==null)' + p + '=' + type);
		}

		for (var i = 0; i < arr.length - 1; i++) {
			var item = arr[i];
			binder.push('binders[\'' + item + '\']&&binderbind(\'' + item + '\',\'' + path + '\',$ticks)');
		}

		var v = arr[arr.length - 1];
		binder.push('binders[\'' + v + '\']&&binderbind(\'' + v + '\',\'' + path + '\',$ticks)');
		binder.push('binders[\'!' + v + '\']&&binderbind(\'!' + v + '\',\'' + path + '\',$ticks)');

		if (v.charAt(0) !== '[')
			v = '.' + v;

		var fn = (new Function('w', 'a', 'b', 'binders', 'binderbind', 'nobind', 'var $ticks=Math.random().toString().substring(2,8);if(!nobind){' + builder.join(';') + ';var v=typeof(a)==\'function\'?a(MAIN.compiler.get(b)):a;w' + v + '=v}' + binder.join(';') + ';return a'));
		paths[key] = fn;
		fn(MD.scope, value, path, binders, binderbind, is);
	}

	function set2(scope, path, value) {

		if (path == null)
			return;

		var key = '++' + path;

		if (paths[key])
			return paths[key](scope, value, path);

		var arr = parsepath(path);
		var builder = [];

		for (var i = 0; i < arr.length - 1; i++) {
			var item = arr[i];
			var type = arr[i + 1] ? (REGISARR.test(arr[i + 1]) ? '[]' : '{}') : '{}';
			var p = 'w' + (item.charAt(0) === '[' ? '' : '.') + item;
			builder.push('if(typeof(' + p + ')!==\'object\'||' + p + '==null)' + p + '=' + type);
		}

		var v = arr[arr.length - 1];

		if (v.charAt(0) !== '[')
			v = '.' + v;

		var fn = (new Function('w', 'a', 'b', builder.join(';') + ';w' + v + '=a;return a'));
		paths[key] = fn;
		fn(scope, value, path);
		return scope;
	}

	function get(path, scope) {

		if (path == null)
			return;

		var code = path.charCodeAt(0);
		if (code === 37)
			path = T_TMP + path.substring(1);

		var key = '=' + path;
		if (paths[key])
			return paths[key](scope || MD.scope);

		if (path.indexOf('?') !== -1)
			return;

		var arr = parsepath(path);
		var builder = [];

		for (var i = 0, length = arr.length - 1; i < length; i++) {
			var item = arr[i];
			if (item.charAt(0) !== '[')
				item = '.' + item;
			builder.push('if(!w' + item + ')return');
		}

		var v = arr[arr.length - 1];
		if (v.charAt(0) !== '[')
			v = '.' + v;

		var fn = (new Function('w', builder.join(';') + ';return w' + v));
		paths[key] = fn;
		return fn(scope || MD.scope);
	}

	function parsepath(path) {

		var arr = path.split('.');
		var builder = [];
		var all = [];

		for (var i = 0; i < arr.length; i++) {
			var p = arr[i];
			var index = p.indexOf('[');
			if (index === -1) {
				if (p.indexOf('-') === -1) {
					all.push(p);
					builder.push(all.join('.'));
				} else {
					var a = all.splice(all.length - 1);
					all.push(a + '[\'' + p + '\']');
					builder.push(all.join('.'));
				}
			} else {
				if (p.indexOf('-') === -1) {
					all.push(p.substring(0, index));
					builder.push(all.join('.'));
					all.splice(all.length - 1);
					all.push(p);
					builder.push(all.join('.'));
				} else {
					all.push('[\'' + p.substring(0, index) + '\']');
					builder.push(all.join(''));
					all.push(p.substring(index));
					builder.push(all.join(''));
				}
			}
		}

		return builder;
	}

	C.get = get;

	function clear() {

		if (!arguments.length) {
			cache = {};
			return;
		}

		var arr = OK(cache);

		for (var i = 0, length = arr.length; i < length; i++) {
			var key = arr[i];
			var remove = false;
			var a = arguments;

			for (var j = 0; j < a.length; j++) {
				if (key.substring(0, a[j].length) !== a[j])
					continue;
				remove = true;
				break;
			}

			if (remove)
				delete cache[key];
		}
	}

	function cleaner2() {
		clear();
		cleaner();
	}

	function inDOM(el) {
		if (!el)
			return;
		if (el.tagName === T_BODY)
			return true;
		var parent = el.parentNode;
		while (parent) {
			if (parent.tagName === T_BODY)
				return true;
			parent = parent.parentNode;
		}
	}

	function cleaner() {

		var keys = OK(events);
		var is = false;
		var length = keys.length;
		var index;
		var arr;

		for (var i = 0; i < length; i++) {
			var key = keys[i];
			index = 0;
			arr = events[key];
			while (true) {

				var item = arr[index++];
				if (item === undefined)
					break;

				if (item.context == null || (item.context.element && inDOM(item.context.element[0])))
					continue;

				item.context && item.context.element && item.context.element.remove();
				item.context.$removed = true;
				item.context = null;
				arr.splice(index - 1, 1);

				if (!arr.length)
					delete events[key];

				index -= 2;
				is = true;
			}
		}

		index = 0;
		while (true) {
			var item = watches[index++];
			if (item === undefined)
				break;
			if (item.context == null || (item.context.element && inDOM(item.context.element[0])))
				continue;
			item.context && item.context.element && item.context.element.remove();
			item.context.$removed = true;
			item.context = null;
			watches.splice(index - 1, 1);
			index -= 2;
			is = true;
		}

		var all = M.components;
		index = 0;
		length = all.length;

		while (index < length) {

			var component = all[index++];

			if (!component) {
				index--;
				all.splice(index, 1);
				length = all.length;
				continue;
			}

			var c = component.element;
			if (!component.$removed && c && inDOM(c[0])) {
				if (!component.attr(ATTRDEL)) {
					if (component.$parser && !component.$parser.length)
						component.$parser = undefined;
					if (component.$formatter && !component.$formatter.length)
						component.$formatter = undefined;
					continue;
				}
			}

			events.destroy && EMIT('destroy', component.name, component);
			var e = 'component.destroy';
			events[e] && EMIT(e, component.name, component);

			delete statics['$ST_' + component.name];
			component.destroy && component.destroy();
			$('#css' + component.ID).remove();

			if (c[0].tagName !== T_BODY) {
				c.off();
				c.find('*').off();
				c.remove();
			}

			if (M.paths[component.path])
				M.paths[component.path]--;

			component.$main = undefined;
			component.$data = null;
			component.dom = null;
			component.$removed = 2;
			component.path = null;
			component.setter = null;
			component.setter2 = null;
			component.getter = null;
			component.getter2 = null;
			component.make = null;

			index--;
			all.splice(index, 1);
			length = M.components.length;
			is = true;
		}

		keys = OK(binders);
		for (var i = 0; i < keys.length; i++) {
			arr = binders[keys[i]];
			var j = 0;
			while (true) {
				var o = arr[j++];
				if (!o)
					break;
				if (inDOM(o.el[0]))
					continue;
				index = M.binders.indexOf(o);
				if (index !== -1)
					M.binders.splice(index, 1);
				var e = o.el;
				if (!e[0].$br) {
					e.off();
					e.find('*').off();
					e[0].$br = 1;
				}
				j--;
				arr.splice(j, 1);
			}
			if (!arr.length) {
				if (M.paths[keys[i]])
					M.paths[keys[i]]--;
				delete binders[keys[i]];
			}
		}

		clear('find');

		// Checks PLUGINS
		var R = W.PLUGINS;
		OK(R).forEach(function(key) {
			var a = R[key];
			if (!inDOM(a.element[0]) || !a.element[0].innerHTML) {
				a.$remove();
				delete R[key];
			}
		});

		W.NOW = new Date();
		var now = W.NOW.getTime();
		var is2 = false;
		var is3 = false;

		for (var key in blocked) {
			if (blocked[key] <= now) {
				delete blocked[key];
				is2 = true;
			}
		}

		is2 && !W.isPRIVATEMODE && LS.setItem(MD.localstorage + '.blocked', JSON.stringify(blocked));

		for (var key in storage) {
			var item = storage[key];
			if (!item.expire || item.expire <= now) {
				delete storage[key];
				is3 = true;
			}
		}

		is3 && save();

		if (is) {
			refresh();
			setTimeout(compile, 2000);
		}
	}

	function save() {
		!W.isPRIVATEMODE && LS.setItem(MD.localstorage + '.cache', JSON.stringify(storage));
	}

	function refresh() {
		setTimeout2('$refresh', function() {
			M.components.sort(function(a, b) {
				if (a.$removed || !a.path)
					return 1;
				if (b.$removed || !b.path)
					return -1;
				var al = a.path.length;
				var bl = b.path.length;
				return al > bl ? - 1 : al === bl ? LCOMPARER(a.path, b.path) : 1;
			});
		}, 200);
	}

	// what:
	// 1. valid
	// 2. dirty
	// 3. reset
	// 4. update
	// 5. set
	function state(arr, type, what) {
		arr && arr.length && setTimeout(function() {
			for (var i = 0, length = arr.length; i < length; i++)
				arr[i].stateX(type, what);
		}, 2, arr);
	}

	// ===============================================================
	// SCOPE
	// ===============================================================

	function Scope(path) {
		this.path = path;
	}

	var SCP = Scope.prototype;

	SCP.$formatnoop = function(value) {
		return value;
	};

	SCP.$format = function(endpoint) {
		var plugin = W.PLUGINS[this.path];
		return plugin && plugin[endpoint] || SCP.$formatnoop;
	};

	SCP.makepath = function(val) {
		var t = this;
		return val.replace(/\?\d+/g, function(text) {
			var skip = +text.substring(1);
			var parent = t.parent;
			for (var i = 1; i < skip; i++) {
				if (parent)
					parent = parent.parent;
			}
			return parent ? parent.path : t.path;
		}).replace(REGSCOPEINLINE, t.path);
	};

	SCP.unwatch = function(path, fn) {
		var self = this;
		OFF(SCOPENAME + self._id + '#watch', self.path + (path ? '.' + path : ''), fn);
		return self;
	};

	SCP.watch = function(path, fn, init) {
		var self = this;
		ON(SCOPENAME + self._id + '#watch', self.path + (path ? '.' + path : ''), fn, init, self);
		return self;
	};

	SCP.reset = function(path, timeout) {
		if (path > 0) {
			timeout = path;
			path = '';
		}
		return RESET(this.path + '.' + (path ? + path : '*'), timeout);
	};

	SCP.default = function(path, timeout) {
		if (path > 0) {
			timeout = path;
			path = '';
		}
		return DEFAULT(this.path + '.' + (path ? path : '*'), timeout);
	};

	SCP.set = function(path, value, timeout, reset) {
		return SET(this.path + (path ? '.' + path : ''), value, timeout, reset);
	};

	SCP.push = function(path, value, timeout, reset) {
		return PUSH(this.path + (path ? '.' + path : ''), value, timeout, reset);
	};

	SCP.update = function(path, timeout, reset) {
		return UPDATE(this.path + (path ? '.' + path : ''), timeout, reset);
	};

	SCP.get = function(path) {
		return GET(this.path + (path ? '.' + path : ''));
	};

	SCP.can = function(except) {
		return CAN(this.path + '.*', except);
	};

	SCP.errors = function(except, highlight) {
		return ERRORS(this.path + '.*', except, highlight);
	};

	SCP.remove = function() {
		var self = this;
		var arr = M.components;

		for (var i = 0; i < arr.length; i++) {
			var a = arr[i];
			a.scope && a.scope.path === self.path && a.remove(true);
		}

		OFF(SCOPENAME + self._id + '#watch');
		var e = self.element;
		e.find('*').off();
		e.off();
		e.remove();
		setTimeout2('$cleaner', cleaner2, 100);
	};

	SCP.FIND = function(selector, many, callback, timeout) {
		return this.element.FIND(selector, many, callback, timeout);
	};

	SCP.SETTER = function(a, b, c, d, e, f, g) {
		return this.element.SETTER(a, b, c, d, e, f, g);
	};

	SCP.RECONFIGURE = function(selector, name) {
		return this.element.RECONFIGURE(selector, name);
	};

	// ===============================================================
	// COMPONENT DECLARATION
	// ===============================================================

	function COM(name) {
		var self = this;
		self._id = self.ID = ATTRDATA + (C.counter++);
		self.$dirty = true;
		self.$valid = true;
		self.$validate = false;
		self.$parser = [];
		self.$formatter = [];
		self.$skip = false;
		self.$ready = false;
		self.$path;
		self.trim = true;
		self.isreleased = false;
		self.$bindreleased = true;
		self.$data = {};

		var version = name.lastIndexOf('@');

		self.name = name;
		self.$name = version === -1 ? name : name.substring(0, version);
		self.version = version === -1 ? '' : name.substring(version + 1);
		self.path;
		self.type;
		self.id;
		self.removed = false;

		self.make;
		self.done;
		self.prerender;
		self.destroy;
		self.state;
		self.validate;
		self.released;

		self.getter = function(value, realtime, nobind) {

			var self = this;

			value = self.parser(value);
			self.getter2 && self.getter2(value, realtime);

			if (realtime)
				self.$skip = true;

			// Binds a value
			if (nobind)
				com_validate2(self);
			else if (value !== self.get())
				self.set(value, 2);
			else if (realtime === 3) {
				// A validation for same values, "realtime=3" is in "blur" event
				// Because we need to validate the input if the user leaves from the control
				com_validate2(self);
			}
		};

		self.stateX = function(type, what) {
			var key = type + 'x' + what;
			if (!self.$bindchanges || self.$state !== key) {
				self.$state = key;
				self.config.$state && EXEC.call(self, self.config.$state.SCOPE(self), type, what);
				self.state(type, what);
			}
		};

		var setterXbinder = function(self) {
			var cache = self.$bindcache;
			cache.bt = 0; // reset timer id

			if (self.$bindchanges) {
				var hash = HASH(cache.value);
				if (hash === self.$valuehash)
					return;
				self.$valuehash = hash;
			}

			self.config.$setter && EXEC.call(self, self.config.$setter.SCOPE(self), cache.value, cache.path, cache.type);
			self.data('', cache.value);

			if (!self.$skipsetter)
				self.setter(cache.value, cache.path, cache.type);

			if (self.$skipsetter)
				self.$skipsetter = false;

			self.setter2 && self.setter2(cache.value, cache.path, cache.type);
		};

		self.setterX = function(value, path, type) {

			if (!self.setter || (self.$bindexact && self.path !== path && self.path.indexOf(path + '.') === -1 && type))
				return;

			var cache = self.$bindcache;
			if (arguments.length) {

				if (self.$format)
					value = self.$format(value, path, type, self.scope);

				if (self.$bindreleased) {

					if (self.$bindchanges) {
						var hash = HASH(value);
						if (hash === self.$valuehash)
							return;
						self.$valuehash = hash;
					}

					// Binds value directly
					self.config.$setter && EXEC.call(self, self.config.$setter.SCOPE(self), value, path, type);
					self.data('', value);

					if (!self.$skipsetter)
						self.setter(value, path, type);

					if (self.$skipsetter)
						self.$skipsetter = false;

					self.setter2 && self.setter2(value, path, type);

				} else {
					if (self.isreleased) {
						cache.is = true;
						cache.value = value;
						cache.path = path;
						cache.type = type;
						cache.bt && clearTimeout(cache.bt);
					} else {
						cache.value = value;
						cache.path = path;
						cache.type = type;
						if (!cache.bt) {
							if (cache.is)
								self.setterX();
							else
								setterXbinder(self);
						}
					}
				}

			} else if (!self.isreleased && cache && cache.is) {
				cache.is = false;
				cache.bt && clearTimeout(cache.bt);
				cache.bt = setTimeout(setterXbinder, self.$bindtimeout, self);
			}
		};

		self.setter = function(value, path, type) {

			var self = this;

			if (type === 2) {
				if (self.$skip) {
					self.$skip = false;
					return;
				}
			}

			var a = 'select-one';
			value = self.formatter(value);

			findcontrol(self.dom, function(t) {

				if (t.$com !== self)
					t.$com = self;

				var path = t.$com.path;
				if (path && path.length && path !== self.path)
					return;

				if (t.type === 'checkbox') {
					var tmp = value != null ? value.toString().toLowerCase() : '';
					tmp = tmp === T_TRUE || tmp === '1' || tmp === 'on';
					tmp !== t.checked && (t.checked = tmp);
					return;
				}

				if (value == null)
					value = '';

				if (!type && self.$autofill && t.type !== a && t.type !== 'range' && !self.$default)
					autofill.push(t.$com);

				if (t.type === a || t.type === 'select') {
					var el = $(t);
					el.val() !== value && el.val(value);
				} else if (t.value !== value)
					t.value = value;
			});
		};
	}

	var PPC = COM.prototype;

	PPC.command = function(name, fn) {
		var t = this;

		if (!t.$commands)
			t.$commands = {};

		var first = false;

		if (name.charAt(0) === '^') {
			first = true;
			name = name.substring(1);
		}

		if (t.$commands[name]) {
			if (first)
				t.$commands[name].unshift(fn);
			else
				t.$commands[name].push(fn);
		} else
			t.$commands[name] = [fn];

		return t;
	};

	PPC.autofill = function(val) {
		var t = this;
		t.$autofill = val == null ? true : val == true;
		return t;
	};

	PPC.import = function(url, callback, insert, preparator) {
		IMPORT(url, this.element, callback, insert, preparator);
		return this;
	};

	PPC.data = function(key, value) {

		if (!key)
			key = '@';

		var self = this;
		var data = self.$data[key];

		if (arguments.length === 1)
			return data ? data.value : null;

		if (data) {
			data.value = value;
			for (var i = 0; i < data.items.length; i++) {
				var o = data.items[i];
				var curr_scope = current_scope;
				o.el[0].parentNode && o.exec(value, key);
				current_scope = curr_scope;
			}
		} else
			self.$data[key] = { value: value, items: [] };

		if (self.$ppc) {
			var c = M.components;
			for (var i = 0; i < c.length; i++) {
				var com = c[i];
				if (com.owner === self && com.$pp && key === com.path)
					com.setterX(value, value, 2);
			}
		}

		return value;
	};

	PPC.$except = function(except) {
		var p = self.$path;
		for (var a = 0; a < except.length; a++) {
			for (var b = 0; b < p.length; b++) {
				if (except[a] === p[b])
					return true;
			}
		}
		return false;
	};

	PPC.$compare = function(path) {
		var self = this;

		if (self.$pathfixed)
			return self.path === path || (path.length < self.path.length && self.path.substring(0, path.length) === path);

		if (path.length > self.path.length) {
			for (var i = 0; i < self.path.length; i++) {
				var a = path.charAt(i);
				var b = self.path.charAt(i);
				if (a !== b)
					return false;
			}

			var c = path.charAt(i);
			return c === '.' || c === '[' || c === '';
		}

		for (var i = 0, length = self.$path.length; i < length; i++) {
			if (self.$path[i] === path)
				return true;
		}
	};

	function removewaiter(obj) {
		if (obj.$W) {
			var keys = OK(obj.$W);
			for (var i = 0, length = keys.length; i < length; i++) {
				var v = obj.$W[keys[i]];
				v.id && clearInterval(v.id);
			}
		}
	}

	PPC.notmodified = function(fields) {
		var t = this;
		typeof(fields) === TYPE_S && (fields = [fields]);
		return NOTMODIFIED(t._id, t.get(), fields);
	};

	PPC.$waiter = function(prop, callback) {

		var t = this;

		if (prop === true) {
			if (t.$W) {
				var keys = OK(t.$W);
				for (var i = 0; i < keys.length; i++) {
					var k = keys[i];
					var o = t.$W[k];
					o.id = setInterval(function(t, prop) {
						var o = t.$W[prop];
						var v = t[prop]();
						if (v) {
							clearInterval(o.id);
							for (var i = 0; i < o.callback.length; i++)
								o.callback[i].call(t, v);
							delete t.$W[prop];
						}
					}, MD.delaywatcher, t, k);
				}
			}
			return;
		} else if (prop === false) {
			if (t.$W) {
				var keys = OK(t.$W);
				for (var i = 0; i < keys.length; i++) {
					var a = t.$W[keys[i]];
					a && clearInterval(a.id);
				}
			}
			return;
		}

		!t.$W && (t.$W = {});

		if (t.$W[prop]) {
			// Checks if same callback exists
			for (var i = 0; i < t.$W[prop].length; i++) {
				if (t.$W[prop][i] === callback)
					return t;
			}
			t.$W[prop].callback.push(callback);
			return t;
		} else
			t.$W[prop] = { callback: [callback] };

		if (!t.isreleased) {
			t.$W[prop].id = setInterval(function(t, prop) {
				var o = t.$W[prop];
				var v = t[prop]();
				if (v) {
					clearInterval(o.id);
					for (var i = 0; i < o.callback.length; i++)
						o.callback[i].call(t, v);
					delete t.$W[prop];
				}
			}, MD.delaywatcher, t, prop);
		}
		return t;
	};

	PPC.hidden = function(callback) {
		var t = this;
		var v = !HIDDEN(t.dom);
		if (callback) {
			if (v)
				callback.call(t);
			else
				t.$waiter(T_HIDDEN, callback);
		}
		return v;
	};

	PPC.visible = function(callback) {
		var t = this;
		var v = !HIDDEN(t.dom);
		if (callback) {
			if (v)
				callback.call(t);
			else
				t.$waiter('visible', callback);
		}
		return v;
	};

	PPC.width = function(callback) {
		var t = this;
		var v = t.element ? t.dom.offsetWidth : 0;
		if (callback) {
			if (v)
				callback.call(t, v);
			else
				t.$waiter(T_WIDTH, callback);
		}
		return v;
	};

	PPC.height = function(callback) {
		var t = this;
		var v = t.element ? t.dom.offsetHeight : 0;
		if (callback) {
			if (v)
				callback.call(t, v);
			else
				t.$waiter(T_HEIGHT, callback);
		}
		return v;
	};

	function releasecomponents(type, dom, value, init, ischildren) {

		// type = 0   - current component and all nested components
		// type = 1   - only nested components
		// type = 2   - only current component

		if (dom) {

			if (type === 0 || type === 2) {
				if (dom.$com) {
					var com = dom.$com;
					var is = false;
					if (com instanceof Array) {
						for (var i = 0; i < com.length; i++) {
							var tmp = com[i];
							if (tmp.$removed || (tmp.$releasetype && (tmp.$releasetype === 3 || (tmp.$releasetype === 1 && !value) || (tmp.$releasetype === 2 && value))))
								continue;
							if (tmp.$ready)
								tmp.release(value, null, true);
							else
								tmp.$releaseready = value;
							is = true;
						}
						if (!is)
							return;
					} else {
						if (com.$removed || (com.$releasetype === 3 && (com.$releasetype === 3 || (com.$releasetype === 1 && !value) || (com.$releasetype === 2 && value))))
							return;
						if (com.$ready)
							com.release(value, null, true);
						else
							com.$releaseready = value;
					}
				} else if (ischildren && dom.$jcbind && dom.$jcbind.release) {
					// A binder controls nested children by itself
					return;
				} else
					attrcom(dom) && dom.setAttribute(ATTRREL2, value ? T_TRUE : T_FALSE);
			}

			if ((type === 0 || type === 1) && dom.children) {
				for (var i = 0; i < dom.children.length; i++)
					releasecomponents(0, dom.children[i], value, init, true);
			}
		}
	}

	PPC.releasemode = function(type) {
		var self = this;
		switch (type) {
			case 'auto':
			case 0:
				type = null;
				break;
			case 1:
			case true:
			case 'true':
				type = 1; // accept only released
				break;
			case 2:
			case false:
			case 'false':
				type = 2; // accept only unreleased
				break;
			default:
				type = 3; // manual
				break;
		}
		self.$releasetype = type;
		return self;
	};

	PPC.release = function(value, container, skipnested) {

		var self = this;
		if (value === undefined || self.$removed)
			return self.isreleased;

		self.attr(ATTRREL2, value ? T_TRUE : T_FALSE);

		if (!container && self.isreleased !== value) {
			self.isreleased = value;
			self.released && self.released(value, self);
			self.$waiter(!value);
			!value && self.setterX();
		}

		if (!skipnested) {
			var el = container || self.element;
			releasecomponents(1, el instanceof jQuery ? el[0] : el, value, 0, 0, true);
		}

		return value;
	};

	PPC.validate2 = function() {
		return com_validate2(this);
	};

	PPC.exec = function(name, a, b, c, d, e) {
		var self = this;
		var childs = self.find(ATTRCOM);
		for (var i = 0; i < childs.length; i++) {
			var t = childs[i];
			if (t.$com) {
				t.$com.caller = self;
				t.$com[name] && this.$com[name](a, b, c, d, e);
			}
		}
		return self;
	};

	PPC.replace = function(el, remove) {
		var self = this;

		if (C.is)
			C.recompile = true;

		var n = 'scope';
		var prev = self.element;
		var scope = prev.attrd(n);
		var data = prev[0].$scopedata;

		prev.rattrd(ATTRDATA, '-', '--', T_COM);
		prev[0].$com = prev[0].$scopedata = null;

		scope && self.element.rattrd(n);

		if (remove)
			prev.off().remove();
		else
			self.attrd('jc-replaced', T_TRUE);

		self.element = $(el);

		self.dom = self.element[0];
		self.dom.$com = self;

		if (data) {
			self.dom.$scopedata = data;
			data.element = self.element;
		}

		self.attrd(T_COM, self.name);
		scope && self.attrd(n, scope);
		self.siblings = false;
		return self;
	};

	PPC.compile = function(container) {
		var self = this;
		!container && self.attrd(T_COMPILED) && self.attrd(T_COMPILED, '1');
		compile(container || self.element);
		return self;
	};

	PPC.notify = function() {
		NOTIFY(this.path);
		return this;
	};

	PPC.update = PPC.refresh = function(notify, type) {
		var self = this;
		if (self.$binded) {

			if (typeof(notify) === TYPE_S) {
				type = notify;
				notify = true;
			}

			if (notify)
				self.set(self.get(), type);
			else
				self.setter && self.setterX(self.get(), self.path, 1);
		}
		return self;
	};

	PPC.tclass = function(cls, v) {
		var self = this;
		self.element.tclass(cls, v);
		return self;
	};

	PPC.aclass = function(cls, timeout) {
		var self = this;
		if (timeout)
			setTimeout(function() { self.element.aclass(cls); }, timeout);
		else
			self.element.aclass(cls);
		return self;
	};

	PPC.hclass = function(cls) {
		return this.element.hclass(cls);
	};

	PPC.rclass = function(cls, timeout) {
		var self = this;
		var e = self.element;
		if (timeout)
			setTimeout(function() { e.rclass(cls); }, timeout);
		else {
			if (cls)
				e.rclass(cls);
			else
				e.rclass();
		}
		return self;
	};

	PPC.rclass2 = function(search) {
		this.element.rclass2(search);
		return this;
	};

	PPC.toggle = function(cls, visible, timeout) {

		var manual = false;
		var self = this;

		if (typeof(cls) !== TYPE_S) {
			timeout = visible;
			visible = cls;
			cls = T_HIDDEN;
			manual = true;
		}

		if (typeof(visible) === TYPE_N) {
			timeout = visible;
			visible = undefined;
		} else if (manual && visible !== undefined)
			visible = !visible;

		var el = self.element;
		if (!timeout) {
			el.tclass(cls, visible);
			return self;
		}

		setTimeout(function() {
			el.tclass(cls, visible);
		}, timeout);
		return self;
	};

	PPC.noscope = function(value) {
		var self = this;
		self.$noscope = value === undefined ? true : value === true;
		return self;
	};

	PPC.nocompile = function() {
		var self = this;
		self.element.attrd(T_COMPILED, '0');
		return self;
	};

	PPC.singleton = function() {
		var self = this;
		statics['$ST_' + self.name] = true;
		return self;
	};

	PPC.blind = function() {
		var self = this;
		self.path = null;
		self.$path = null;
		self.$$path = null;
		return self;
	};

	PPC.bindchanges = PPC.bindChanges = function(enable) {
		this.$bindchanges = enable == null || enable === true;
		return this;
	};

	PPC.bindexact = PPC.bindExact = function(enable) {
		this.$bindexact = enable == null || enable === true;
		return this;
	};

	PPC.bindvisible = PPC.bindVisible = function(timeout) {
		var self = this;
		self.$bindreleased = false;
		self.$bindtimeout = timeout || MD.delaybinder;
		self.$bindcache = {};
		return self;
	};

	PPC.readonly = function() {
		var self = this;
		self.noDirty();
		self.noValid();
		self.getter = null;
		self.setter = null;
		self.$parser = null;
		self.$formatter = null;
		return self;
	};

	PPC.novalidate = PPC.noValid = PPC.noValidate = function(val) {
		if (val === undefined)
			val = true;
		var self = this;
		self.$valid_disabled = val;
		self.$valid = val;
		return self;
	};

	PPC.nodirty = PPC.noDirty = function(val) {
		if (val === undefined)
			val = true;
		var self = this;
		self.$dirty_disabled = val;
		self.$dirty = !val;
		return self;
	};

	PPC.datasource = function(path, callback, init) {
		var self = this;
		var ds = self.$datasource;

		ds && self.unwatch(ds.path, ds.fn);

		if (path) {
			path = self.makepath(path);
			self.$datasource = { path: path, fn: callback };
			self.watch(path, callback, init !== false);
		} else
			self.$datasource = null;

		return self;
	};

	PPC.makepath = function(path) {
		var self = this;
		return path.indexOf('?') !== -1 && self.pathscope ? self.scope.makepath(path) : path;
	};

	PPC.scopepath = function(path) {
		var self = this;

		if (path.indexOf('?') === -1)
			return path;

		if (self.$scopepath === undefined)
			self.$scopepath = self.element.scope() || null;

		return self.$scopepath ? self.$scopepath.makepath(path) : path;
	};

	PPC.setPath = function(path, type) {

		// type 1: init
		// type 2: scope

		var self = this;
		var tmp = findformat(path);

		if (tmp) {
			path = tmp.path;
			self.$format = tmp.fn;
			if (tmp.scope)
				self.$format.scope = true;

		} else if (!type)
			self.$format = null;

		var arr = [];

		if (path.charAt(0) === '@') {
			path = path.substring(1);
			self.$pp = true;
			self.owner.$ppc = true;
		} else
			self.$pp = false;

		// Temporary
		if (path.charCodeAt(0) === 37)
			path = T_TMP + path.substring(1);

		path = path.env();

		// !path = fixed path
		if (path.charCodeAt(0) === 33) {
			self.$pathfixed = true;
			path = path.substring(1);
			arr.push(path);
		} else {
			var p = path.split('.');
			var s = [];
			for (var j = 0; j < p.length; j++) {
				var b = p[j].lastIndexOf('[');
				if (b !== -1) {
					var c = s.join('.');
					arr.push(c + (c ? '.' : '') + p[j].substring(0, b));
				}
				s.push(p[j]);
				arr.push(s.join('.'));
			}
			self.$pathfixed = false;
		}

		self.path = path;
		self.$path = arr;
		type !== 1 && C.ready && refresh();

		if (path.indexOf('?') === -1) {
			if (M.paths[path])
				M.paths[path]++;
			else
				M.paths[path] = 1;
		}

		return self;
	};

	PPC.attr = SCP.attr = function(name, value) {
		var el = this.element;
		if (value === undefined)
			return el.attr(name);
		el.attr(name, value);
		return this;
	};

	PPC.attrd = SCP.attrd = function(name, value) {
		name = T_DATA + name;
		var el = this.element;
		if (value === undefined)
			return el.attr(name);
		el.attr(name, value);
		return this;
	};

	PPC.css = SCP.css = function(name, value) {
		var el = this.element;
		if (value === undefined)
			return el.css(name);
		el.css(name, value);
		return this;
	};

	PPC.main = SCP.main = function() {
		var self = this;
		if (self.$main === undefined) {
			var tmp = self.parent().closest(ATTRCOM)[0];
			self.$main = tmp ? tmp.$com : null;
		}
		return self.$main;
	};

	PPC.rcwatch = function(path, value) {
		var self = this;
		if (value) {
			self.reconfigure(value);
			self.$reconfigure();
		}
		return self;
	};

	PPC.reconfigure = function(value, callback, init) {
		var self = this;

		if (value == null)
			return self;

		if (typeof(value) === TYPE_O) {
			OK(value).forEach(function(k) {
				var prev = self.config[k];
				if (!init && self.config[k] !== value[k])
					self.config[k] = value[k];
				if (callback)
					callback(k, value[k], init, init ? undefined : prev);
				else if (self.configure)
					self.configure(k, value[k], init, init ? undefined : prev);
				self.data(T_CONFIG + '.' + k, value[k]);
			});
		} else if (value.charAt(0) === '=') {
			value = value.substring(1).SCOPE(self);
			if (self.watch) {
				self.$rcwatch && self.unwatch(self.$rcwatch, self.rcwatch);
				self.watch(value, self.rcwatch);
				self.$rcwatch = value;
			}
			self.reconfigure(get(value), callback, init);
		} else {
			value.parseConfig(function(k, v) {
				var prev = self.config[k];
				if (!init && self.config[k] !== v)
					self.config[k] = v;
				self.data(T_CONFIG + '.' + k, v);
				if (callback)
					callback(k, v, init, init ? undefined : prev);
				else if (self.configure)
					self.configure(k, v, init, init ? undefined : prev);
			});
		}

		self.$reconfigure();
		return self;
	};

	PPC.$reconfigure = function() {
		var self = this;
		var cfg = self.config;

		self.data(T_CONFIG, cfg);

		if (cfg.$type) {
			self.type = cfg.$type;
			delete cfg.$type;
		}

		if (cfg.$id) {
			self.id = cfg.$id;
			delete cfg.$id;
		}

		if (cfg.$compile == false) {
			self.nocompile();
			delete cfg.$compile;
		}

		if (cfg.$init) {
			self.$init = cfg.$init;
			delete cfg.$init;
		}

		if (cfg.$class) {
			self.tclass(cfg.$class);
			delete cfg.$class;
		}

		if (cfg.$released) {
			self.release(cfg.$released == true);
			delete cfg.$released;
		}

		if (cfg.$reconfigure) {
			EXEC.call(self, cfg.$reconfigure.SCOPE(self), self);
			delete cfg.$reconfigure;
		}
	};

	PPC.closest = SCP.closest = function(sel) {
		return this.element.closest(sel);
	};

	PPC.parent = SCP.parent = function(sel) {
		var self = this;
		if (sel && sel !== 'parent')
			return sel === 'window' ? $(W) : self.element.closest(sel);
		return self.element.parent();
	};

	var TNB = { number: 1, boolean: 1 };

	PPC.html = function(value) {
		var el = this.element;
		if (value === undefined)
			return el.html();
		if (value instanceof Array)
			value = value.join('');
		var type = typeof(value);
		current_element = el[0];
		var v = (value || TNB[type]) ? el.empty().append(value) : el.empty();
		current_element = null;
		return v;
	};

	PPC.text = function(value) {
		var el = this.element;
		if (value === undefined)
			return el.text();
		if (value instanceof Array)
			value = value.join('');
		var type = typeof(value);
		return (value || TNB[type]) ? el.empty().text(value) : el.empty();
	};

	PPC.empty = function() {

		var self = this;

		if (self.$children) {
			for (var i = 0, length = M.components.length; i < length; i++) {
				var m = M.components[i];
				!m.$removed && m.owner === self && m.remove();
			}
			self.$children = 0;
		}

		var el = self.element;
		el.empty();
		return el;
	};

	PPC.append = SCP.append = function(value) {
		var el = this.element;
		if (value instanceof Array)
			value = value.join('');
		current_element = el[0];
		var v = value ? el.append(value) : el;
		current_element = null;
		return v;
	};

	PPC.event = SCP.event = function() {
		var self = this;
		if (self.element)
			self.element.on.apply(self.element, arguments);
		else {
			setTimeout(function(arg) {
				self.event(self, arg);
			}, 500, arguments);
		}
		return self;
	};

	PPC.find = SCP.find = function(selector) {
		return this.element.find(selector);
	};

	PPC.isInvalid = function() {
		var self = this;
		var is = !self.$valid;
		if (is && !self.$validate)
			is = !self.$dirty;
		return is;
	};

	PPC.unwatch = function(path, fn) {
		var self = this;
		OFF('com' + self._id + '#watch', path, fn);
		return self;
	};

	PPC.watch = function(path, fn, init) {

		var self = this;

		if (typeof(path) === TYPE_FN) {
			init = fn;
			fn = path;
			path = self.path;
		} else
			path = self.makepath(path);

		self.on('watch', path, fn, init);
		return self;
	};

	PPC.invalid = function() {
		return INVALID(this.path, this);
	};

	PPC.valid = function(value, noEmit) {

		var self = this;

		if (value === undefined)
			return self.$valid;

		if (self.$valid_disabled)
			return self;

		self.$valid = value;
		self.$validate = false;
		clear(T_VALID);
		!noEmit && self.state && self.stateX(1, 1);
		return self;
	};

	PPC.change = function(value) {
		var self = this;
		self.$dirty_disabled = false;
		self.$dirty = true;
		CHANGE(self.path, value === undefined ? true : value, self);
		return self;
	};

	PPC.dirty = function(value, noEmit) {

		var self = this;

		if (value === undefined)
			return self.$dirty;

		if (self.$dirty_disabled)
			return self;

		self.$dirty = value;
		clear(T_DIRTY);
		!noEmit && self.state && self.stateX(2, 2);
		return self;
	};

	PPC.reset = function() {
		var self = this;
		M.reset(self.path, 0, self);
		return self;
	};

	PPC.setDefault = function(value) {
		this.$default = function() {
			return value;
		};
		return this;
	};

	PPC.default = function(reset) {
		var self = this;
		M.default(self.path, 0, self, reset);
		return self;
	};

	PPC.remove = PPC.kill = function(noClear) {
		var self = this;
		var el = self.element;
		removewaiter(self);
		el.removeData(ATTRDATA);
		el.attr(ATTRDEL, T_TRUE).find(ATTRCOM).attr(ATTRDEL, T_TRUE);
		self.$removed = 1;
		self.removed = true;
		OFF('com' + self._id + '#');
		!noClear && setTimeout2('$cleaner', cleaner2, 100);
		return true;
	};

	PPC.on = function(name, path, fn, init) {
		if (typeof(path) === TYPE_FN) {
			init = fn;
			fn = path;
			path = '';
		} else
			path = path.replace('.*', '');

		var self = this;
		var push = '';

		if (name.charAt(0) === '^') {
			push = '^';
			name = name.substring(1).trim();
		}

		ON(push + 'com' + self._id + '#' + name, path, fn, init, self);
		return self;
	};

	PPC.off = function(name, fn) {
		var self = this;
		OFF('com' + self._id + '#' + name, fn);
		return self;
	};

	PPC.caniuse = function(name) {
		if (M.$components[name])
			return 1;
		if (lazycom[name])
			return 2;
	};

	PPC.formatter = function(value, prepend) {
		var self = this;

		if (typeof(value) === TYPE_FN) {
			!self.$formatter && (self.$formatter = []);
			if (prepend === true)
				self.$formatter.unshift(value);
			else
				self.$formatter.push(value);
			return self;
		}

		var a = self.$formatter;
		if (a && a.length) {
			for (var i = 0, length = a.length; i < length; i++)
				value = a[i].call(self, self.path, value, self.type);
		}

		a = M.$formatter;
		if (a && a.length) {
			for (var i = 0, length = a.length; i < length; i++)
				value = a[i].call(self, self.path, value, self.type);
		}

		return value;
	};

	PPC.parser = function(value, prepend) {

		var self = this;
		var type = typeof(value);

		if (type === TYPE_FN) {
			!self.$parser && (self.$parser = []);

			if (prepend === true)
				self.$parser.unshift(value);
			else
				self.$parser.push(value);

			return self;
		}

		if (self.trim && type === TYPE_S)
			value = value.trim();

		var a = self.$parser;
		if (a && a.length) {
			for (var i = 0, length = a.length; i < length; i++)
				value = a[i].call(self, self.path, value, self.type);
		}

		a = M.$parser;
		if (a && a.length) {
			for (var i = 0, length = a.length; i < length; i++)
				value = a[i].call(self, self.path, value, self.type);
		}

		return value;
	};

	PPC.emit = function() {
		EMIT.apply(M, arguments);
		return this;
	};

	PPC.evaluate = function(path, expression, nopath) {
		if (!expression) {
			expression = path;
			path = this.path;
		}
		return EVALUATE(path, expression, nopath);
	};

	PPC.get = function(path) {
		var self = this;
		if (self.$pp)
			return self.owner.data(self.path);
		path = path ? self.makepath(path) : self.path;
		if (path) {
			var val = get(path);
			return self.$format ? self.$format(val, path, -1, self.scope) : val;
		}
	};

	PPC.skip = function() {
		var self = this;
		self.$skipsetter = true;
		return self;
	};

	PPC.set = function(value, type) {

		var self = this;

		if (self.$pp) {
			self.owner.set(self.path, value);
			return self;
		}

		var arg = arguments;

		// Backwards compatibility
		if (arg.length === 3)
			M.set(self.makepath(arg[0]), arg[1], arg[2]);
		else
			M.set(self.path, value, type);

		return self;
	};

	PPC.inc = function(value, type) {
		var self = this;
		M.inc(self.path, value, type);
		return self;
	};

	PPC.extend = function(value, type) {
		var self = this;
		M.extend(self.path, value, type);
		return self;
	};

	PPC.rewrite = function(value, type) {
		var self = this;
		REWRITE(self.path, value, type);
		return self;
	};

	PPC.push = function(value, type) {
		var self = this;
		M.push(self.path, value, type);
		return self;
	};

	// ===============================================================
	// WINDOW FUNCTIONS
	// ===============================================================

	var ua = navigator.userAgent || '';
	W.isMOBILE = /Mobi/.test(ua);
	W.isROBOT = (/search|agent|bot|crawler|spider/i).test(ua);
	W.isSTANDALONE = navigator.standalone || W.matchMedia('(display-mode: standalone)').matches;
	W.isTOUCH = !!('ontouchstart' in W || navigator.maxTouchPoints);
	W.isIE = (/msie|trident/i).test(ua);

	W.setTimeout2 = function(name, fn, timeout, limit, param) {
		var key = ':' + name;
		if (limit > 0) {
			var key2 = key + ':limit';
			if (statics[key2] >= limit)
				return;
			statics[key2] = (statics[key2] || 0) + 1;
			statics[key] && clearTimeout(statics[key]);
			return statics[key] = setTimeout(function(param) {
				statics[key2] = undefined;
				fn && fn(param);
			}, timeout, param);
		}
		statics[key] && clearTimeout(statics[key]);
		return statics[key] = setTimeout(fn, timeout, param);
	};

	W.clearTimeout2 = function(name) {
		var key = ':' + name;
		if (statics[key]) {
			clearTimeout(statics[key]);
			statics[key] = undefined;
			statics[key + ':limit'] && (statics[key + ':limit'] = undefined);
			return true;
		}
		return false;
	};

	W.CONFIG = function(selector, config) {

		if (typeof(selector) === TYPE_S) {
			var fn = [];
			selector.split(' ').forEach(function(sel) {
				var prop = '';
				switch (sel.trim().charAt(0)) {
					case '*':
						fn.push('com.path.indexOf(\'{0}\')!==-1'.format(sel.substring(1)));
						return;
					case '.':
						// path
						prop = 'path';
						break;
					case '#':
						// id
						prop = 'id';
						break;
					default:
						// name
						prop = '$name';
						break;
				}
				fn.push('com.{0}==\'{1}\''.format(prop, prop === '$name' ? sel : sel.substring(1)));
			});
			selector = FN('com=>' + fn.join('&&'));
		}

		configs.push({ fn: selector, config: config });
	};

	function recompile() {
		setTimeout2('$compile', COMPILE, 700);
	}

	W.EXTENSION = function(name, config, declaration) {

		if (typeof(config) === TYPE_FN) {
			var tmp = declaration;
			declaration = config;
			config = tmp;
		}

		// component_name: DESCRIPTION OF EXTENSION
		var index = name.indexOf(':');
		var note = '';

		if (index !== -1) {
			note = name.substring(index + 1).trim();
			name = name.substring(0, index).trim();
		}

		if (extensions[name])
			extensions[name].push({ config: config, fn: declaration, name: note });
		else
			extensions[name] = [{ config: config, fn: declaration, name: note }];

		for (var i = 0, length = M.components.length; i < length; i++) {
			var m = M.components[i];
			if (!m.$removed || name === m.name){
				config && m.reconfigure(config, undefined, true);
				declaration.call(m, m, m.config, 'ui–' + m.name);
			}
		}

		recompile();
	};

	W.ADD = function(value, element, config, content) {

		if (element instanceof COM || element instanceof Scope || element instanceof Plugin)
			element = element.element;

		if (element instanceof jQuery)
			element = element[0];

		if (element && typeof(element) === TYPE_O && !element.parentNode) {
			content = config;
			config = element;
			element = null;
		}

		if (typeof(config) === TYPE_S) {
			content = config;
			config = null;
		}

		if (value instanceof Array) {
			for (var i = 0; i < value.length; i++)
				ADD(value[i], element, config, content);
		} else {

			var ck = '';

			if (config) {
				ck = T_CONFIG + GUID(10);
				W[ck] = config;
			}

			$(element || document.body).append('<div data---="{0}"{1}>{2}</div>'.format(value, ck ? ' data-jc-config="%' + ck + '"' : '', content || ''));
			recompile();
		}
	};

	W.COMPONENT = function(name, config, declaration, dependencies) {

		if (typeof(config) === TYPE_FN) {
			dependencies = declaration;
			declaration = config;
			config = null;
		}

		// Multiple versions
		if (name.indexOf(',') !== -1) {
			name.split(',').forEach(function(item, index) {
				item = item.trim();
				item && COMPONENT(item, config, declaration, index ? null : dependencies);
			});
			return;
		}

		M.$components[name] && warn('Overwriting component:', name);
		var a = M.$components[name] = { name: name, config: config, declaration: declaration, shared: {}, dependencies: dependencies instanceof Array ? dependencies : null };
		var e = 'component.compile';
		events[e] && EMIT(e, name, a);
	};

	W.WIDTH = function(el) {
		if (!el)
			el = $(W);
		var w = el.width();
		var d = MD.devices;
		return w >= d.md.min && w <= d.md.max ? 'md' : w >= d.sm.min && w <= d.sm.max ? 'sm' : w > d.lg.min ? 'lg' : w <= d.xs.max ? 'xs' : '';
	};

	var regfnplugin = function(v) {
		var l = v.length;
		return pathmaker(v.substring(0, l - 1), 0, 1) + v.substring(l - 1);
	};


	W.FN = function(exp, notrim) {

		exp = exp.replace(REGFNPLUGIN, regfnplugin);
		var index = exp.indexOf('=>');
		if (index === -1)
			return isValue(exp) ? FN('value=>' + rebinddecode(exp), true) : new Function('return ' + (exp.indexOf('(') === -1 ? 'typeof({0})==\'function\'?{0}.apply(this,arguments):{0}'.format(exp) : exp));

		var arg = exp.substring(0, index).trim();
		var val = exp.substring(index + 2).trim();
		var is = false;

		arg = arg.replace(/\(|\)|\s/g, '').trim();
		if (arg)
			arg = arg.split(',');

		if (val.charCodeAt(0) === 123 && !notrim) {
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

	W.RECONFIGURE = function(selector, value) {
		SETTER(true, selector, 'reconfigure', value);
	};

	W.SETTER = function(selector, name) {

		var arg = [];
		var beg = selector === true ? 3 : 2;
		var is;
		var isget;

		for (var i = beg; i < arguments.length; i++)
			arg.push(arguments[i]);

		if (beg === 3) {

			selector = name;

			if (selector.charAt(0) === '!') {
				selector = selector.substring(1);
				is = true;
			}

			if (lazycom[selector] && lazycom[selector].state !== 3) {

				if (lazycom[selector].state === 1) {

					if (is)
						return;

					lazycom[selector].state = 2;
					events.lazy && EMIT('lazy', selector, true);
					warn('Lazy load: ' + selector);
					compile();
				}

				setTimeout(function(arg) {
					arg[0] = true;
					SETTER.apply(W, arg);
				}, 555, arguments);

				return;
			}

			name = arguments[2];
			isget = name.indexOf('.') !== -1;

			FIND(selector, true, function(arr) {
				for (var i = 0, length = arr.length; i < length; i++) {
					var o = arr[i];
					var a = isget ? get(name, o) : o[name];
					if (typeof(a) === TYPE_FN)
						a.apply(o, arg);
					/*
					else if (isget)
						set(name, o);
					else
						o[name] = arg[0];
					*/
				}
			});
		} else {

			if (selector.charAt(0) === '!') {
				selector = selector.substring(1);
				is = true;
			}

			if (lazycom[selector] && lazycom[selector].state !== 3) {

				if (lazycom[selector].state === 1) {

					if (is)
						return;

					lazycom[selector].state = 2;
					events.lazy && EMIT('lazy', selector, true);
					warn('Lazy load: ' + selector);
					compile();
				}

				setTimeout(function(arg) {
					SETTER.apply(W, arg);
				}, 555, arguments);

				return SETTER;
			}

			var arr = FIND(selector, true);
			isget = name.indexOf('.') !== -1;

			for (var i = 0, length = arr.length; i < length; i++) {
				var o = arr[i];
				var a = isget ? get(name, o) : o[name];
				if (typeof(a) === TYPE_FN)
					a.apply(o, arg);

				/*
				else if (isget)
					set(name, o);
				else
					o[name] = arg[0];
				*/
			}
		}
	};

	function exechelper(ctx, path, arg) {
		setTimeout(function() {
			EXEC.call(ctx, true, path, arg[0], arg[1], arg[2], arg[3], arg[4], arg[5], arg[6]);
		}, 200);
	}

	W.EXEC2 = function(path, tmp) {
		var is = path === true;
		return function(a, b, c, d) {
			if (is)
				EXEC(tmp, path, a, b, c, d);
			else
				EXEC(path, a, b, c, d);
		};
	};

	W.SEEX = function(path, a, b, c, d) {
		if (path.indexOf('.') === -1)
			EXEC(path, a, b, c, d);
		else
			SET(path, a);
	};

	W.CMD = function(name, a, b, c, d, e) {
		for (var i = 0, length = M.components.length; i < length; i++) {
			var com = M.components[i];
			if (com && com.$loaded && !com.$removed && com.$commands && com.$commands[name]) {
				var cmd = com.$commands[name];
				for (var j = 0; j < cmd.length; j++)
					cmd[j](a, b, c, d, e);
			}
		}
	};

	W.EXEC = function(path) {

		var arg = [];
		var f = 1;
		var wait = false;
		var p;
		var ctx = this;

		if (path === true) {
			wait = true;
			path = arguments[1];
			f = 2;
		}

		path = path.env();

		if (current_scope)
			path = path.replace(REGSCOPEINLINE, current_scope);

		for (var i = f; i < arguments.length; i++)
			arg.push(arguments[i]);

		var c = path.charCodeAt(0);

		// Event
		if (c === 35) {
			p = path.substring(1);
			if (wait)
				!events[p] && exechelper(ctx, path, arg);
			else
				EMIT.call(ctx, p, arg[0], arg[1], arg[2], arg[3], arg[4]);
			return;
		}

		if (c === 38) {
			CMD.call(ctx, path.substring(1), arg[0], arg[1], arg[2], arg[3], arg[4]);
			return;
		}

		var ok = 0;

		// PLUGINS
		if (c === 64) {
			var index = path.indexOf('.');
			p = path.substring(1, index);
			var ctrl = W.PLUGINS[p];
			if (ctrl) {
				var fn = ctrl[path.substring(index + 1)];
				if (typeof(fn) === TYPE_FN) {
					var tmp = current_scope;
					current_scope = p;
					fn.apply(ctx === W ? ctrl : ctx, arg);
					current_scope = tmp;
					ok = 1;
				}
			}

			wait && !ok && exechelper(ctx, path, arg);
			return;
		}

		// PLUGINS
		var index = path.indexOf('/');
		if (index !== -1) {
			p = path.substring(0, index);
			var ctrl = W.PLUGINS[p];
			var fn = path.substring(index + 1);
			if (ctrl && typeof(ctrl[fn]) === TYPE_FN) {
				var tmp = current_scope;
				current_scope = p;
				ctrl[fn].apply(ctx === W ? ctrl : ctx, arg);
				current_scope = tmp;
				ok = 1;
			}

			wait && !ok && exechelper(ctx, path, arg);
			return;
		}

		if (path.substring(0, 5) === 'FUNC') {
			var fn = FUNC[path.substring(6)];
			if (fn) {
				ok = 1;
				fn.apply(ctx === W ? ctrl : ctx, arg);
			}
			wait && !ok && exechelper(ctx, path, arg);
			return;
		}

		var fn = get(path);

		if (typeof(fn) === TYPE_FN) {
			fn.apply(ctx, arg);
			ok = 1;
		}

		wait && !ok && exechelper(ctx, path, arg);
	};

	W.MAKE = function(obj, fn, update) {

		switch (typeof(obj)) {
			case TYPE_FN:
				fn = obj;
				obj = {};
				break;
			case TYPE_S:
				var p = pathmaker(obj);
				var is = true;
				obj = get(p);
				if (obj == null) {
					is = false;
					obj = {};
				}
				fn.call(obj, obj, p, function(path, value) {
					set2(obj, path, value);
				});
				if (is && (update === undefined || update === true))
					M.update(p, true);
				else {
					if (C.ready)
						set(p, obj);
					else
						M.set(p, obj, true);
				}
				return obj;
		}

		fn.call(obj, obj, '');
		return obj;
	};

	W.OPT = function(obj, fn) {
		if (typeof(obj) === TYPE_FN) {
			fn = obj;
			obj = {};
		}

		var scope = '';
		fn.call(obj, function(path, value) {
			return set2(obj, scope + path, value);
		}, function(s) {
			scope = s == null ? '' : (s + '');
			if (scope)
				scope += '.';
		});
		return obj;
	};

	W.COPY = function(a, b) {
		var keys = OK(a);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var val = a[key];
			var type = typeof(val);
			b[key] = type === TYPE_O ? val ? CLONE(val) : val : val;
		}
		return b;
	};

	W.CLONE = function(obj, path) {

		var type = typeof(obj);
		switch (type) {
			case TYPE_N:
			case TYPE_B:
				return obj;
			case TYPE_S:
				return path ? obj : CLONE(get(pathmaker(obj)), true);
		}

		if (obj == null)
			return obj;

		if (obj instanceof Date)
			return new Date(obj.getTime());

		return PARSE(JSON.stringify(obj));
	};

	W.STRINGIFY = function(obj, compress, fields) {
		compress === undefined && (compress = MD.jsoncompress);
		var tf = typeof(fields);
		return JSON.stringify(obj, function(key, value) {

			if (!key)
				return value;

			if (fields) {
				if (fields instanceof Array) {
					if (fields.indexOf(key) === -1)
						return undefined;
				} else if (tf === TYPE_FN) {
					if (!fields(key, value))
						return undefined;
				} else if (fields[key] === false)
					return undefined;
			}

			if (compress === true) {
				var t = typeof(value);
				if (t === TYPE_S) {
					value = value.trim();
					return value ? value : undefined;
				} else if (value === false || value == null)
					return undefined;
			}

			return value;
		});
	};

	W.PARSE = function(value, date) {

		// Is selector?
		var c = (value || '').charAt(0);
		if (c === '#' || c === '.')
			return PARSE($(value).html(), date);

		date === undefined && (date = MD.jsondate);
		try {
			return JSON.parse(value, function(key, value) {
				return typeof(value) === TYPE_S && date && value.isJSONDate() ? new Date(value) : value;
			});
		} catch (e) {
			return null;
		}
	};

	W.NOOP = function(){};

	W.TOGGLE = function(path, timeout, reset) {
		var v = GET(path);
		SET(path, !v, timeout, reset);
	};

	W.NUL = W.NULL = function(path, timeout) {
		SET(path, null, timeout);
	};

	var timeouts = {};
	var setbind = function(path, value, reset) {
		delete timeouts[path];
		M.set(path, value, reset);
	};

	var incbind = function(path, value, reset) {
		delete timeouts[path];
		M.inc(path, value, reset);
	};

	var extbind = function(path, value, reset) {
		delete timeouts[path];
		M.extend(path, value, reset);
	};

	var pushbind = function(path, value, reset) {
		delete timeouts[path];
		M.push(path, value, reset);
	};

	var updbind = function(path, reset) {
		delete timeouts[path];
		M.update(path, reset);
	};

	W.SET = function(path, value, timeout, reset) {
		var t = typeof(timeout);
		if (t === TYPE_B)
			return M.set(path, value, timeout);
		if (!timeout || timeout < 10 || t !== TYPE_N) // TYPE
			return M.set(path, value, timeout);
		timeouts[path] && clearTimeout(timeouts[path]);
		timeouts[path] = setTimeout(setbind, timeout, path, value, reset);
	};

	W.SETR = function(path, value, type) {
		M.set(path, value, type);
		RESET(path);
	};

	W.INC = function(path, value, timeout, reset) {

		if (value == null)
			value = 1;

		var t = typeof(timeout);
		if (t === TYPE_B)
			return M.inc(path, value, timeout);
		if (!timeout || timeout < 10 || t !== TYPE_N) // TYPE
			return M.inc(path, value, timeout);
		timeouts[path] && clearTimeout(timeouts[path]);
		timeouts[path] = setTimeout(incbind, timeout, path, value, reset);
	};

	W.EXT = W.EXTEND = function(path, value, timeout, reset) {
		var t = typeof(timeout);
		if (t === TYPE_B)
			return M.extend(path, value, timeout);
		if (!timeout || timeout < 10 || t !== TYPE_N) // TYPE
			return M.extend(path, value, timeout);
		timeouts[path] && clearTimeout(timeouts[path]);
		timeouts[path] = setTimeout(extbind, timeout, path, value, reset);
	};

	W.PUSH = function(path, value, timeout, reset) {
		var t = typeof(timeout);
		if (t === TYPE_B)
			return M.push(path, value, timeout);
		if (!timeout || timeout < 10 || t !== TYPE_N) // TYPE
			return M.push(path, value, timeout);
		timeouts[path] && clearTimeout(timeouts[path]);
		timeouts[path] = setTimeout(pushbind, timeout, path, value, reset);
	};

	W.TOGGLE2 = function(path, type) {
		TOGGLE(path, type);
		CHANGE(path);
	};

	W.EXT2 = W.EXTEND2 = function(path, value, type) {
		EXTEND(path, value, type);
		CHANGE(path);
	};

	W.SET2 = function(path, value, type) {
		SET(path, value, type);
		CHANGE(path);
	};

	W.INC2 = function(path, value, type) {
		INC(path, value, type);
		CHANGE(path);
	};

	W.PUSH2 = function(path, value, type) {
		PUSH(path, value, type);
		CHANGE(path);
	};

	W.DEFAULT = function(path, timeout, reset) {
		var arr = path.split(REGMETA);
		if (arr.length > 1) {
			var def = arr[1];
			path = arr[0];
			var index = path.indexOf('.*');
			if (index !== -1)
				path = path.substring(0, index);
			SET(path, new Function('return ' + def)(), timeout > 10 ? timeout : 3, timeout > 10 ? 3 : null);
		}
		M.default(arr[0], timeout, null, reset);
	};

	W.MODIFIED = function(path) {
		var output = [];
		M.each(function(obj) {
			if (!obj.$dirty_disabled && obj.$dirty === false)
				output.push(obj.path);
		}, pathmaker(path));
		return output;
	};

	W.NOTMODIFIED = function(path, value, fields) {

		if (value === undefined) {
			path = pathmaker(path);
			value = get(path);
		}

		if (value === undefined)
			value = null;

		if (fields)
			path = path.concat('#', fields);

		var s = STRINGIFY(value, false, fields);
		var hash = HASH(s);
		var key = 'notmodified.' + path;

		if (cache[key] === hash)
			return true;

		cache[key] = hash;
		return false;
	};

	W.VERSION = function() {
		for (var j = 0; j < arguments.length; j++) {
			var keys = arguments[j].split(',');
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i].trim();
				var tmp = key.indexOf('@');
				if (tmp === -1)
					continue;
				var version = key.substring(tmp + 1);
				key = key.substring(0, tmp);
				version && key && (versions[key] = version);
			}
		}
	};

	W.FIND = function(value, many, noCache, callback) {

		var isWaiting = false;
		var output;

		if (typeof(many) === TYPE_FN) {
			isWaiting = true;
			callback = many;
			many = undefined;
			// noCache = undefined;
			// noCache can be timeout
		} else if (typeof(noCache) === TYPE_FN) {
			var tmp = callback;
			isWaiting = true;
			callback = noCache;
			noCache = tmp;
			// noCache can be timeout
		}

		if (isWaiting) {
			WAIT(function() {
				var val = FIND(value, many, noCache);
				if (lazycom[value] && lazycom[value].state === 1) {
					lazycom[value].state = 2;
					events.lazy && EMIT('lazy', value, true);
					warn('Lazy load: ' + value);
					compile();
				}
				return val instanceof Array ? val.length > 0 : !!val;
			}, function(err) {
				// timeout
				if (!err) {
					var val = FIND(value, many);
					callback.call(val ? val : W, val);
				}
			}, 500, noCache);
			return;
		}

		// Element
		if (typeof(value) === TYPE_O) {
			if (!(value instanceof jQuery))
				value = $(value);
			output = findcomponent(value, '');
			return many ? output : output[0];
		}

		var key, output;

		if (!noCache) {
			key = 'find.' + value + '.' + (many ? 0 : 1);
			output = cache[key];
			if (output)
				return output;
		}

		var r = findcomponent(null, value);
		if (!many)
			r = r[0];
		output = r;
		!noCache && (cache[key] = output);
		return output;
	};

	W.BIND = function(path) {
		if (path instanceof Array) {
			for (var i = 0; i < path.length; i++)
				BIND(path[i]);
			return;
		}
		path = pathmaker(path);
		if (path) {
			var is = path.charCodeAt(0) === 33;
			if (is)
				path = path.substring(1);
			path = path.replace(REGWILDCARD, '');
			path && set(path, get(path), true);
		}
	};


	W.UPD = W.UPDATE = function(path, timeout, reset) {
		var t = typeof(timeout);
		if (t === TYPE_B)
			return M.update(path, timeout);
		if (!timeout || timeout < 10 || t !== TYPE_N) // TYPE
			return M.update(path, reset, timeout);
		timeouts[path] && clearTimeout(timeouts[path]);
		timeouts[path] = setTimeout(updbind, timeout, path, reset);
	};

	W.UPD2 = W.UPDATE2 = function(path, type) {
		UPDATE(path, type);
		CHANGE(path);
	};

	W.CSS = function(value, id) {
		id && $('#css' + id).remove();
		$('<style type="text/css"' + (id ? ' id="css' + id + '"' : '') + '>' + (value instanceof Array ? value.join('') : value) + '</style>').appendTo('head');
	};

	W.HASH = function(s, unsigned) {
		if (!s)
			return 0;
		var type = typeof(s);
		if (type === TYPE_N)
			return s;
		else if (type === TYPE_B)
			return s ? 1 : 0;
		else if (s instanceof Date)
			return s.getTime();
		else if (type === TYPE_O)
			s = STRINGIFY(s);
		var hash = 0, i, char;
		if (!s.length)
			return hash;
		var l = s.length;
		for (i = 0; i < l; i++) {
			char = s.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash |= 0; // Convert to 32bit integer
		}
		return unsigned ? hash >>> 0 : hash;
	};

	W.GUID = function(size) {
		if (!size)
			size = 10;
		var l = ((size / 10) >> 0) + 1;
		var b = [];
		for (var i = 0; i < l; i++)
			b.push(Math.random().toString(36).substring(2));
		return b.join('').substring(0, size);
	};

	W.WAIT = function(fn, callback, interval, timeout) {
		var key = ((Math.random() * 10000) >> 0).toString(16);
		var tkey = timeout > 0 ? key + '_timeout' : 0;

		if (typeof(callback) === TYPE_N) {
			var tmp = interval;
			interval = callback;
			callback = tmp;
		}

		var is = typeof(fn) === TYPE_S;
		var run = false;

		if (is) {
			var result = get(fn);
			if (result)
				run = true;
		} else if (fn())
			run = true;

		var curr_scope = current_scope;

		if (run) {
			callback(null, function(sleep) {
				setTimeout(function() {
					current_scope = curr_scope;
					WAIT(fn, callback, interval, timeout);
				}, sleep || 1);
			});
			return;
		}

		if (tkey) {
			waits[tkey] = setTimeout(function() {
				clearInterval(waits[key]);
				delete waits[tkey];
				delete waits[key];
				callback(new Error('Timeout.'));
			}, timeout);
		}

		waits[key] = setInterval(function() {

			if (is) {
				var result = get(fn);
				if (result == null)
					return;
			} else if (!fn())
				return;

			clearInterval(waits[key]);
			delete waits[key];

			if (tkey) {
				clearTimeout(waits[tkey]);
				delete waits[tkey];
			}

			current_scope = curr_scope;
			callback && callback(null, function(sleep) {
				setTimeout(function() {
					current_scope = curr_scope;
					WAIT(fn, callback, interval);
				}, sleep || 1);
			});

		}, interval || 500);
	};

	var $recompile;

	W.COMPILE = function(container) {
		clearTimeout($recompile);
		return compile(container);
	};

	// ===============================================================
	// PROTOTYPES
	// ===============================================================

	var AP = Array.prototype;
	var SP = String.prototype;
	var NP = Number.prototype;
	var DP = Date.prototype;

	AP.wait = function(onItem, callback, thread, tmp) {

		var self = this;
		var init = false;

		// INIT
		if (!tmp) {

			if (typeof(callback) !== TYPE_FN) {
				thread = callback;
				callback = null;
			}

			tmp = {};
			tmp.pending = 0;
			tmp.index = 0;
			tmp.thread = thread;

			// thread === Boolean then array has to be removed item by item
			init = true;
		}

		var item = thread === true ? self.shift() : self[tmp.index++];

		if (item === undefined) {
			if (!tmp.pending) {
				callback && callback();
				tmp.cancel = true;
			}
			return self;
		}

		tmp.pending++;
		onItem.call(self, item, function() {
			setTimeout(next_wait, 1, self, onItem, callback, thread, tmp);
		}, tmp.index);

		if (!init || tmp.thread === 1)
			return self;

		for (var i = 1; i < tmp.thread; i++)
			self.wait(onItem, callback, 1, tmp);

		return self;
	};

	function next_wait(self, onItem, callback, thread, tmp) {
		tmp.pending--;
		self.wait(onItem, callback, thread, tmp);
	}

	AP.take = function(count) {
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

	AP.skip = function(count) {
		var arr = [];
		var self = this;
		var length = self.length;
		for (var i = 0; i < length; i++)
			i >= count && arr.push(self[i]);
		return arr;
	};

	AP.takeskip = function(take, skip) {
		var arr = [];
		var self = this;
		var length = self.length;
		for (var i = 0; i < length; i++) {
			if (i < skip)
				continue;
			if (arr.length >= take)
				return arr;
			arr.push(self[i]);
		}
		return arr;
	};

	SP.ROOT = function(noBase) {
		var url = this;
		var r = MD.root;
		var b = MD.baseurl;
		var ext = /(https|http|wss|ws|file):\/\/|\/\/[a-z0-9]|[a-z]:/i;
		var replace = function(t) {
			return t.charAt(0) + '/';
		};
		if (r)
			url = typeof(r) === TYPE_FN ? r(url) : ext.test(url) ? url : (r + url);
		else if (!noBase && b)
			url = typeof(b) === TYPE_FN ? b(url) : ext.test(url) ? url : (b + url);
		return url.replace(/[^:]\/{2,}/, replace);
	};

	SP.env = function() {
		var self = this;
		return self.replace(REGENV, function(val) {
			var key = val.substring(1, val.length - 1);
			return (key.charAt(0) === '.' ? GET(key.substring(1)) : ENV[key]) || val;
		});
	};

	SP.$env = function() {
		var self = this;
		var index = this.indexOf('?');
		return index === -1 ? self.env() : self.substring(0, index).env() + self.substring(index);
	};

	SP.COMPILABLE = function() {
		return REGCOM.test(this);
	};

	SP.parseConfig = function(def, callback) {

		var output;

		switch (typeof(def)) {
			case TYPE_FN:
				callback = def;
				output = {};
				break;
			case TYPE_S:
				output = def.parseConfig();
				break;
			case TYPE_O:
				if (def != null)
					output = def;
				else
					output = {};
				break;
			default:
				output = {};
				break;
		}

		var arr = this.env().replace(/\\;/g, '\0').split(';');
		var num = /^(-)?[0-9.]+$/;
		var colon = /(https|http|wss|ws):\/\//gi;

		for (var i = 0, length = arr.length; i < length; i++) {

			var item = arr[i].replace(/\0/g, ';').replace(/\\:/g, '\0').replace(colon, function(text) {
				return text.replace(/:/g, '\0');
			});

			var kv = item.split(':');
			var l = kv.length;

			if (l !== 2)
				continue;

			var k = kv[0].trim();
			var v = kv[1].trim().replace(/\0/g, ':').env();

			if (v === T_TRUE || v === T_FALSE)
				v = v === T_TRUE;
			else if (num.test(v)) {
				var tmp = +v;
				if (!isNaN(tmp))
					v = tmp;
			}

			output[k] = v;
			callback && callback(k, v);
		}

		return output;
	};

	SP.arg = function(obj, encode, def) {

		if (typeof(encode) === TYPE_S)
			def = encode;

		return this.replace(REGPARAMS, function(text) {
			// Is double?
			var l = text.charCodeAt(1) === 123 ? 2 : 1;
			var val = get(text.substring(l, text.length - l).trim(), obj);

			if (encode && encode === 'json')
				return JSON.stringify(val);

			return val == null ? (def == null ? text : def) : encode ? encodeURIComponent(val + '') : val;
		});
	};

	SP.render = function(a, b) {
		return Tangular.render(this, a, b);
	};

	SP.isJSONDate = function() {
		var t = this;
		var l = t.length - 1;
		return l > 18 && l < 30 && t.charCodeAt(l) === 90 && t.charCodeAt(10) === 84 && t.charCodeAt(4) === 45 && t.charCodeAt(13) === 58 && t.charCodeAt(16) === 58;
	};

	SP.parseExpire = function() {

		var str = this.split(' ');
		var number = parseInt(str[0]);

		if (isNaN(number))
			return 0;

		var min = 60000 * 60;

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
				return min * number;
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
				return (min * 24) * number;
			case 'months':
			case 'month':
			case 'MM':
			case 'M':
				return (min * 24 * 28) * number;
			case 'weeks':
			case 'week':
			case 'W':
			case 'w':
				return (min * 24 * 7) * number;
			case 'years':
			case 'year':
			case 'yyyy':
			case 'yy':
			case 'y':
				return (min * 24 * 365) * number;
			default:
				return 0;
		}
	};

	SP.removeDiacritics = function() {
		var buf = '';
		for (var i = 0, length = this.length; i < length; i++) {
			var c = this[i];
			var code = c.charCodeAt(0);
			var isUpper = false;

			var r = DIACRITICS[code];
			if (r === undefined) {
				code = c.toLowerCase().charCodeAt(0);
				r = DIACRITICS[code];
				isUpper = true;
			}

			if (r === undefined) {
				buf += c;
				continue;
			}

			c = r;
			buf += isUpper ? c.toUpperCase() : c;
		}
		return buf;
	};

	SP.toSearch = function() {

		var str = this.replace(REGSEARCH, '').trim().toLowerCase().removeDiacritics();
		var buf = [];
		var prev = '';

		for (var i = 0, length = str.length; i < length; i++) {
			var c = str.substring(i, i + 1);
			if (c === 'y')
				c = 'i';
			if (c !== prev) {
				prev = c;
				buf.push(c);
			}
		}

		return buf.join('');
	};

	SP.slug = function(max) {
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
			} else if (code > 47 && code < 58)
				builder += c;
			else if (code > 94 && code < 123)
				builder += c;
		}

		var l = builder.length - 1;
		return builder[l] === '-' ? builder.substring(0, l) : builder;
	};

	SP.isEmail = function() {
		var str = this;
		return str.length <= 4 ? false : MV.email.test(str);
	};

	SP.isPhone = function() {
		var str = this;
		return str.length < 6 ? false : MV.phone.test(str);
	};

	SP.isURL = function() {
		var str = this;
		return str.length <= 7 ? false : MV.url.test(str);
	};

	SP.parseInt = function(def) {
		var str = this.trim();
		var val = str.match(M.regexp.int);
		if (!val)
			return def || 0;
		val = +val[0];
		return isNaN(val) ? def || 0 : val;
	};

	SP.parseFloat = function(def) {
		var str = this.trim();
		var val = str.match(M.regexp.float);
		if (!val)
			return def || 0;
		val = val[0];
		if (val.indexOf(',') !== -1)
			val = val.replace(',', '.');
		val = +val;
		return isNaN(val) ? def || 0 : val;
	};

	AP.trim = function(empty) {
		var self = this;
		var output = [];
		for (var i = 0, length = self.length; i < length; i++) {
			if (typeof(self[i]) === TYPE_S)
				self[i] = self[i].trim();
			if (empty || self[i])
				output.push(self[i]);
		}
		return output;
	};

	AP.findIndex = function(cb, value) {

		var self = this;
		var isFN = typeof(cb) === TYPE_FN;
		var isV = value !== undefined;

		for (var i = 0, length = self.length; i < length; i++) {
			if (isFN) {
				if (cb.call(self, self[i], i))
					return i;
			} else if (isV) {
				if (self[i][cb] === value)
					return i;
			} else if (self[i] === cb)
				return i;
		}
		return -1;
	};

	AP.findAll = function(cb, value) {

		var self = this;
		var isFN = typeof(cb) === TYPE_FN;
		var isV = value !== undefined;
		var arr = [];

		for (var i = 0, length = self.length; i < length; i++) {
			if (isFN) {
				cb.call(self, self[i], i) && arr.push(self[i]);
			} else if (isV) {
				self[i][cb] === value && arr.push(self[i]);
			} else
				self[i] === cb && arr.push(self[i]);
		}
		return arr;
	};

	AP.findItem = function(cb, value) {
		var index = this.findIndex(cb, value);
		if (index !== -1)
			return this[index];
	};

	AP.findValue = function(cb, value, path, def, cache) {

		if (typeof(cb) === TYPE_FN) {
			def = path;
			path = value;
			value = undefined;
			cache = false;
		}

		var key, val = def;

		if (cache) {
			key = 'fv_' + cb + '=' + value;
			if (temp[key])
				return temp[key];
		}

		var index = this.findIndex(cb, value);
		if (index !== -1) {
			var item = this[index];
			if (path.indexOf('.') === -1)
				item = item[path];
			else
				item = get(path, item);
			cache && (temp[key] = val);
			val = item == null ? def : item;
		}

		return val;
	};

	AP.remove = function(cb, value) {

		var self = this;
		var arr = [];
		var isFN = typeof(cb) === TYPE_FN;
		var isV = value !== undefined;

		for (var i = 0, length = self.length; i < length; i++) {
			if (isFN) {
				!cb.call(self, self[i], i) && arr.push(self[i]);
			} else if (isV) {
				self[i][cb] !== value && arr.push(self[i]);
			} else {
				self[i] !== cb && arr.push(self[i]);
			}
		}
		return arr;
	};

	DP.toNumber = function(format) {
		return +this.format(format || 'yyyyMMdd');
	};

	DP.parseDate = function() {
		return this;
	};

	DP.add = function(type, value) {

		if (value === undefined) {
			var arr = type.split(' ');
			type = arr[1];
			value = parseInt(arr[0]);
		}

		if (typeof(value) === TYPE_S)
			value = value.env();

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

	DP.format = function(format, utc) {

		var self = utc ? this.toUTC() : this;

		if (format == null)
			format = MD.dateformat;

		if (!format || format === 'iso')
			return self.getFullYear() + '-' + (self.getMonth() + 1).toString().padLeft(2, '0') + '-' + self.getDate().toString().padLeft(2, '0') + 'T' + self.getHours().toString().padLeft(2, '0') + ':' + self.getMinutes().toString().padLeft(2, '0') + ':' + self.getSeconds().toString().padLeft(2, '0') + '.' + self.getMilliseconds().toString().padLeft(3, '0') + 'Z';

		var key = 'dt_' + format;

		if (statics[key])
			return statics[key](self);

		var half = false;

		format = format.env();

		if (format && format.charAt(0) === '!') {
			half = true;
			format = format.substring(1);
		}

		var beg = '\'+';
		var end = '+\'';
		var before = [];

		var ismm = false;
		var isdd = false;
		var isww = false;

		format = format.replace(M.regexp.date, function(key) {
			switch (key) {
				case 'yyyy':
					return beg + 'd.getFullYear()' + end;
				case 'yy':
					return beg + 'd.getFullYear().toString().substring(2)' + end;
				case 'MMM':
					ismm = true;
					return beg + 'mm.substring(0, 3)' + end;
				case 'MMMM':
					ismm = true;
					return beg + 'mm' + end;
				case 'MM':
					return beg + '(d.getMonth() + 1).padLeft(2, \'0\')' + end;
				case 'M':
					return beg + '(d.getMonth() + 1)' + end;
				case 'ddd':
					isdd = true;
					return beg + 'dd.substring(0, 2).toUpperCase()' + end;
				case 'dddd':
					isdd = true;
					return beg + 'dd' + end;
				case 'dd':
					return beg + 'd.getDate().padLeft(2, \'0\')' + end;
				case 'd':
					return beg + 'd.getDate()' + end;
				case 'HH':
				case 'hh':
					return beg + (half ? 'W.$jcdatempam(d.getHours()).padLeft(2, \'0\')' : 'd.getHours().padLeft(2, \'0\')') + end;
				case 'H':
				case 'h':
					return beg + (half ? 'W.$jcdatempam(d.getHours())' : 'd.getHours()') + end;
				case 'mm':
					return beg + 'd.getMinutes().padLeft(2, \'0\')' + end;
				case 'm':
					return beg + 'd.getMinutes()' + end;
				case 'ss':
					return beg + 'd.getSeconds().padLeft(2, \'0\')' + end;
				case 's':
					return beg + 'd.getSeconds()' + end;
				case 'w':
				case 'ww':
					isww = true;
					return beg + (key === 'ww' ? 'ww.padLeft(2, \'0\')' : 'ww') + end;
				case 'a':
					var b = '\'PM\':\'AM\'';
					return beg + '(d.getHours()>=12 ? ' + b + ')' + end;
			}
		});

		ismm && before.push('var mm=W.MONTHS[d.getMonth()];');
		isdd && before.push('var dd=W.DAYS[d.getDay()];');
		isww && before.push('var ww=new Date(+d);ww.setHours(0,0,0);ww.setDate(ww.getDate()+4-(ww.getDay()||7));ww=Math.ceil((((ww-new Date(ww.getFullYear(),0,1))/8.64e7)+1)/7);');

		statics[key] = new Function('d', before.join('\n') + 'return \'' + format + '\';');
		return statics[key](self);
	};

	W.$jcdatempam = function(value) {
		return value >= 12 ? value - 12 : value;
	};

	NP.pluralize = function(zero, one, few, other) {

		if (!one && typeof(zero) === TYPE_S) {
			// Environment
			if (zero.charAt(0) === '[')
				zero = zero.env();
			zero = zero.split(',');
		}

		if (zero instanceof Array) {
			one = zero[1];
			few = zero[2];
			other = zero[3];
			zero = zero[0];
		}

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

		return value.indexOf('#') === -1 ? value : value.replace(M.regexp.pluralize, function(text) {
			return text === '##' ? num.format() : num.toString();
		});

	};

	NP.currency = function(currency, a, b, c) {
		if (currency == null)
			currency = MD.currency || '';
		if (currency.charAt(0) === '[')
			currency = currency.env();
		var curr = MD.currencies[currency];
		return curr ? curr(this, a, b, c) : this.format(2);
	};

	NP.format = function(decimals, separator, separatorDecimal) {

		var self = this;
		var num = self.toString();
		var dec = '';
		var output = '';
		var minus = num.charAt(0) === '-' ? '-' : '';
		if (minus)
			num = num.substring(1);

		var index = num.indexOf('.');

		if (typeof(decimals) === TYPE_S) {
			var tmp;
			if (decimals.charAt(0) === '[') {
				tmp = ENV(decimals.substring(1, decimals.length - 1));
				if (tmp) {
					if (tmp >= 0) {
						decimals = tmp;
					} else {
						decimals = tmp.decimals;
						if (tmp.separator)
							separator = tmp.separator;
						if (tmp.decimalseparator)
							separatorDecimal = tmp.decimalseparator;
					}
				}
			} else {
				tmp = separator;
				separator = decimals;
				decimals = tmp;
			}
		}

		if (separator === undefined)
			separator = MD.thousandsseparator;

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
			separatorDecimal = MD.decimalseparator;

		return minus + output + (dec.length ? separatorDecimal + dec : '');
	};

	SP.SCOPE = function(element) {
		var t = this;
		if (t.indexOf('?') === -1 || element == null)
			return t;
		if (element instanceof COM)
			return element.scope ? element.scope.makepath(t) : element.scopepath(t);
		else if (element instanceof Plugin)
			return t.replace(REGSCOPEINLINE, element.name);
		else if (element instanceof jQuery || element.nodeName) {
			var tmp = $(element).scope();
			return tmp ? tmp.makepath(t) : t;
		}
		return element.makepath ? element.makepath(t) : t;
	};

	SP.padLeft = function(t, e) {
		var r = this.toString();
		return Array(Math.max(0, t - r.length + 1)).join(e || ' ') + r;
	};

	SP.padRight = function(t, e) {
		var r = this.toString();
		return r + Array(Math.max(0, t - r.length + 1)).join(e || ' ');
	};

	NP.padLeft = function(t, e) {
		return this.toString().padLeft(t, e || '0');
	};

	NP.padRight = function(t, e) {
		return this.toString().padRight(t, e || '0');
	};

	NP.add = NP.inc = function(value, decimals) {

		var self = this;

		if (value == null)
			return self;

		if (typeof(value) === TYPE_N)
			return self + value;

		var first = value.charCodeAt(0);
		var is = false;

		if (first < 48 || first > 57) {
			is = true;
			value = value.substring(1);
		}

		var length = value.length;
		var num;

		if (value[length - 1] === '%') {
			value = value.substring(0, length - 1);
			if (is) {
				var val = value.parseFloat();
				switch (first) {
					case 42:
						num = self * ((self / 100) * val);
						break;
					case 43:
						num = self + ((self / 100) * val);
						break;
					case 45:
						num = self - ((self / 100) * val);
						break;
					case 47:
						num = self / ((self / 100) * val);
						break;
				}
				return decimals !== undefined ? num.floor(decimals) : num;
			} else {
				num = (self / 100) * value.parseFloat();
				return decimals !== undefined ? num.floor(decimals) : num;
			}

		} else
			num = value.parseFloat();

		switch (first) {
			case 42:
				num = self * num;
				break;
			case 43:
				num = self + num;
				break;
			case 45:
				num = self - num;
				break;
			case 47:
				num = self / num;
				break;
			default:
				num = self;
				break;
		}

		return decimals !== undefined ? num.floor(decimals) : num;
	};

	NP.floor = function(decimals) {
		return Math.floor(this * Math.pow(10, decimals)) / Math.pow(10, decimals);
	};

	NP.parseDate = function(offset) {
		return new Date(this + (offset || 0));
	};

	SP.format = function() {
		var arg = arguments;
		return this.replace(M.regexp.format, function(text) {
			var value = arg[+text.substring(1, text.length - 1)];
			return value == null ? '' : value instanceof Array ? value.join('') : value;
		});
	};

	function parseDateFormat(format, val) {

		format = format.env().split(REG_DATE);

		var tmp = val.split(REG_DATE);
		var dt = {};

		for (var i = 0; i < format.length; i++) {
			var type = format[i];
			if (tmp[i])
				dt[type.charAt(0)] = +tmp[i];
		}

		var h = dt.h || dt.H;

		if (h != null) {
			var ampm = val.match(REG_TIME);
			if (ampm) {
				if (ampm[0].toLowerCase() === 'pm')
					h += 12;
			}
		}

		return new Date(dt.y || 0, (dt.M || 1) - 1, dt.d || 0, h || 0, dt.m || 0, dt.s || 0);
	}

	SP.parseDate = function(format) {

		if (format)
			return parseDateFormat(format, this);

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

		var ampm = null;
		var tmp;

		self = self.replace(/(\s)(am|pm)/i, function(text) {
			ampm = text.trim().toLowerCase();
			return '';
		});

		var arr = self.indexOf(' ') === -1 ? self.split('T') : self.split(' ');
		var index = arr[0].indexOf(':');
		var length = arr[0].length;

		if (index !== -1) {
			tmp = arr[1];
			arr[1] = arr[0];
			arr[0] = tmp;
		}

		if (arr[0] === undefined)
			arr[0] = '';

		var noTime = arr[1] === undefined ? true : arr[1].length === 0;

		for (var i = 0; i < length; i++) {
			var c = arr[0].charCodeAt(i);
			if ((c > 47 && c < 58) || c === 45 || c === 46)
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

		if (ampm) {
			// 12 hours time
			tmp = +time[0];
			if (ampm === 'pm')
				time[0] = tmp + 12;
		}

		parsed.push(+date[firstDay ? 2 : 0]); // year
		parsed.push(+date[1]); // month
		parsed.push(+date[firstDay ? 0 : 2]); // day
		parsed.push(+time[0]); // hours
		parsed.push(+time[1]); // minutes
		parsed.push(+time[2]); // seconds
		parsed.push(+time[3]); // miliseconds

		var def = W.NOW = new Date();

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

	AP.last = function(def) {
		var item = this[this.length - 1];
		return item === undefined ? def : item;
	};

	AP.quicksort = function(name, asc, type) {

		var self = this;
		var length = self.length;
		if (!length || length === 1)
			return self;

		if (typeof(name) === TYPE_B) {
			asc = name;
			name = undefined;
		}

		if (asc == null || asc === 'asc')
			asc = true;
		else if (asc === 'desc')
			asc = false;

		switch (type) {
			case 'date':
				type = 4;
				break;
			case TYPE_S:
				type = 1;
				break;
			case TYPE_N:
				type = 2;
				break;
			case 'bool':
			case TYPE_B:
				type = 3;
				break;
			default:
				type = 0;
				break;
		}

		if (!type) {
			var index = 0;
			while (!type) {
				var field = self[index++];
				if (field === undefined)
					return self;
				if (name)
					field = field[name];
				switch (typeof(field)) {
					case TYPE_S:
						type = field.isJSONDate() ? 4 : 1;
						break;
					case TYPE_N:
						type = 2;
						break;
					case TYPE_B:
						type = 3;
						break;
					default:
						if (field instanceof Date)
							type = 4;
						break;
				}
			}
		}

		self.sort(function(a, b) {

			var va = name ? a[name] : a;
			var vb = name ? b[name] : b;

			if (va == null)
				return asc ? -1 : 1;

			if (vb == null)
				return asc ? 1 : -1;

			// String
			if (type === 1) {
				return va && vb ? (asc ? LCOMPARER(va, vb) : LCOMPARER(vb, va)) : 0;
			} else if (type === 2) {
				return va > vb ? (asc ? 1 : -1) : va < vb ? (asc ? -1 : 1) : 0;
			} else if (type === 3) {
				return va === true && vb === false ? (asc ? 1 : -1) : va === false && vb === true ? (asc ? -1 : 1) : 0;
			} else if (type === 4) {
				if (!va || !vb)
					return 0;
				if (!va.getTime)
					va = new Date(va);
				if (!vb.getTime)
					vb = new Date(vb);
				var at = va.getTime();
				var bt = vb.getTime();
				return at > bt ? (asc ? 1 : -1) : at < bt ? (asc ? -1 : 1) : 0;
			}
			return 0;
		});

		return self;
	};

	AP.attr = function(name, value) {

		var self = this;

		if (arguments.length === 2) {
			if (value == null)
				return self;
		} else if (value === undefined)
			value = name.toString();

		self.push(name + '="' + value.toString().env().toString().replace(/[<>&"]/g, function(c) {
			switch (c) {
				case '&': return '&amp;';
				case '<': return '&lt;';
				case '>': return '&gt;';
				case '"': return '&quot;';
			}
			return c;
		}) + '"');

		return self;
	};

	// Waits for jQuery
	WAIT(function() {
		return !!W.jQuery;
	}, function() {

		// Fixed IE <button tags
		W.isIE && $(W).on('keydown', function(e) {
			if (e.keyCode === 13) {
				var n = e.target.tagName;
				if (n === 'BUTTON' || n === 'INPUT' || n === 'SELECT')
					e.preventDefault();
			}
		});

		$.fn.FIND = function(selector, many, callback, timeout) {

			if (typeof(many) === TYPE_FN) {
				timeout = callback;
				callback = many;
				many = undefined;
			}

			var self = this;
			var output = findcomponent(self, selector);

			if (typeof(callback) === TYPE_FN) {

				if (output.length) {
					var val = many ? output : output[0];
					callback.call(val, val);
					return self;
				}

				WAIT(function() {
					var val = self.FIND(selector, many);
					return val instanceof Array ? val.length > 0 : !!val;
				}, function(err) {
					// timeout
					if (!err) {
						var val = self.FIND(selector, many);
						callback.call(val ? val : W, val);
					}
				}, 500, timeout);

				return self;
			}

			return many ? output : output[0];
		};

		var com_exec = function(com, name, arg) {
			if (com instanceof Array) {
				for (var i = 0; i < com.length; i++) {
					var ci = com[i];
					if (ci[name])
						ci[name].apply(ci, arg);
				}
			} else if (com[name])
				com[name].apply(com, arg);
		};

		$.fn.EMIT = function(name, a, b, c, d) {
			var is = name.charAt(0) === '^';
			if (is)
				name = name.substring(1).trim();
			return this.EXEC((is ? '^' : '') + 'emit', name, a, b, c, d);
		};

		$.fn.EXEC = function(name) {

			var self = this;
			var arg = [];
			var parent = name.charAt(0) === '^';
			if (parent)
				name = name.substring(1).trim();

			for (var i = 1; i < arguments.length; i++)
				arg.push(arguments[i]);

			for (var j = 0; j < self.length; j++) {
				var el = self[j];
				if (parent) {
					while (true) {
						el = el.parentNode;
						if (el == null || el.tagName === 'HTML')
							break;
						el.$com && com_exec(el.$com, name, arg);
					}
				} else {
					// childs
					var fn = function(el) {
						for (var i = 0; i < el.children.length; i++) {
							var cur = el.children[i];
							cur.$com && cur.getAttribute(ATTRJCBIND) == null && com_exec(cur.$com, name, arg);
							if (cur.children && cur.children.length)
								fn(cur);
						}
					};
					fn(el);
				}
			}

			return self;
		};

		$.fn.CMD = function(name, a, b, c, d, e) {
			var self = this;
			var arr = self.FIND('*', true);
			for (var i = 0, length = arr.length; i < length; i++) {
				var o = arr[i];
				var cmd = o.$commands ? o.$commands[name] : null;
				if (cmd && cmd.length) {
					for (var j = 0; j < cmd.length; j++)
						cmd[j](a, b, c, d, e);
				}
			}
		};

		$.fn.SETTER = function(selector, name) {

			var self = this;
			var arg = [];
			var beg = selector === true ? 3 : 2;
			var tmp;
			var isget;

			for (var i = beg; i < arguments.length; i++)
				arg.push(arguments[i]);

			if (beg === 3) {
				selector = name;
				name = arguments[2];

				tmp = selector;
				if (tmp.charAt(0) === '^')
					selector = selector.substring(1).trim();

				if (lazycom[selector] && lazycom[selector].state !== 3) {

					if (lazycom[selector].state === 1) {
						lazycom[selector].state = 2;
						events.lazy && EMIT('lazy', selector, true);
						warn('Lazy load: ' + selector);
						compile();
					}

					setTimeout(function(arg) {
						$.fn.SETTER.apply(self, arg);
					}, 555, arguments);

					return self;
				}

				isget = name.indexOf('.') !== -1;

				self.FIND(tmp, true, function(arr) {
					for (var i = 0, length = arr.length; i < length; i++) {
						var o = arr[i];
						var a = isget ? get(name, o) : o[name];
						if (typeof(a) === TYPE_FN)
							a.apply(o, arg);
						/*else if (isget)
							set(name, o);
						else
							o[name] = arg[0];*/
					}
				});

			} else {

				tmp = selector;
				if (tmp.charAt(0) === '^')
					selector = selector.substring(1).trim();

				if (lazycom[selector] && lazycom[selector].state !== 3) {

					if (lazycom[selector].state === 1) {
						lazycom[selector].state = 2;
						events.lazy && EMIT('lazy', selector, true);
						warn('Lazy load: ' + selector);
						compile();
					}

					setTimeout(function(arg) {
						$.fn.SETTER.apply(self, arg);
					}, 555, arguments);

					return self;
				}

				var arr = self.FIND(tmp, true);
				isget = name.indexOf('.') !== -1;

				for (var i = 0, length = arr.length; i < length; i++) {
					var o = arr[i];
					var a = isget ? get(name, o) : o[name];
					if (typeof(a) === TYPE_FN)
						a.apply(o, arg);
					/*else if (isget)
						set(name, o);
					else
						o[name] = arg[0];*/
				}
			}

			return self;
		};

		$.fn.RECONFIGURE = function(selector, value) {
			return this.SETTER(selector, 'reconfigure', value);
		};

		$.fn.scope = function() {
			var el = this;
			if (!el.length)
				return null;

			el = el[0];

			var data = el.$scopedata;
			if (data)
				return data;

			el = el.parentNode;

			while (el && el.tagName !== T_BODY) {
				if (el.$scopedata)
					return el.$scopedata;
				if (el.$noscope)
					return null;
				el = el.parentNode;
			}

			return null;
		};

		$.fn.aclass = function(a) {
			return this.addClass(a);
		};

		$.fn.rclass = function(a) {
			return a == null ? this.removeClass() : this.removeClass(a);
		};

		$.fn.rattr = function(a) {
			return this.removeAttr(a);
		};

		$.fn.rattrd = function() {
			for (var i = 0; i < arguments.length; i++)
				this.removeAttr(T_DATA + arguments[i]);
			return this;
		};

		$.fn.rclass2 = function(a) {

			var self = this;
			var arr = (self.attr(T_CLASS) || '').split(' ');
			var isReg = typeof(a) === TYPE_O;

			for (var i = 0, length = arr.length; i < length; i++) {
				var cls = arr[i];
				if (cls) {
					if (isReg) {
						a.test(cls) && self.rclass(cls);
					} else {
						cls.indexOf(a) !== -1 && self.rclass(cls);
					}
				}
			}

			return self;
		};

		$.fn.hclass = function(a) {
			return this.hasClass(a);
		};

		$.fn.tclass = function(a, v) {
			return this.toggleClass(a, v);
		};

		$.fn.attrd = function(a, v) {
			a = T_DATA + a;
			return v == null ? this.attr(a) : this.attr(a, v);
		};

		// Appends an SVG element
		$.fn.asvg = function(tag) {

			if (tag.indexOf('<') === -1) {
				var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
				this.append(el);
				return $(el);
			}

			var d = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
			d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + tag + '</svg>';
			var f = document.createDocumentFragment();
			while (d.firstChild.firstChild)
				f.appendChild(d.firstChild.firstChild);
			f = $(f);
			this.append(f);
			return f;
		};

		$.fn.psvg = function(tag) {

			if (tag.indexOf('<') === -1) {
				var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
				this.prepend(el);
				return $(el);
			}

			var d = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
			d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + tag + '</svg>';
			var f = document.createDocumentFragment();
			while (d.firstChild.firstChild)
				f.appendChild(d.firstChild.firstChild);
			f = $(f);
			this.prepend(f);
			return f;
		};

		function findinstance(t, type) {

			if (!t.length)
				return null;

			for (var i = 0; i < t.length; i++) {
				if (t[i][type])
					return t[i][type];
			}

			var el = t[0].parentElement;
			while (el !== null) {
				if (el[type])
					return el[type];
				el = el.parentElement;
			}

			return null;
		}

		$.fn.binder = function() {
			return findinstance(this, '$jcbind');
		};

		$.fn.vbind = function() {
			return findinstance(this, '$vbind');
		};

		$.fn.vbindarray = function() {
			return findinstance(this, '$' + T_VBINDARR);
		};

		$.fn.component = function() {
			return findinstance(this, '$com');
		};

		$.fn.components = function(fn) {
			var all = this.find(ATTRCOM);
			var output = null;
			for (var i = 0; i < all.length; i++) {
				var com = all[i].$com;
				if (com) {
					var isarr = com instanceof Array;
					if (isarr) {
						com.forEach(function(o) {
							if (o && o.$ready && !o.$removed) {
								if (fn) {
									fn.call(o, i);
								} else {
									if (!output)
										output = [];
									output.push(o);
								}
							}
						});
					} else if (com && com.$ready && !com.$removed) {
						if (fn) {
							fn.call(com, i);
						} else {
							if (!output)
								output = [];
							output.push(com);
						}
					}
				}
			}
			return fn ? all : output;
		};

		$.components = M;

		setInterval(function() {
			W.NOW = new Date();
			var c = M.components;
			for (var i = 0, length = c.length; i < length; i++)
				c[i].knockknock && c[i].knockknock(knockknockcounter);
			EMIT('knockknock', knockknockcounter++);
			if (knockknockcounter % 5 === 0) {
				paths = {};
				cleaner();
			}
			temp = {};
		}, 60000);

		$.fn.noscrollbar = function(force) {
			var t = this;
			var sw = SCROLLBARWIDTH();

			cssnoscrollbar['overflow-y'] = sw ? 'scroll' : 'auto';

			if (sw && (W.isIE || (/Edge/).test(ua)))
				sw = 0;

			for (var i = 0; i < t.length; i++) {
				var m = t[i];
				if (m && !HIDDEN(m)) {
					var el = $(m);
					var w = $(el[0].parentNode).width();
					if (force || m.$noscrollbarwidth !== w) {
						m.$noscrollbarwidth = w;
						cssnoscrollbar.width = Math.ceil(w + sw) + 'px';
						el.css(cssnoscrollbar);
						if ((el.attr(T_CLASS) || '').indexOf(clsnoscrollbar) === -1)
							el.aclass(clsnoscrollbar);
					}
				}
			}
			return t;
		};

		function displaymode() {
			var d = WIDTH();
			var b = $(document.body);
			b.rclass('jc-lg jc-md jc-sm jc-xs');
			b.aclass('jc-' + d);
		}

		function resize() {
			var w = $(W);
			W.WW = w.width();
			W.WH = w.height();
			setTimeout2(clsnoscrollbar, function() {
				$(selnoscrollbar).noscrollbar();
				displaymode();
			}, 300);
		}

		resize();

		function parseUA() {
			var arr = ua.match(/[a-z]+/gi);
			if (arr) {
				var data = {};
				for (var i = 0; i < arr.length; i++) {
					var uai = arr[i];

					if (uai === 'like' && arr[i + 1] === 'Gecko') {
						i += 1;
						continue;
					}

					var key = uai.toLowerCase();
					if (key === 'like')
						break;

					switch (key) {
						case 'linux':
						case 'windows':
						case 'mac':
						case 'symbian':
						case 'symbos':
						case 'tizen':
						case 'android':
							data[uai] = 2;
							if (key === 'tizen' || key === 'android')
								data.Mobile = 1;
							break;
						case 'webos':
							data.WebOS = 2;
							break;
						case 'media':
						case 'center':
						case 'tv':
						case 'smarttv':
						case 'smart':
							data[uai] = 5;
							break;
						case 'iemobile':
						case 'mobile':
							data[uai] = 1;
							data.Mobile = 3;
							break;
						case 'ipad':
						case 'ipod':
						case 'iphone':
							data.iOS = 2;
							data.Mobile = 3;
							data[uai] = 1;
							if (key === 'ipad')
								data.Tablet = 4;
							break;
						case 'phone':
							data.Mobile = 3;
							break;
						case 'tizenbrowser':
						case 'blackberry':
						case 'mini':
							data.Mobile = 3;
							data[uai] = 1;
							break;
						case 'samsungbrowser':
						case 'chrome':
						case 'firefox':
						case 'msie':
						case 'opera':
						case 'outlook':
						case 'safari':
						case 'mail':
						case 'edge':
						case 'electron':
							data[uai] = 1;
							break;
						case 'trident':
							data.MSIE = 1;
							break;
						case 'opr':
							data.Opera = 1;
							break;
						case 'tablet':
							data.Tablet = 4;
							break;
					}
				}

				if (data.MSIE) {
					data.IE = 1;
					delete data.MSIE;
				}

				if (data.WebOS || data.Android)
					delete data.Linux;

				if (data.IEMobile) {
					if (data.Android)
						delete data.Android;
					if (data.Safari)
						delete data.Safari;
					if (data.Chrome)
						delete data.Chrome;
				} else if (data.MSIE) {
					if (data.Chrome)
						delete data.Chrome;
					if (data.Safari)
						delete data.Safari;
				} else if (data.Edge) {
					if (data.Chrome)
						delete data.Chrome;
					if (data.Safari)
						delete data.Safari;
				} else if (data.Opera || data.Electron) {
					if (data.Chrome)
						delete data.Chrome;
					if (data.Safari)
						delete data.Safari;
				} else if (data.Chrome) {
					if (data.Safari)
						delete data.Safari;
				} else if (data.SamsungBrowser) {
					if (data.Safari)
						delete data.Safari;
				}
			}

			var keys = Object.keys(data);
			var output = { os: '', browser: '', device: 'desktop' };

			if (data.Tablet)
				output.device = 'tablet';
			else if (data.Mobile)
				output.device = 'mobile';

			for (var i = 0; i < keys.length; i++) {
				var val = data[keys[i]];
				switch (val) {
					case 1:
						output.browser += (output.browser ? ' ' : '') + keys[i];
						break;
					case 2:
						output.os += (output.os ? ' ' : '') + keys[i];
						break;
					case 5:
						output.device = 'tv';
						break;
				}
			}
			MAIN.ua = output;
		}

		$(W).on(T_RESIZE, resize);

		$(document).ready(function() {

			var body = $(document.body);

			if (isPRIVATEMODE)
				body.aclass('jc-nostorage');

			if (isTOUCH)
				body.aclass('jc-touch');

			if (isSTANDALONE)
				body.aclass('jc-standalone');

			parseUA();

			var pua = MAIN.ua;
			pua.browser && body.aclass('jc-' + pua.browser.toLowerCase());
			pua.os && body.aclass('jc-' + pua.os.toLowerCase());
			pua.device && body.aclass('jc-' + pua.device.toLowerCase());

			var cd = (function () {
				var cookies = navigator.cookieEnabled;
				if (!cookies) {
					document.cookie = ATTRDATA;
					cookies = document.cookie.indexOf(ATTRDATA) != -1;
				}
				return cookies;
			})();

			if (!cd)
				body.aclass('jc-nocookies');

			if ($ready) {
				clearTimeout($ready);
				$ready = null;
				load();
			}

			var SELECTOR = 'input[' + ATTRJCBIND + '],textarea[' + ATTRJCBIND + '],select[' + ATTRJCBIND + ']';

			$(document).on('input', 'input[' + ATTRJCBIND + '],textarea[' + ATTRJCBIND + ']', function() {

				// realtime binding
				var self = this;
				var com = self.$com;

				if (!com || com.$removed || !com.getter || self.$jckeypress === false)
					return;

				self.$jcevent = 2;

				if (self.$jckeypress === undefined) {
					var tmp = attrcom(self, 'keypress');
					if (tmp)
						self.$jckeypress = tmp === T_TRUE;
					else if (com.config.$realtime != null)
						self.$jckeypress = com.config.$realtime === true;
					else if (com.config.$binding)
						self.$jckeypress = com.config.$binding === 1;
					else
						self.$jckeypress = MD.keypress;
					if (self.$jckeypress === false)
						return;
				}

				if (self.$jcdelay === undefined)
					self.$jcdelay = +(attrcom(self, 'keypress-delay') || com.config.$delay || MD.delay);

				if (self.$jconly === undefined)
					self.$jconly = attrcom(self, 'keypress-only') === T_TRUE || com.config.$keypress === true || com.config.$binding === 2;

				self.$jctimeout && clearTimeout(self.$jctimeout);
				self.$jctimeout = setTimeout(keypressdelay, self.$jcdelay, self);
			}).on('focus blur', SELECTOR, function(e) {

				var self = this;
				var com = self.$com;

				if (!com || com.$removed || !com.getter)
					return;

				if (e.type === 'focusin')
					self.$jcevent = 1;
				else if (self.$jcevent === 1) {
					com.dirty(false, true);
					com.getter(self.value, 3);
				} else if (self.$jcskip) {
					self.$jcskip = false;
				} else {
					// formatter
					var tmp = com.$skip;
					if (tmp)
						com.$skip = false;
					var val = com.get();
					com.setter(val, com.path, 2);
					com.setter2 && com.setter2(val, com.path, 2);
					if (tmp)
						com.$skip = tmp;
				}
			}).on('change', SELECTOR, function() {

				var self = this;
				var com = self.$com;

				if (self.$jconly || !com || com.$removed || !com.getter)
					return;

				if (self.$jckeypress === false) {
					// bind + validate
					self.$jcskip = true;
					com.getter(self.value, false);
					return;
				}

				switch (self.tagName) {
					case 'SELECT':
						var sel = self[self.selectedIndex];
						self.$jcevent = 2;
						com.dirty(false, true);
						com.getter(sel.value, false);
						return;
					case 'INPUT':
						if (self.type === 'checkbox' || self.type === 'radio') {
							self.$jcevent = 2;
							com.dirty(false, true);
							com.getter(self.checked, false);
							return;
						}
						break;
				}

				if (self.$jctimeout) {
					com.dirty(false, true);
					com.getter(self.value, true);
					clearTimeout(self.$jctimeout);
					self.$jctimeout = 0;
				} else {
					self.$jcskip = true;
					com.setter && com.setterX(com.get(), self.path, 2);
				}
			});

			setTimeout(W.PREF.load, 2, prefload);
			$domready = true;
		});
	}, 100);

	function keypressdelay(self) {
		var com = self.$com;
		// Reset timeout
		self.$jctimeout = 0;
		// It's not dirty
		com.dirty(false, true);
		// Binds a value
		com.getter(self.value, true);
	}

	M.$parser.push(function(path, value, type) {

		switch (type) {
			case TYPE_N:
			case 'currency':
			case 'float':
				var v = +(typeof(value) == TYPE_S ? value.replace(REGEMPTY, '').replace(REGCOMMA, '.') : value);
				return isNaN(v) ? null : v;

			case 'date':
			case 'datetime':

				if (!value)
					return null;

				if (value instanceof Date)
					return value;

				value = value.parseDate();
				return value && value.getTime() ? value : null;
		}

		return value;
	});

	function binderbind(path, absolutePath, ticks) {
		var arr = binders[path];
		for (var i = 0; i < arr.length; i++) {
			var item = arr[i];
			if (!item.disabled && item.ticks !== ticks) {
				item.ticks = ticks;
				var curr_scope = current_scope;
				item.exec(GET(item.path), absolutePath);
				current_scope = curr_scope;
			}
		}
	}

	var $rebinder;

	function rebindbinder() {
		$rebinder && clearTimeout($rebinder);
		$rebinder = setTimeout(function() {
			var arr = bindersnew.splice(0);
			for (var i = 0; i < arr.length; i++) {
				var item = arr[i];
				if (!item.$init) {
					var curr_scope = current_scope;
					if (item.com)
						item.exec(item.com.data(item.path), item.path);
					else
						item.exec(GET(item.path), item.path);
					current_scope = curr_scope;
				}
			}
		}, 50);
	}

	function rebinddecode(val) {
		return val.replace(/&#39;/g, '\'');
	}

	function parsebinderskip(str) {
		var a = arguments;
		str = str.split(' ')[0].trim().replace(REGBINDERCOMPARE, '');

		for (var i = 1; i < a.length; i++) {
			if (str === a[i])
				return false;
		}

		return true;
	}

	function parsebinder(el, b, r) {
		var meta = b.split(REGMETA);
		if (meta.indexOf('|') !== -1) {
			if (!r) {
				var tmp = [];
				var output = [];
				for (var i = 0; i < meta.length; i++) {
					var m = meta[i];
					if (m === '|') {
						tmp.length && output.push(parsebinder(el, tmp.join('__')));
						tmp = [];
						continue;
					}
					m && tmp.push(m);
				}
				tmp.length && output.push(parsebinder(el, tmp.join('__'), true));
			}
			return output;
		}

		var path = null;
		var index = null;
		var obj = new jBinder();
		var cls = [];
		var sub = {};
		var e = obj.el = $(el);
		var isclick = false;
		var tmp;

		for (var i = 0; i < meta.length; i++) {
			var item = meta[i].trim();
			if (item) {
				if (i) {

					var k, v = '';

					if (item !== T_TEMPLATE && item !== ('!' + T_TEMPLATE) && item !== 'strict' && item !== T_VBINDARR && item !== ('!' + T_VBINDARR)) {

						// template with nested selector
						index = item.indexOf(T_TEMPLATE);
						tmp = index === 0 || index === 1; // "template" or "!template"
						index = item.indexOf(':');
						if (index === -1) {
							index = item.length;
							if (!tmp)
								item += ':value';
						}

						k = item.substring(0, index).trim();
						v = item.substring(index + 1).trim();

					} else
						k = item;

					if (k === 'selector') {
						obj[k] = v;
						continue;
					}

					var rki = k.indexOf(' ');
					var rk = rki === -1 ? k : k.substring(0, rki);
					var c = v.charAt(0);
					var vmethod = k !== T_TEMPLATE ? c === '.' ? 1 : c === '@' ? 2 : 0 : 0;
					var smethod = v.indexOf('?') !== -1;
					var dfn;

					if (vmethod) {
						v = v.substring(1);
						dfn = (function(v, type) {
							return function(value, path, el) {
								var fn;
								if (type === 1) {
									var vb = el.vbindarray() || el.vbind();
									fn = vb && vb[v];
								} else {
									var com = el.component();
									fn = com && com[v];
								}
								if (fn)
									return fn.call(this, value, path, el);
							};
						})(v, vmethod);
					} else if (smethod) {
						dfn = (function(p) {
							return function(value, path, el) {
								var scope = el.scope();
								if (scope) {
									var fn = GET(scope.makepath(p));
									if (fn)
										return fn.call(el, value, path, el);
								}
							};
						})(v);
					}

					if (k !== T_CLICK && REGSCOPECHECK.test(v)) {
						var vbeg = v.indexOf('(');
						var vfn = vbeg == -1 ? v : v.substring(0, vbeg);
						var vkey = ATTRDATA + GUID(5);
						v = new Function('value', 'path', 'el', 'var fn=el[0].' + vkey + ';if(!fn){var _s=el.scope();if(_s){el[0].' + vkey + '=fn=GET(_s.makepath(\'' + vfn + '\'))}}if(fn)return fn' + (vbeg == -1 ? '(value,path,el)' : v.substring(vbeg)));
					}

					var fn = parsebinderskip(rk, 'setter', 'strict', 'track', 'resize', 'delay', T_IMPORT, T_CLASS, T_TEMPLATE, T_VBINDARR, 'focus', T_CLICK, 'format', 'currency', 'empty', 'release', 'changes') && k.substring(0, 3) !== 'def' ? typeof(v) === TYPE_FN ? v : v.indexOf('=>') !== -1 ? FN(rebinddecode(v)) : isValue(v) ? FN('(value,path,el)=>' + rebinddecode(v), true) : v.charAt(0) === '@' ? obj.com[v.substring(1)] : dfn ? dfn : GET(v) : 1;
					if (!fn)
						return null;

					var keys = k.split('+');
					for (var j = 0; j < keys.length; j++) {

						k = keys[j].trim();

						var s = ''; // as nested selector
						var notvisible = false;
						var notnull = false;
						var backup = false;

						index = k.indexOf(' ');
						if (index !== -1) {
							s = k.substring(index + 1);
							k = k.substring(0, index);
						}

						k = k.replace(/^(~!|!~|!|~)/, function(text) {
							if (text.indexOf('!') !== -1)
								notnull = true;
							if (text.indexOf('~') !== -1)
								notvisible = true;
							return '';
						});

						var c = k.charAt(0);

						if (k === T_CLASS)
							k = 't' + T_CLASS;

						if (c === '.') {
							if (notnull)
								fn.$nn = 1;
							cls.push({ name: k.substring(1), fn: fn });
							k = T_CLASS;
						}

						if (typeof(fn) === TYPE_FN) {
							if (notnull)
								fn.$nn = 1;
							if (notvisible)
								fn.$nv = 1;
						}

						switch (k) {
							case 'changes':
								break;
							case 'empty':
								fn = v === T_VALUE ? MD.empty : v;
								break;
							case 'currency':
							case 'focus':
							case 'resize':
								fn = v;
								break;
							case 'format':
								if ((/^\d+$/).test(v))
									fn = +v;
								else
									fn = v;
								break;
							case T_CLICK:
								isclick = true;
								fn = v;
								break;
							case 'track':
								obj[k] = v.split(',').trim();
								continue;
							case 'strict':
								obj[k] = v ? v : true;
								continue;
							case T_HIDDEN:
								k = 'hide';
								break;
							case 'exec':
								k = 'change';
								break;
							case 'refresh':
								k = 'refreshbind';
								break;
							case T_DISABLED: // internal rewrite because binder contains '.disabled` property
								k = 'disable';
								backup = true;
								break;
							case 'enabled':
								k = 'enable';
								backup = true;
								break;
							case T_VALUE:
								k = 'val';
								backup = true;
								break;
							case 'default':
								k = 'def';
								break;
							case 'delay':
								fn = +v;
								break;
							case 'href':
							case 'src':
							case 'val':
							case 'title':
							case T_HTML:
							case 'text':
							case 'disable':
							case 'enable':
							case T_CHECKED:
								backup = true;
								break;
							case 'setter':
								fn = FN('(value,path,el)=>el.SETTER(' + v + ')');
								if (notnull)
									fn.$nn = 1;
								if (notvisible)
									fn.$nv =1;
								break;
							case T_IMPORT:
								var c = v.charAt(0);
								if ((/^(https|http):\/\//).test(v) || c === '/' || c === '.' || c === '[') {
									if (c === '.')
										fn = v.substring(1);
									else
										fn = v;
								} else
									fn = (v === 'value' || v === 'true') ? 1 : FN(rebinddecode(v));
								break;
							case 'tclass':
								fn = v;
								break;
							case T_VBINDARR:
								var scr = e.find(T_SCRIPT);
								var r = false;
								if (scr.length)
									r = true;
								else
									scr = e;
								fn = VBINDARRAY(scr.html(), e);
								if (notvisible)
									fn.$nv = 1;
								r && scr.remove();
								break;
							case T_TEMPLATE:

								// Only for backward compatibility:
								if (s === T_TRUE || s === T_VALUE)
									s = '';

								var ns = '';
								v = v.replace(/\{.*?\}/g, function(sel) {
									ns = sel.replace(/\{|\}/g, '').trim();
									return '';
								}).trim();

								var et = s ? e.find(s) : e;
								var scr = ns ? $(ns) : et.find(T_SCRIPT);
								var r = false;
								if (scr.length)
									r = true;
								else
									scr = et;
								tmp = scr.html();
								fn = Tangular.compile(tmp);
								if (notnull)
									fn.$nn = 1;
								if (notvisible)
									fn.$nv = 1;
								fn.$vdom = v;
								fn.$compile = tmp.COMPILABLE();
								r && !ns && scr.remove();
								break;
						}

						if (k === 'def')
							fn = new Function('return ' + v)();

						if (backup && notnull)
							obj[k + 'bk'] = (k == 'src' || k == 'href' || k == 'title') ? e.attr(k) : k == T_HTML ? e.html() : k == 'text' ? e.text() : k == 'val' ? e.val() : k == T_CHECKED ? e.prop(k) : k === 'disable' ? e.prop(T_DISABLED) : k === 'enable' ? (e.prop(T_DISABLED) == false) : '';

						if (s) {

							if (!sub[s])
								sub[s] = {};

							if (k !== T_CLASS)
								sub[s][k] = fn;

							else {
								var p = cls.pop();
								if (sub[s].cls)
									sub[s].cls.push(p);
								else
									sub[s].cls = [p];
							}
						} else {
							if (k !== T_CLASS)
								obj[k] = fn;
						}
					}

				} else {

					// path
					path = item;

					var c = path.charAt(0);

					if (c === '!') {
						path = path.substring(1);
						obj.notnull = true;
					}

					if (meta.length === 1) {
						var fn = GET(path);
						fn && fn.call(obj.el, obj.el);
						return fn ? fn : null;
					}

					tmp = findformat(path);
					if (tmp) {
						path = tmp.path;
						obj.formatter = tmp.fn;
						obj.formatter.scope = tmp.scope;
					}

					// Is virtual path?
					if (c === '.') {
						obj.virtual = true;
						path = path.substring(1);
						continue;
					}

					if (path.substring(path.length - 1) === '.')
						path = path.substring(0, path.length - 1);

					if (path.charAt(0) === '@') {
						path = path.substring(1);

						var isCtrl = false;
						if (path.charAt(0) === '@') {
							isCtrl = true;
							path = path.substring(1);
						}

						if (!path)
							path = '@';

						var parent = el.parentNode;
						while (parent) {
							if (isCtrl) {
								if (parent.$ctrl) {
									obj.com = parent.$ctrl;
									if (path === '@' && !obj.com.$dataw) {
										obj.com.$dataw = 1;
										obj.com.watch(function(path, value) {
											obj.com.data('@', value);
										});
									}
									break;
								}
							} else {
								if (parent.$com) {
									obj.com = parent.$com;
									break;
								}
							}
							parent = parent.parentNode;
						}

						if (!obj.com)
							return null;
					}
				}
			}
		}

		var keys = OK(sub);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			if (!obj.child)
				obj.child = [];
			var o = sub[key];
			o.selector = key.charAt(0) === '-' ? ATTRCOM : key;
			obj.child.push(o);
		}

		if (!obj.empty)
			obj.empty = '';

		if (cls.length)
			obj.classes = cls;

		if (obj.virtual) {
			path = pathmaker(path, 0, 1);
		} else {

			var bj = obj.com && path.charAt(0) === '@';
			path = bj ? path : pathmaker(path, 0, 1);

			if (path.indexOf('?') !== -1) {
				var scope = findscope(el);
				if (scope) {
					path = scope.makepath(path);
					obj.scope = scope.path;
				} else
					return;
			}

			var arr = path.split('.');
			var p = '';

			if (obj.com) {
				!obj.com.$data[path] && (obj.com.$data[path] = { value: null, items: [] });
				obj.com.$data[path].items.push(obj);
			} else {
				var skiparr = false;
				for (var i = 0, length = arr.length; i < length; i++) {
					p += (p ? '.' : '') + arr[i];
					var k = i === length - 1 ? p : '!' + p;
					if (!skiparr) {
						var index = arr[i].indexOf('[');
						if (index !== -1) {
							var ka = k.substring(0, k.length - index);
							if (binders[ka])
								binders[ka].push(obj);
							else
								binders[ka] = [obj];
							skiparr = true;
						}
					}
					if (binders[k])
						binders[k].push(obj);
					else
						binders[k] = [obj];
				}
			}
		}

		obj.path = path == TYPE_NULL ? null : path;

		if (obj.track) {
			for (var i = 0; i < obj.track.length; i++) {
				var objk = obj.track[i] = path + '.' + obj.track[i];
				if (M.paths[objk])
					M.paths[objk]++;
				else
					M.paths[objk] = 1;
			}
		} else {
			if (M.paths[obj.path])
				M.paths[obj.path]++;
			else
				M.paths[obj.path] = 1;
		}

		if (isclick) {
			var fn = function(click) {
				return function(e) {

					var t = this;

					if ((t.tagName === 'INPUT' || t.tagName === 'BUTTON') && t.disabled)
						return;

					var el = $(t);
					var scope = el.scope();

					click = scope ? scope.makepath(click) : click;

					var fn = GET(click);
					if (fn) {
						var val;
						if (obj.virtual) {
							var tmp = obj.el.vbind();
							val = tmp ? tmp.get(obj.path) : null;
						} else
							val = obj.path ? GET(obj.path) : null;

						var index = click.indexOf('/');
						if (index !== -1)
							current_scope = click.substring(0, index);
						else if (scope)
							current_scope = scope.path;

						fn(el, e, val, obj.path);
					}

				};
			};

			obj.click && obj.el.on(T_CLICK, fn(obj.click));
			var child = obj.child;
			if (child) {
				for (var i = 0; i < child.length; i++)
					child[i].click && obj.el.on(T_CLICK, child[i].selector, fn(child[i].click));
			}
		}

		if (obj.child) {
			for (var i = 0; i < obj.child.length; i++) {
				var child = obj.child[i];
				child.format = obj.format;
				child.empty = obj.empty;
			}
		}

		obj.$init = 0;
		if (!obj.virtual) {
			M.binders.push(obj);
			bindersnew.push(obj);
		}
		return obj;
	}

	function jBinder() {}

	var JBP = jBinder.prototype;

	JBP.refresh = function() {
		var t = this;
		var curr_scope = current_scope;
		t.exec(GET(t.path), t.path);
		current_scope = curr_scope;
	};

	JBP.exec = function(value, path, index, wakeup, can) {

		var item = this;
		if (item.disabled)
			return;

		var el = item.el;
		if (index != null) {
			if (item.child == null)
				return;
			item = item.child[index];
			if (item == null)
				return;
		}

		if (item.notnull && value == null)
			return;

		if (item.selector) {
			if (item.cache)
				el = item.cache;
			else {
				el = el.find(item.selector);
				if (el.length)
					item.cache = el;
			}
		}

		if (!el.length)
			return;

		if (!wakeup && item.delay) {
			item.$delay && clearTimeout(item.$delay);
			item.$delay = setTimeout(function(obj, value, path, index, can) {
				obj.$delay = null;
				var curr_scope = current_scope;
				obj.exec(value, path, index, true, can);
				current_scope = curr_scope;
			}, item.delay, item, value, path, index, can);
			return;
		}

		if (item.scope)
			current_scope = item.scope;

		if (item.$init) {
			if (item.strict && item.path !== path) {
				if (item.strict !== true || path.length > item.path.length)
					return;
			}
			if (item.track && item.path !== path) {
				var can = false;
				for (var i = 0; i < item.track.length; i++) {
					if (item.track[i] === path) {
						can = true;
						break;
					}
				}
				if (!can)
					return;
			}
		} else
			item.init && item.init.call(item.el, value, path, item.el);

		if (item.def && value == null)
			value = item.def;

		var tmp = null;

		if (item.changes) {
			tmp = value;
			if (typeof(value) === TYPE_O && value)
				tmp = HASH(value);
			if (item.stamp !== tmp || !item.$init)
				item.stamp = tmp;
			else
				return;
		}

		if (item.formatter)
			value = item.formatter(value, path, -1, item.formatter.scope ? new Scope(item.scope) : null);

		can = can !== false;

		if (item.show && (value != null || !item.show.$nn)) {
			tmp = !item.show.call(item.el, value, path, item.el);
			el.tclass(T_HIDDEN, tmp);
			if (tmp)
				can = false;
		}

		if (item.hide && (value != null || !item.hide.$nn)) {
			tmp = !!item.hide.call(item.el, value, path, item.el);
			el.tclass(T_HIDDEN, tmp);
			if (tmp)
				can = false;
		}

		if (item.invisible && (value != null || !item.invisible.$nn)) {
			tmp = !!item.invisible.call(item.el, value, path, item.el);
			el.tclass('invisible', tmp);
			if (tmp)
				can = false;
		}

		if (item.visible && (value != null || !item.visible.$nn)) {
			tmp = !item.visible.call(item.el, value, path, item.el);
			el.tclass('invisible', tmp);
			if (tmp)
				can = false;
		}

		if (item.release) {
			item.el.attr(ATTRREL2, !can);
			releasecomponents(0, item.el[0], !can, !item.$init);
		}

		if (!item.$init)
			item.$init = 1;

		if (item.classes) {
			for (var i = 0; i < item.classes.length; i++) {
				var cls = item.classes[i];
				if (!cls.fn.$nn || value != null)
					el.tclass(cls.name, !!cls.fn.call(el, value, path, el));
			}
		}

		if (can && item.import) {
			if (typeof(item.import) === TYPE_FN) {
				if (value) {
					!item.$ic && (item.$ic = {});
					!item.$ic[value] && IMPORT('ONCE ' + value, el);
					item.$ic[value] = 1;
				}
			} else if (item.import != 1) {
				IMPORT(item.import, el);
				delete item.import;
			} else {
				var scr = item.el.find(T_SCRIPT);
				var scrhtml = scr.html();
				scr.replaceWith(scrhtml);
				delete item.import;
				scrhtml.COMPILABLE() && COMPILE();
				scrhtml = null;
			}
		}

		if (item.config && (can || item.config.$nv)) {
			if (value != null || !item.config.$nn) {
				tmp = item.config.call(el, value, path, el);
				if (tmp) {
					for (var i = 0; i < el.length; i++) {
						var c = el[i].$com;
						if (c && c.$ready)
							c.reconfigure(tmp);
						else
							binderconfig(el[i], tmp);
					}
				}
			}
		}

		if (item.vbindarray && (can || item.vbindarray.$nv))
			item.vbindarray.set(value);

		if (item.html && (can || item.html.$nv)) {
			if (value != null || !item.html.$nn) {
				tmp = item.html.call(el, value, path, el);
				el.html(bindvalue(tmp, item, T_HTML));
			} else
				el.html(item.empty || item.htmlbk);
		}

		if (item.text && (can || item.text.$nv)) {
			if (value != null || !item.text.$nn) {
				tmp = item.text.call(el, value, path, el);
				el.text(bindvalue(tmp, item, 'text'));
			} else
				el.html(item.empty || item.textbk);
		}

		if (item.val && (can || item.val.$nv)) {
			if (value != null || !item.val.$nn) {
				tmp = item.val.call(el, value, path, el);
				el.val(bindvalue(tmp, item, 'val'));
			} else
				el.val(item.empty || item.valbk);
		}

		if (item.template && (can || item.template.$nv) && (value != null || !item.template.$nn)) {
			DEFMODEL.value = value;
			DEFMODEL.path = path;

			if (item.template.$vdom) {
				var status = DIFFDOM(el, item.template.$vdom, item.template(DEFMODEL));
				tmp = !!(status.add || status.upd);
			} else {
				tmp = true;
				el.html(item.template(DEFMODEL));
			}

			item.template.$compile && tmp && W.COMPILE(el);
		}

		if (item.disable && (can || item.disable.$nv)) {
			if (value != null || !item.disable.$nn) {
				tmp = !!item.disable.call(el, value, path, el);
				el.prop(T_DISABLED, tmp);
			} else {
				tmp = item.disablebk;
				el.prop(T_DISABLED, tmp == true);
			}
			var conf = T_DISABLED + ':' + (tmp == true ? T_TRUE : T_FALSE);
			for (var i = 0; i < el.length; i++) {
				var c = el[i].$com;
				if (c && c.$ready)
					c.reconfigure(conf);
				else
					binderconfig(el[i], conf);
			}
		}

		if (item.enable && (can || item.enable.$nv)) {
			if (value != null || !item.enable.$nn) {
				tmp = !item.enable.call(el, value, path, el);
				el.prop(T_DISABLED, tmp);
			} else {
				tmp = item.enablebk == false;
				el.prop(T_DISABLED, tmp);
			}
			var conf = T_DISABLED + ':' + (tmp == true ? T_TRUE : T_FALSE);
			for (var i = 0; i < el.length; i++) {
				var c = el[i].$com;
				if (c && c.$ready)
					c.reconfigure(conf);
				else
					binderconfig(el[i], conf);
			}
		}

		if (item.required && (can || item.required.$nv)) {
			tmp = !!item.required.call(el, value, path, el);
			var conf = 'required:' + (tmp == true ? T_TRUE : T_FALSE);
			for (var i = 0; i < el.length; i++) {
				var c = el[i].$com;
				if (c && c.$ready)
					c.reconfigure(conf);
				else
					binderconfig(el[i], conf);
			}
		}

		if (item.checked && (can || item.checked.$nv)) {
			if (value != null || !item.checked.$nn) {
				tmp = !!item.checked.call(el, value, path, el);
				el.prop(T_CHECKED, tmp);
			} else
				el.prop(T_CHECKED, item.checkedbk == true);
		}

		if (item.title && (can || item.title.$nv)) {
			if (value != null || !item.title.$nn) {
				tmp = item.title.call(el, value, path, el);
				el.attr('title', bindvalue(tmp, item, 'title'));
			} else
				el.attr('title', item.empty || item.titlebk);
		}

		if (item.href && (can || item.href.$nv)) {
			if (value != null || !item.href.$nn) {
				tmp = item.href.call(el, value, path, el);
				el.attr('href', bindvalue(tmp, item, 'href'));
			} else
				el.attr(item.empty || item.hrefbk);
		}

		if (item.src && (can || item.src.$nv)) {
			if (value != null || !item.src.$nn) {
				tmp = item.src.call(el, value, path, el);
				el.attr('src', bindvalue(tmp, item, 'src'));
			} else
				el.attr('src', item.empty || item.srcbk);
		}

		if (item.setter && (can || item.setter.$nv) && (value != null || !item.setter.$nn))
			item.setter.call(el, value, path, el);

		if (item.change && (value != null || !item.change.$nn))
			item.change.call(el, bindvalue(value, item), path, el);

		if (can && item.refreshbind && (value != null || !item.refreshbind.$nn))
			item.refreshbind.call(el, value, path, el);

		if (can && item.focus) {
			var elf = el.find(item.focus);
			setTimeout(function(item) {
				item.el.find(item.focus).eq(0).focus();
			}, elf.length ? 100 : 1500, item);
		}

		if (can && item.resize) {
			setTimeout(function(el) {
				el.SETTER('*', 'resize');
			}, 100, el);
		}

		if (can && index == null && item.child) {
			var curr_scope = current_scope;
			for (var i = 0; i < item.child.length; i++)
				item.exec(value, path, i, undefined, can);
			current_scope = curr_scope;
		}

		if (item.tclass) {
			el.tclass(item.tclass);
			delete item.tclass;
		}
	};

	W.DIFFDOM = function(el, selector, html) {

		var vdom = $(html);
		var varr = vdom.filter(selector);
		var vels = el.find(selector);
		var output = { add: 0, upd: 0, rem: 0 };
		var compareindex = 0;
		var is = false;
		var prop = 'outerHTML';

		for (var i = 0; i < vels.length; i++) {
			var a = vels[compareindex++];
			var b = varr[i];

			if (b == null) {
				a && a.parentNode.removeChild(a);
				output.rem++;
			} else if (a && a[prop] !== b[prop]) {
				var next = vels[compareindex];
				if (next && next[prop] === b[prop] && !is) {
					is = true;
					a.parentNode.removeChild(a);
					compareindex++;
				} else {
					is = false;
					a.parentNode.replaceChild(b, a);
				}
				output.upd++;
			} else
				is = false;
		}

		for (var i = vels.length; i < varr.length; i++) {
			el[0].appendChild(varr[i]);
			output.add++;
		}

		return output;
	};

	function bindvalue(val, item, prop) {
		return val === '' ? item.empty : val == null ? (item.empty || (prop ? item[prop + 'bk'] : '')) : item.currency ? val.currency(item.currency) : item.format ? val.format(item.format) : val;
	}

	function binderconfig(el, val) {
		setTimeout(function() {
			var c = el.$com;
			if (c && c.$ready)
				c.reconfigure(val);
			else
				binderconfig(el, val);
		}, MD.delaybinder, el, val);
	}

	function isValue(val) {
		var index = val.indexOf(T_VALUE);
		return index !== -1 ? (((/\W/).test(val)) || val === T_VALUE) : false;
	}

	function Plugin(name, fn) {
		(/\W/).test(name) && warn('Plugin name must contain A-Z chars only.');
		W.PLUGINS[name] && W.PLUGINS[name].$remove(true);
		var t = this;
		t.element = $(current_element || document.body);
		t.id = 'plug' + name;
		t.name = name;
		W.PLUGINS[name] = t;
		var a = current_owner;
		current_owner = t.id;
		fn.call(t, t);
		current_owner = a;
		current_scope = null;
		events.plugin && EMIT('plugin', t);
	}

	var PP = Plugin.prototype;

	PP.exec = function(name, a, b, c, d, e) {
		var self = this;
		self.scope();
		var fn = self[name];
		fn && fn.call(self, a, b, c, d, e);
		return self;
	};

	PP.scope = function(path) {
		var self = this;
		current_scope = path === null ? null : (path || self.name);
		return self;
	};

	PP.$remove = function() {

		var self = this;
		if (!self.element)
			return true;

		EMIT('plugin.destroy', self);
		self.destroy && self.destroy();

		// Remove all global events
		OK(events).forEach(function(e) {
			var evt = events[e];
			evt = evt.remove('owner', self.id);
			if (!evt.length)
				delete events[e];
		});

		watches = watches.remove('owner', self.id);

		// Remove events
		OFF(self.id + '#watch');

		// self.element.remove();
		self.element = null;

		delete W.PLUGINS[self.name];
		return true;
	};

	W.PLUGIN = function(name, fn) {
		if (PREFLOADED) {
			if (fn) {
				current_scope = name;
				fn = new Plugin(name, fn);
			}
			return fn || W.PLUGINS[name];
		} else
			plugininit.push({ name: name, fn: fn });
	};

	function CustomScrollbar(element, options) {

		var self = this;
		var size = {};
		var drag = {};

		if (!options)
			options = {};

		var n = 'ui-scrollbar';
		var id = GUID(5);

		element.aclass(n);
		element.wrapInner('<div class="{0}-area" data-id="{1}"><div class="{0}-body" data-id="{1}"></div></div>'.format(n, id));

		var iscc = !!options.controls;
		var controls = options.controls || element;
		var visibleX = options.visibleX == null ? false : options.visibleX;
		var visibleY = options.visibleY == null ? false : options.visibleY;
		var orientation = options.orientation;
		var canX = !orientation || orientation === 'x';
		var canY = !orientation || orientation === 'y';
		var isedge = navigator.userAgent.indexOf('Edge') !== -1;

		controls.prepend(('<div class="{0}-path {0}-notready" data-id="{1}">' + (canY ? '<div class="{0}-y" data-id="{1}"><span><b></b></span></div>' : '') + (canX ? '<div class="{0}-x" data-id="{1}"><span><b></b></span></div></div>' : '')).format(n, id));
		element[0].$scrollbar = self;

		var di = '[data-id="{0}"]'.format(id);
		var pe = 'pointer-events';
		var path = controls.find('.' + n + '-path' + di);
		var pathx = canX ? $(path.find('.' + n + '-x' + di)[0]) : null;
		var pathy = canY ? $(path.find('.' + n + '-y' + di)[0]) : null;
		var barx = canX ? $(pathx.find('span')[0]) : null;
		var bary = canY ? $(pathy.find('span')[0]) : null;
		var bodyarea = element.find('.' + n + '-body' + di);
		var area = $(element.find('> .' + n + '-area' + di)[0]);
		var notemmited = true;
		var intervalresize;
		var delayresize;
		var delay;
		var resizeid;
		var syncx = [];
		var syncy = [];
		var synclocked;
		var syncdelay;
		var syncid = 'cs' + GUID(5);
		var scrollbarcache = {};

		self.pathx = pathx;
		self.pathy = pathy;
		self.barx = barx;
		self.bary = bary;
		self.element = element;
		self.area = area;
		self.body = bodyarea;

		var handlers = {};

		handlers.onmousemove = function(e) {
			if (drag.is) {
				var p, diff, h;
				if (drag.type === 'y') {

					diff = e.pageY - drag.offset;

					if (diff < 0)
						diff = 0;

					h = size.vbarlength - size.vbarsize;
					p = (diff / h) * 100;
					area[0].scrollTop = ((size.scrollHeight - size.viewHeight + (options.marginY || 0)) / 100) * (p > 100 ? 100 : p);

					if (drag.counter++ > 10) {
						drag.counter = 0;
						drag.pos = e.pageY;
					}

				} else {

					diff = e.pageX - drag.offset;

					if (diff < 0)
						diff = 0;

					h = size.hbarlength - size.hbarsize;
					p = (diff / h) * 100;
					area[0].scrollLeft = ((size.scrollWidth - size.viewWidth + (options.marginX || 0)) / 100) * (p > 100 ? 100 : p);

					if (drag.counter++ > 5) {
						drag.counter = 0;
						drag.pos = e.pageX;
					}
				}

				if (p < -20 || p > 120)
					drag.is = false;
			}
		};

		handlers.onresize = function() {

			if (!delayresize) {
				scrollbarcache.ready = 0;
				path.aclass(n + '-notready');
			}

			delayresize && clearTimeout(delayresize);
			delayresize = setTimeout(self.resize, 500);
		};

		var bind = function() {
			animcache.disabled = true;
			if (!drag.binded) {
				drag.binded = true;
				var w = $(W).on('mousemove', handlers.onmousemove).on('mouseup', handlers.onmouseup);
				if (W.parent !== W)
					w.on('mouseout', handlers.onmouseout);
			}
		};

		var unbind = function() {
			animcache.disabled = false;
			if (drag.binded) {
				pathy && pathy.rclass(n + '-y-show');
				pathx && pathx.rclass(n + '-x-show');
				drag.binded = false;
				var w = $(W).off('mousemove', handlers.onmousemove).off('mouseup', handlers.onmouseup);
				if (W.parent !== W)
					w.off('mouseout', handlers.onmouseout);
			}
		};

		var animyt = {};
		var animcache = {};

		var animyt_fn = function(value) {
			if (animcache.y !== value && !animcache.yis) {
				animcache.y = value;
				animyt.top = value + 20;
				bary.stop().animate(animyt, 150, function() {
					animyt.top = value;
					bary.stop().animate(animyt, 150, function() {
						animcache.yis = false;
					});
				});
			}
		};

		var animxt = {};
		var animxt_fn = function(value) {
			if (animcache.x !== value && !animcache.xis) {
				animcache.xis = true;
				animcache.x = value;
				animxt.left = value + 20;
				barx.stop().animate(animxt, 150, function() {
					animxt.left = value;
					barx.stop().animate(animxt, 150, function() {
						animcache.xis = false;
					});
				});
			}
		};

		var animyb = {};
		var animyb_fn = function(value) {
			if (animcache.y !== value && !animcache.yis) {
				animcache.yis = true;
				animyb.height = value - 20;
				bary.stop().animate(animyb, 150, function() {
					animyb.height = value;
					bary.stop().animate(animyb, 150, function() {
						animcache.yis = false;
					});
				});
			}
		};

		var animxr = {};
		var animxr_fn = function(value) {
			if (animcache.x !== value && !animcache.xis) {
				animcache.yis = true;
				animxr.width = value - 20;
				barx.stop().animate(animxr, 150, function() {
					animxr.width = value;
					barx.stop().animate(animxr, 150, function() {
						animcache.xis = false;
					});
				});
			}
		};

		var animyt = function(pos, max) {
			size.animvpost = null;
			if (pos === max) {
				size.animvpos = true;
				animyt_fn(pos);
			} else if (pos === 0) {
				animyb_fn(+bary.attrd('size'));
				size.animvpos = true;
			}
		};

		var animxt = function(pos, max) {
			size.animhpost = null;
			if (pos === max) {
				size.animhpos = true;
				animxt_fn(pos);
			} else if (pos === 0) {
				animxr_fn(+barx.attrd('size'));
				size.animhpos = true;
			}
		};

		handlers.onmouseup = function() {
			drag.is = false;
			unbind();
		};

		handlers.onmouseout = function(e) {
			var f = e.relatedTarget || e.toElement;
			if (!f || f.tagName == 'HTML') {
				drag.is = false;
				unbind();
			}
		};

		handlers.forcey = function() {
			bary.css('top', size.vpos);
			if (MD.scrollbaranimate && !animcache.disabled && (size.vpos === 0 || size.vpos === size.vmax)) {
				size.animvpost && clearTimeout(size.animvpost);
				size.animvpost = setTimeout(animyt, 10, size.vpos, size.vmax);
			}
		};

		handlers.forcex = function() {
			barx.css('left', size.hpos);
			if (MD.scrollbaranimate && !animcache.disabled && (size.hpos === 0 || size.hpos === size.hmax)) {
				size.animhpost && clearTimeout(size.animhpost);
				size.animhpost = setTimeout(animxt, 10, size.hpos, size.hmax);
			}
		};

		handlers.onscroll = function() {

			var y = area[0].scrollTop;
			var x = area[0].scrollLeft;
			var is = size.prevx !== x || size.prevy !== y;
			var pos;
			var p;
			var d;
			var max;

			size.prevx = x;
			size.prevy = y;

			if (size.vbar && canY) {

				d = (size.scrollHeight - size.clientHeight) + 1;
				p = d ? Math.ceil((y / d) * 100) : 0;
				if (p > 100)
					p = 100;

				max = (size.vbarlength || 0) - (size.vbarsize || 0);
				pos = Math.ceil((p / 100) * max);

				if (pos < 0)
					pos = 0;
				else {
					if (pos > max)
						pos = max;
				}

				if (size.vpos !== pos) {
					size.vpos = pos;
					size.vmax = max;
					W.requestAnimationFrame(handlers.forcey);
				}
			}

			if (size.hbar && canX) {

				d = (size.scrollWidth - size.clientWidth) + 1;
				p = d ? Math.ceil((x / d) * 100) : 0;

				if (p > 100)
					p = 100;

				max = size.hbarlength - size.hbarsize;
				pos = ((p / 100) * max) >> 0;

				if (pos < 0)
					pos = 0;
				else {
					if (pos > max)
						pos = max;
				}

				if (size.hpos !== pos) {
					size.hpos = pos;
					size.hmax = max;
					W.requestAnimationFrame(handlers.forcex);
				}
			}

			if (is) {

				if (notemmited) {
					clearTimeout(resizeid);
					resizeid = setTimeout(self.resize, 500, true);
					events.scroll && EMIT('scroll', area);
					notemmited = false;
				}

				delay && clearTimeout(delay);
				delay = setTimeout(function() {
					delay = null;
					notemmited = true;
					size.animvpos = false;
					animcache.y = -1;
					animcache.x = -1;
				}, 700);

				options.onscroll && options.onscroll(self);

			} else {
				if (size.hbar || size.vbar) {
					clearTimeout(resizeid);
					resizeid = setTimeout(self.resize, 500, true);
				}
			}

			if (syncx.length || syncy.length) {

				if (synclocked) {
					if (synclocked !== syncid)
						return;
				} else
					synclocked = syncid;

				self.unsync();

				for (var i = 0; i < syncx.length; i++) {
					if (syncx[i].$csid !== synclocked) {
						syncx[i].scrollLeft = x;
						syncx[i].style[pe] = 'none';
					}
				}

				for (var i = 0; i < syncy.length; i++) {
					if (syncy[i].$csid !== synclocked) {
						syncy[i].scrollTop = y;
						syncy[i].style[pe] = 'none';
					}
				}
			}
		};

		pathx && pathx.on('mousedown', function(e) {

			drag.type = 'x';

			var tag = e.target.tagName;

			if (tag === 'SPAN' || tag === 'B') {
				bind();
				drag.offset = element.offset().left + e.offsetX;
				drag.offset2 = e.offsetX;
				drag.is = true;
				drag.pos = e.pageX;
				drag.counter = 0;
			} else {
				// path
				var offsetX = e.offsetX < 10 ? 0 : e.offsetX > (size.viewWidth - 10) ? size.viewWidth : (e.offsetX - 10);
				var p = Math.ceil((offsetX / (size.viewWidth - size.hbarsize)) * 100);
				self.scrollLeft(((size.scrollWidth - size.viewWidth + (options.marginX || 0)) / 100) * (p > 100 ? 100 : p));
				drag.is = false;
				return;
			}

			if (!pathx.hclass(n + '-' + T_HIDDEN))
				pathx.aclass(n + '-x-show');

			e.preventDefault();
			e.stopPropagation();
		}).on('mouseup', function() {
			drag.is = false;
			unbind();
		});

		pathy && pathy.on('mousedown', function(e) {

			drag.type = 'y';

			var tag = e.target.tagName;

			if (tag === 'SPAN' || tag === 'B') {
				bind();
				drag.offset = element.offset().top + e.offsetY;
				drag.offset2 = e.offsetY;
				drag.pos = e.pageY;
				drag.is = true;
				drag.counter = 0;
			} else {
				// path
				var offsetY = e.offsetY < 10 ? 0 : e.offsetY > (size.viewHeight - 10) ? size.viewHeight : (e.offsetY - 10);
				var p = Math.ceil((offsetY / (size.viewHeight - size.vbarsize)) * 100);
				self.scrollTop(((size.scrollHeight - size.viewHeight + (options.marginY || 0)) / 100) * (p > 100 ? 100 : p));
				drag.is = false;
				return;
			}

			if (!pathy.hclass(n + '-' + T_HIDDEN))
				pathy.aclass(n + '-y-show');

			e.preventDefault();
			e.stopPropagation();

		}).on('mouseup', function() {
			drag.is = false;
			unbind();
		});

		area.on('scroll', handlers.onscroll);

		self.element.on('scroll', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var t = this;
			if (t.scrollTop)
				t.scrollTop = 0;
			if (t.scrollLeft)
				t.scrollLeft = 0;
			return false;
		});

		self.check = function() {

			var el = element[0];
			var parent = el.parentNode;
			var is = false;

			while (parent) {
				if (parent.tagName === T_BODY) {
					is = true;
					break;
				}
				parent = parent.parentNode;
			}

			if (is)
				self.resize();
			else
				self.destroy();
		};

		var cssx = {};
		var cssy = {};
		var cssba = {};

		var PR = 'padding-right';
		var PB = 'padding-bottom';

		self.size = size;
		self.resize2 = onresize;
		self.resize = function(scrolling, force) {

			if (resizeid) {
				clearTimeout(resizeid);
				resizeid = null;
			}

			// Not visible
			if (!force && HIDDEN(element[0]))
				return;

			animcache.yis = false;
			animcache.xis = false;
			animcache.y = -1;
			animcache.x = -1;

			var a = area[0];
			var el = element;
			var md = isMOBILE && !SCROLLBARWIDTH();

			delayresize = null;

			if (options.parent) {
				el = typeof(options.parent) === TYPE_O ? $(options.parent) : el.closest(options.parent);
				if (!el[0].$scrollbar) {
					el[0].$scrollbar = self;
					el.on('scroll', function(e) {
						var t = this;
						if (t.scrollTop)
							t.scrollTop = 0;
						if (t.scrollLeft)
							t.scrollLeft = 0;
						e.preventDefault();
						return false;
					});
				}
			}

			size.viewWidth = el.width() + (options.offsetX || 0);
			size.viewHeight = el.height() + (options.offsetY || 0);

			var sw = SCROLLBARWIDTH();
			size.margin = sw;

			if (!size.margin && !md) {
				// Mac OS
				size.empty = 1;
				size.margin = options.margin == null ? 25 : options.margin;
				self.margin = options.margin == null ? -size.thicknessH : options.margin;
				self.marginX = canY ? self.margin : 0;
				self.marginY = canX ? self.margin : 0;
			} else {
				size.empty = 0;
				self.margin = sw;
				self.marginX = canY ? self.margin : 0;
				self.marginY = canX ? self.margin : 0;
			}

			self.thinknessX = size.thicknessH;
			self.thinknessY = size.thicknessY;

			var mx = canX ? (options.marginX || 0) : 0;
			var my = canY ? (options.marginY || 0) : 0;
			var aw;
			var ah;

			// Safari iOS
			if (md) {

				if (size.viewWidth > WW)
					size.viewWidth = WW;

				if (size.viewWidth > screen.width)
					size.viewWidth = screen.width;

				aw = size.viewWidth - mx;
				ah = size.viewHeight - mx;

				if (scrollbarcache.md != md) {
					// scrollbarcache.md = md; --> is defined below
					path.tclass(T_HIDDEN, md);
				}

			} else {
				aw = size.viewWidth + (canY ? size.margin : 0) - mx;
				ah = size.viewHeight + (canX ? size.margin : 0) - my;
			}

			if (scrollbarcache.aw !== aw) {
				scrollbarcache.aw = aw;
				!md && area.css(T_WIDTH, aw);
				bodyarea.css(orientation === 'y' ? T_WIDTH : 'min-width', size.viewWidth - mx + (W.isIE || isedge || !sw ? size.margin : 0) - (orientation === 'x' ? size.margin : 0));
			}

			if (scrollbarcache.ah !== ah) {
				scrollbarcache.ah = ah;
				area.css(T_HEIGHT, ah);
			}

			size.scrollWidth = a.scrollWidth || 0;
			size.scrollHeight = a.scrollHeight || 0;

			if (canX)
				size.clientWidth = Math.ceil(area.innerWidth());

			if (canY)
				size.clientHeight = Math.ceil(area.innerHeight());

			var defthickness = options.thickness || 10;

			if (!size.thicknessH && canX)
				size.thicknessH = (pathx.height() || defthickness) - 1;

			if (!size.thicknessV && canY)
				size.thicknessV = (pathy.width() || defthickness) - 1;

			if (size.hpos == null)
				size.hpos = 0;

			if (size.vpos == null)
				size.vpos = 0;

			if (canX) {
				if (iscc) {
					cssx.top = size.viewHeight - size.thicknessH;
					cssx.width = size.viewWidth;
				} else {
					cssx.top = size.viewHeight - size.thicknessH;
					cssx.width = size.viewWidth;
				}
				if (options.marginX)
					cssx.width -= options.marginX;
				pathx.css(cssx);
			}

			if (canY) {
				if (iscc) {
					cssy.left = controls.width() - size.thicknessV;
					cssy.height = controls.height();
				} else {
					cssy.left = size.viewWidth - size.thicknessV;
					cssy.height = size.viewHeight;
				}
				if (options.marginY)
					cssy.height -= options.marginY;
				pathy.css(cssy);
			}

			if (canY) {
				size.vbar = (size.scrollHeight - size.clientHeight) > 5;
				if (size.vbar) {
					size.vbarsize = (size.clientHeight * (cssy.height / size.scrollHeight)) >> 0;
					if (size.vbarsize < 30)
						size.vbarsize = 30;
					size.vbarlength = cssy.height;
					if (scrollbarcache.vbarsize !== size.vbarsize) {
						scrollbarcache.vbarsize = size.vbarsize;
						bary.css(T_HEIGHT, size.vbarsize).attrd('size', size.vbarsize);
					}
				}
			}

			if (canX) {
				size.hbar = size.scrollWidth > size.clientWidth;
				if (size.hbar) {
					size.hbarsize = (size.clientWidth * (cssx.width / size.scrollWidth)) >> 0;
					size.hbarlength = cssx.width;
					if (size.hbarsize < 30)
						size.hbarsize = 30;
					if (scrollbarcache.hbarsize !== size.hbarsize) {
						scrollbarcache.hbarsize = size.hbarsize;
						barx.css(T_WIDTH, size.hbarsize).attrd('size', size.hbarsize);
					}
				}
			}

			if (scrollbarcache.canX !== canX) {
				scrollbarcache.canX = canX;
				area.css('overflow-x', canX ? '' : 'hidden');
			}

			if (scrollbarcache.canY !== canY) {
				scrollbarcache.canY = canY;
				area.css('overflow-y', canY ? '' : 'hidden');
			}

			if (!size.vbarsize)
				size.vbarsize = 0;

			if (!size.hbarsize)
				size.hbarsize = 0;

			var n = 'ui-scrollbar-';

			if (canX && scrollbarcache.hbar !== size.hbar) {
				scrollbarcache.hbar = size.hbar;
				pathx.tclass((visibleX ? n : '') + T_HIDDEN, !size.hbar);
			}

			if (canY && scrollbarcache.vbar !== size.vbar) {
				scrollbarcache.vbar = size.vbar;
				pathy.tclass((visibleY ? n : '') + T_HIDDEN, !size.vbar);
			}

			if (visibleX && !size.hbar)
				size.hbar = true;

			if (visibleY && !size.vbar)
				size.vbar = true;

			var isx = size.hbar && canX;
			var isy = size.vbar && canY;

			if (scrollbarcache.isx !== isx) {
				scrollbarcache.isx = isx;
				element.tclass(n + 'isx', isx);
			}

			if (scrollbarcache.isy !== isy) {
				scrollbarcache.isy = isy;
				element.tclass(n + 'isy', isy);
			}

			if (scrollbarcache.md !== md) {
				scrollbarcache.md = md;
				element.tclass(n + 'touch', md);
			}

			if (!scrollbarcache.ready) {
				scrollbarcache.ready = 1;
				path.rclass(n + 'notready');
			}

			if (size.margin) {
				var plus = size.margin;

				if (W.isIE == false && sw && !isedge)
					plus = 0;

				if (canY)
					cssba[PR] = size.vbar ? (size.thicknessV + plus) : plus;

				if (canX)
					cssba[PB] = size.hbar ? (size.thicknessH + plus) : plus;

				if (scrollbarcache[PR] !== cssba[PR] || scrollbarcache[PB] !== cssba[PB]) {
					scrollbarcache[PR] = cssba[PR];
					scrollbarcache[PB] = cssba[PB];
					bodyarea.css(cssba);
				}
			}

			options.onresize && options.onresize(self);

			if (!scrolling)
				handlers.onscroll();

			return self;
		};

		self.scrollLeft = function(val) {

			if (val == null)
				return area[0].scrollLeft;

			if (typeof(val) === TYPE_S)
				val = area[0].scrollLeft + (+val);

			size.hpos = -1;
			return area[0].scrollLeft = val;
		};

		self.scrollTop = function(val) {

			if (val == null)
				return area[0].scrollTop;

			if (typeof(val) === TYPE_S)
				val = area[0].scrollTop + (+val);

			size.vpos = -1;
			return area[0].scrollTop = val;
		};

		self.scrollBottom = function(val) {
			if (val == null)
				return area[0].scrollTop;
			size.vpos = -1;
			return area[0].scrollTop = (area[0].scrollHeight - size.clientHeight) - (val || 0);
		};

		self.scrollRight = function(val) {
			if (val == null)
				return area[0].scrollLeft;
			size.hpos = -1;
			return area[0].scrollLeft = (area[0].scrollWidth - size.clientWidth) - (val || 0);
		};

		self.scroll = function(x, y) {
			area[0].scrollLeft = x;
			area[0].scrollTop = y;
			size.vpos = -1;
			size.hpos = -1;
			return self;
		};

		self.destroy = function() {
			clearInterval(intervalresize);
			unbind();
			area && area.off();
			pathx && pathx.off();
			pathy && pathy.off();
			OFF(T_RESIZE, self.resize);
			var index = M.scrollbars.indexOf(self);
			if (index !== -1)
				M.scrollbars.splice(index, 1);
		};

		var resize_visible = function() {
			if (HIDDEN(element[0]))
				setTimeout(resize_visible, 234);
			else {
				setTimeout(self.resize, 500);
				setTimeout(self.resize, 1000);
				self.resize();
			}
		};

		if (options.autoresize == null || options.autoresize) {
			$(W).on(T_RESIZE, onresize);
			ON(T_RESIZE, self.resize);
		}

		self.unsyncdone = function() {
			synclocked = null;
			syncdelay = null;

			for (var i = 0; i < syncx.length; i++)
				syncx[i].style[pe] = '';

			for (var i = 0; i < syncy.length; i++)
				syncy[i].style[pe] = '';
		};

		self.unsync = function() {
			syncdelay && clearTimeout(syncdelay);
			syncdelay = setTimeout(self.unsyncdone, 300);
		};

		self.sync = function(el, offset) {

			el = el instanceof jQuery ? el : $(el);
			el[0].$csid = 'cs' + GUID(8);

			var isx = !offset || offset === 'left' || offset === 'x';
			var isy = !offset || offset === 'top' || offset === 'y';

			el.on('scroll', function() {

				if (synclocked && synclocked !== this.$csid)
					return;

				synclocked = this.$csid;
				self.unsync();

				if (isx)
					self.area[0].scrollLeft = this.scrollLeft;

				if (isy)
					self.area[0].scrollTop = this.scrollTop;
			});

			isx && syncx.push(el[0]);
			isy && syncy.push(el[0]);
		};

		resize_visible();
		intervalresize = setInterval(self.check, options.interval || 54321);
		M.scrollbars.push(self);
		return self;
	}

	M.prototypes = function(fn) {
		var obj = {};
		obj.Component = PPC;
		obj.Plugin = PP;
		obj.VBinder = VBP;
		fn.call(obj, obj);
	};

	W.SCROLLBAR = function(element, options) {
		return new CustomScrollbar(element, options);
	};

	W.NOTFOCUSED = function() {
		return !(navigator.onLine && (isMOBILE ? true : document.hasFocus()));
	};

	W.QUEUE = function(name, fn) {

		if (typeof(name) == 'function') {
			fn = name;
			name = T_COM;
		}

		var arr = queues[name];
		if (!arr)
			arr = queues[name] = [];

		if (fn) {
			arr.push(fn);
			W.QUEUE(name);
		} else if (!arr.isrunning) {
			var item = arr.shift();
			if (item) {
				arr.isrunning = true;
				item(function() {
					arr.isrunning = false;
					W.QUEUE(name);
				}, arr.length);
			}
		}

		return arr.length;
	};

})();
