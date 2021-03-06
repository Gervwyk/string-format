'use strict';

var assert = require('assert');

var format = require('..');

var eq = assert.strictEqual;

function s(num) { return num === 1 ? '' : 's'; }


suite('format', function() {

  test('is a function with "create" and "extend" functions', function() {
    eq(typeof format, 'function');
    eq(typeof format.create, 'function');
    eq(typeof format.extend, 'function');
  });

  test('interpolates positional arguments', function() {
    eq(format('{0}, you have {1} unread message{2}', 'Holly', 2, 's'),
       'Holly, you have 2 unread messages');
  });

  test('strips unmatched placeholders', function() {
    eq(format('{0}, you have {1} unread message{2}', 'Steve', 1),
       'Steve, you have 1 unread message');
  });

  test('allows indexes to be omitted if they are entirely sequential', function() {
    eq(format('{}, you have {} unread message{}', 'Steve', 1),
       'Steve, you have 1 unread message');
  });

  test('replaces all occurrences of a placeholder', function() {
    eq(format('the meaning of life is {0} ({1} x {2} is also {0})', 42, 6, 7),
       'the meaning of life is 42 (6 x 7 is also 42)');
  });

  test('does not allow explicit and implicit numbering to be intermingled', function() {
    assert.throws(
      function() { format('{} {0}', 'foo', 'bar'); },
      function(err) {
        return err instanceof Error &&
               err.name === 'ValueError' &&
               err.message === 'cannot switch from ' +
                               'implicit to explicit numbering';
      }
    );
    assert.throws(
      function() { format('{1} {}', 'foo', 'bar'); },
      function(err) {
        return err instanceof Error &&
               err.name === 'ValueError' &&
               err.message === 'cannot switch from ' +
                               'explicit to implicit numbering';
      }
    );
  });

  test('treats formats into an object', function() {
    eq(format('{ {}: "{}" }', 'foo', 'bar'), '{ foo: "bar" }');
  });

  test('supports property access via dot notation', function() {
    var bobby = {first: 'Bobby', last: 'Fischer'};
    var garry = {first: 'Garry', last: 'Kasparov'};
    eq(format('{0.first} {0.last} vs. {1.first} {1.last}', bobby, garry),
       'Bobby Fischer vs. Garry Kasparov');
  });

  test('accepts a shorthand for properties of the first positional argument', function() {
    var bobby = {first: 'Bobby', last: 'Fischer'};
    eq(format('{first} {last}', bobby), 'Bobby Fischer');
  });

  test('invokes methods', function() {
    eq(format('{0.toLowerCase}', 'III'), 'iii');
    eq(format('{0.toUpperCase}', 'iii'), 'III');
    eq(format('{0.getFullYear}', new Date('26 Apr 1984')), '1984');
    eq(format('{pop}{pop}{pop}', ['one', 'two', 'three']), 'threetwoone');
    eq(format('{quip.toUpperCase}', {quip: function() { return 'Bazinga!'; }}), 'BAZINGA!');
  });

  test('invokes methods with parameters', function() {
    eq(format('{0.toFixed()}', 11.5789), '12');
    eq(format('{0.toFixed(1)}', 11.5789), '11.6');
    eq(format('{0.toFixed(0)}', 0), '0');
    eq(format('{0.toFixed(2)}', 0), '0.00');
    eq(format('{0.substring(2,4)}', 'aabbcc'), 'bb');
    eq(format('{0.substring(1, 3)}', 'aabbcc'), 'ab');
    eq(format('{0.concat("1aa")}', 'bb'), 'bb1aa');
    eq(format("{0.concat('2a a')}", 'bb'), 'bb2a a');
    eq(format('{0.concat("3a b",  "c d")}', 'a'), 'a3a bc d');
    eq(format('{0.concat( "4a b","c d")}', 'a'), 'a4a bc d');
    eq(format('{0.concat("5a b","c d" )}', 'a'), 'a5a bc d');
    eq(format('{0.concat( "6a b","c d" )}', 'a'), 'a6a bc d');
    eq(format('{0.concat( "7a b", "c d" )}', 'a'), 'a7a bc d');
    eq(format('{0.concat("8a b c d e")}', 'a'), 'a8a b c d e');
    eq(format('{0.concat("9 new text").concat(" string")}', 'The'), 'The9 new text string');
  });

  test('invokes methods with parameters and white space in field names', function() {
    eq(format('{"one field name".toFixed()}', {'one field name': 11.5789}), '12');
    eq(format("{'one field name'.toFixed()}", {'one field name': 11.5789}), '12');
  });

  test("passes applicable tests from Python's test suite", function() {
    eq(format(''), '');
    eq(format('abc'), 'abc');
    eq(format('{0}', 'abc'), 'abc');
    eq(format('X{0}', 'abc'), 'Xabc');
    eq(format('{0}X', 'abc'), 'abcX');
    eq(format('X{0}Y', 'abc'), 'XabcY');
    eq(format('{1}', 1, 'abc'), 'abc');
    eq(format('X{1}', 1, 'abc'), 'Xabc');
    eq(format('{1}X', 1, 'abc'), 'abcX');
    eq(format('X{1}Y', 1, 'abc'), 'XabcY');
    eq(format('{0}', -15), '-15');
    eq(format('{0}{1}', -15, 'abc'), '-15abc');
    eq(format('{0}X{1}', -15, 'abc'), '-15Xabc');
    // TODO: consider a regex which works for both this and
    // eq(format('{{'), '{');
    // eq(format('}}'), '}');
    // eq(format('{{}}'), '{}');
    // eq(format('{{x}}'), '{x}');
    // eq(format('{{{0}}}', 123), '{123}');
    // eq(format('{{{{0}}}}'), '{{0}}');
    // eq(format('}}{{'), '}{');
    // eq(format('}}x{{'), '}x{');
  });

  suite('format.create', function() {

    test('returns a format function with access to provided transformers', function() {
      function append(suffix) { return function(s) { return s + suffix; }; }
      var formatA = format.create({x: append(' (formatA)')});
      var formatB = format.create({x: append(' (formatB)')});

      eq(formatA('{!x}', 'abc'), 'abc (formatA)');
      eq(formatB('{!x}', 'abc'), 'abc (formatB)');
    });

  });

  test('applies transformers to explicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '{0}, you have {1} unread message{1!s}';
    eq($format(text, 'Steve', 1), 'Steve, you have 1 unread message');
    eq($format(text, 'Holly', 2), 'Holly, you have 2 unread messages');
  });

  test('applies transformers to implicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = 'The Cure{!s}, The Door{!s}, The Smith{!s}';
    eq($format(text, 1, 2, 3), 'The Cure, The Doors, The Smiths');
  });

  test('applies transformers to properties of explicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '<a href="/inbox">view message{0.length!s}</a>';
    eq($format(text, new Array(1)), '<a href="/inbox">view message</a>');
    eq($format(text, new Array(2)), '<a href="/inbox">view messages</a>');
  });

  test('applies transformers to properties of implicit positional arguments', function() {
    var $format = format.create({s: s});
    var text = '<a href="/inbox">view message{length!s}</a>';
    eq($format(text, new Array(1)), '<a href="/inbox">view message</a>');
    eq($format(text, new Array(2)), '<a href="/inbox">view messages</a>');
  });

  test('throws if no such transformer is defined', function() {
    assert.throws(
      function() { format('foo-{!toString}-baz', 'bar'); },
      function(err) {
        return err instanceof Error &&
               err.name === 'ValueError' &&
               err.message === 'no transformer named "toString"';
      }
    );
  });

  suite('format.extend', function() {

    test('defines String.prototype.format', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('Hello, {}!'.format('Alice'), 'Hello, Alice!');
      delete String.prototype.format;
    });

    test('defines "format" method on arbitrary object', function() {
      var prototype = {};
      format.extend(prototype, {});
      eq(typeof String.prototype.format, 'undefined');
      eq(typeof prototype.format, 'function');
      eq(prototype.format.call('Hello, {}!', 'Alice'), 'Hello, Alice!');
    });

    test('defines String.prototype.format with object', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('Hello, {name}!'.format({name: 'Adam'}), 'Hello, Adam!');
      delete String.prototype.format;
    });

    test('defines String.prototype.format on undefined reference', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('Hello, Mr. {surname}!'.format({name: 'Adam'}), 'Hello, Mr. !');
      delete String.prototype.format;
    });

    test('defines String.prototype.format on reference with method', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      var d = new Date();
      eq('We are in {date.getFullYear}'.format({date: d}), 'We are in ' + d.getFullYear());
      delete String.prototype.format;
    });

    test('defines String.prototype.format on undefined reference with method', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('Hello, Mr. {d.getFullYear}'.format({date: new Date()}), 'Hello, Mr. ');
      delete String.prototype.format;
    });
  });

  // extend to render good json object strings
  suite('use to parse into json object strings', function() {

    test('defines String.prototype.format to parse into object string - string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ str: "{str}", s:"{str}"}'.format({str: 'abc'}), '{ str: "abc", s:"abc"}');
      delete String.prototype.format;
    });

    // for now we are assuming that stings must be placed in quotations to render as stings. In future, test the type and make it agnostic
    test('defines String.prototype.format to parse into object string - string mixed quotes', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{str: {str}, s:"{str}"}'.format({str: 'abc'}), '{str: abc, s:"abc"}');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse into object string - number', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ CSI1 : {CSI1}, n:{CSI1.toFixed(0)}}'.format({CSI1: 123.3}), '{ CSI1 : 123.3, n:123}');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse into object string - nested objects', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{num: {Q8: {$lte: 5}}, n: {k: {num}}}'.format({num: 123.3}), '{num: {Q8: {$lte: 5}}, n: {k: 123.3}}');
      delete String.prototype.format;
    });


    test('defines String.prototype.format to parse into object string default to ISO String - date', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      var d = new Date();
      eq('{d: {date}}'.format({date: d}), '{d: "' + d.toISOString() + '"}');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse 2 objects into string - number', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $num : {0.num}, n:{1.num}}'.format({num: 1111}, {num: 2222}), '{ $num : 1111, n:2222}');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse 2 objects into string negative counter -1 - number', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $num : {0.num}, n:{-1.num}}'.format({num: 1111}, {num: 2222}, {num: 3333}), '{ $num : 1111, n:3333}');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse 2 objects into string negative counter -2 - number', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $num : {0.num}, n:{-2.num}}'.format({num: 1111}, {num: 2222}, {num: 3333}), '{ $num : 1111, n:2222}');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse objects with number into string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $set: { email_status: {sent_status} } }'.format({'sent_status': {'a': 1234}}), '{ $set: { email_status: {"a":1234} } }');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse objects with float into string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $set: { email_status: {sent_status} } }'.format({'sent_status': {'a': 12.34}}), '{ $set: { email_status: {"a":12.34} } }');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse objects with boolean into string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $set: { email_status: {sent_status} } }'.format({'sent_status': {'a': true}}), '{ $set: { email_status: {"a":true} } }');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse objects with string into string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $set: { email_status: {sent_status} } }'.format({'sent_status': {'a': '1234'}}), '{ $set: { email_status: {"a":"1234"} } }');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse objects with array of strings into string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $set: { email_status: {sent_status} } }'.format({'sent_status': ['1234', 'aaa', 'ccc']}), '{ $set: { email_status: ["1234","aaa","ccc"] } }');
      delete String.prototype.format;
    });

    test('defines String.prototype.format to parse array into string', function() {
      format.extend(String.prototype, {});
      eq(typeof String.prototype.format, 'function');
      eq('{ $set: { email_status: {sent_status} } }'.format({'sent_status': [{'a': 1234}, {'b': 'abcd'}]}), '{ $set: { email_status: [{"a":1234},{"b":"abcd"}] } }');
      delete String.prototype.format;
    });

  });

});
