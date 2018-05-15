void function(global) {

  'use strict';
  Date.prototype.getMonthName = function(lang) {
    var l = lang && (lang in Date.locale) ? lang : 'en';
    return Date.locale[l].month_names[this.getMonth()];
  };

  Date.prototype.getMonthNameShort = function(lang) {
    var l = lang && (lang in Date.locale) ? lang : 'en';
    return Date.locale[l].month_names_short[this.getMonth()];
  };

  Date.locale = {
    en: {
      month_names: ['January', 'February', 'March',
                    'April', 'May', 'June', 'July', 'August', 'September',
                    'October', 'November', 'December'],
      month_names_short: ['Jan', 'Feb', 'Mar',
                          'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                          'Oct', 'Nov', 'Dec']
    }
  };

  //  ValueError :: String -> Error
  function ValueError(message) {
    var err = new Error(message);
    err.name = 'ValueError';
    return err;
  }

  //  defaultTo :: a,a? -> a
  function defaultTo(x, y) {
    return y == null ? x : y;
  }

  //  create :: Object -> String,*... -> String
  function create(transformers) {
    return function(template) {
      var args = Array.prototype.slice.call(arguments, 1);
      var idx = 0;
      var state = 'UNDEFINED';

      return template.replace(
        /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
        function(match, literal, _key, xf) {
          if (literal != null) {
            return literal;
          }
          var key = _key;
          if (key.length > 0) {
            if (state === 'IMPLICIT') {
              throw ValueError('cannot switch from ' +
                               'implicit to explicit numbering');
            }
            state = 'EXPLICIT';
          } else {
            if (state === 'EXPLICIT') {
              throw ValueError('cannot switch from ' +
                               'explicit to implicit numbering');
            }
            state = 'IMPLICIT';
            key = String(idx);
            idx += 1;
          }
          var value = defaultTo('', lookup(args, key.split('.')));

          if (xf == null) {
            return value;
          } else if (Object.prototype.hasOwnProperty.call(transformers, xf)) {
            return transformers[xf](value);
          } else {
            throw ValueError('no transformer named "' + xf + '"');
          }
        }
      );
    };
  }

  function splitParameters(parStr) {
    if (parStr.charAt(parStr.length - 1) === ')'
    && parStr.charAt(parStr.length - 2) === '(') {
      return {key: parStr.replace('()', ''), pars: []};
    } else if (/([()])\1|[(](.*?)(?:!(.+?))?[)]/g.test(parStr)) {
      var pars = /([()])\1|[(](.*?)(?:!(.+?))?[)]/g.exec(parStr);
      var _parStr = parStr.replace(pars[0], '');
      pars = pars[2].split(',');
      pars = pars.map(function(v) {
        if (/^[.\d]+$/g.test(v)) {
          return parseFloat(v);
        } else if (/^'(\w+?)'$|^"(\w+?)"$/g.test(v)) {
          return v.substring(1, v.length - 1);
        } else {
          return v;
        }
      });
      return {key: _parStr, pars: pars};
    } else {
      return {key: parStr, pars: []};
    }
  }

  function lookup(_obj, _path) {
    var obj = _obj;
    var path = _path;
    if (!/^\d+$/.test(path[0])) {
      path = ['0'].concat(path);
    }
    for (var idx = 0; idx < path.length; idx += 1) {
      var key = path[idx];
      var v = splitParameters(key);
      obj = typeof obj[v.key] === 'function' ?
        obj[v.key].apply(obj, v.pars) :
        obj[v.key];
    }
    return obj;
  }

  //  format :: String,*... -> String
  var format = create({});

  //  format.create :: Object -> String,*... -> String
  format.create = create;

  //  format.extend :: Object,Object -> ()
  format.extend = function(prototype, transformers) {
    var $format = create(transformers);
    prototype.format = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this);
      return $format.apply(global, args);
    };
  };

  /* istanbul ignore else */
  if (typeof module !== 'undefined') {
    module.exports = format;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return format; });
  } else {
    global.format = format;
  }

}.call(this, this);
