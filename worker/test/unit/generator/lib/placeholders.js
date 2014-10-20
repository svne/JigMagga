/*global describe, it: true*/

'use strict';

var expect = require('chai').expect;

var placeholders = require('../../../../generator/lib/placeholders');

describe('placeholders', function () {
    describe.only('#simpleReplace', function () {

        it('should replace all placeholder in string', function () {
            var string = '/meal-{id}-{name}.json';

            var parameters = {
                id: 3,
                name: 'foo'
            };

            var res = placeholders.simpleReplace(string, parameters);

            expect(res).to.eql('/meal-3-foo.json');
        });
        it('should replace one placeholder in string', function () {
            var string = '/meal-{id}.json';

            var parameters = {
                id: 3
            };

            var res = placeholders.simpleReplace(string, parameters);

            expect(res).to.eql('/meal-3.json');
        });
        it('should not touch the string without any placeholders', function () {
            var string = '/meals.json';

            var parameters = {
                id: 3
            };

            var res = placeholders.simpleReplace(string, parameters);

            expect(res).to.eql('/meals.json');

        });
    });
});
