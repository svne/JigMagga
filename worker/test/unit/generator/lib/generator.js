/*global describe, it: true*/

'use strict';

var expect = require('chai').expect;
var rewire = require('rewire');

var generator = rewire('../../../../generator/lib/generator');

var getExcludedPredefinedFields = generator.__get__('getExcludedPredefinedFields');
var excludePredefinedFields = generator.__get__('excludePredefinedFields');

var jigs = {
    ".yd-jig-services2": {
        "controller": "Yd.Jig.Services",
        "template": "yd/jig/services/views/init.ejs",
        "apicalls": {
            "locationId": {
                "method": "get",
                "path": "/location/id",
                "resultSchema": "//yd/fixture/schema/locationId.json",
                "requestSchema": "//yd/fixture/schema/requests/pathname.json",
                "excludeFromPredefined": ["bar"]
            },
            "bla_locationId": {
                "method": "get",
                "path": "/location/id",
                "resultSchema": "//yd/fixture/schema/locationId.json",
                "requestSchema": "//yd/fixture/schema/requests/pathname.json"
            },
            "restaurants": {
                "method": "get",
                "path": "/location/restaurants",
                "predefined": true,
                "resultSchema": "//yd/fixture/schema/restaurants.json",
                "requestSchema": "//yd/fixture/schema/requests/restaurants.json",
                "excludeFromPredefined": ["description", "foo"]
            }
        }
    },
    ".yd-jig-services": {
        "controller": "Yd.Jig.Services",
        "template": "yd/jig/services/views/init.ejs",
        "apicalls": {
            "locationId": {
                "method": "get",
                "path": "/location/id",
                "resultSchema": "//yd/fixture/schema/locationId.json",
                "requestSchema": "//yd/fixture/schema/requests/pathname.json"
            },
            "restaurants": {
                "method": "get",
                "path": "/location/restaurants",
                "predefined": true,
                "resultSchema": "//yd/fixture/schema/restaurants.json",
                "requestSchema": "//yd/fixture/schema/requests/restaurants.json",
                "excludeFromPredefined": ["description"]
            }
        }
    }
};

var restaurants = [
    {bla1: 'foo1', description: 'fooo bar 1'},
    {bla2: 'foo2', description: 'fooo bar 2'},
    {bla3: 'foo3', description: 'fooo bar 3'},
    {bla4: 'foo4', description: 'fooo bar 4'}
];


describe('generator', function () {
    describe('#getExcludedPredefinedFields', function () {

        it('should return object with lists of excluded fields', function () {
            var result = getExcludedPredefinedFields(jigs);

            expect(result).to.be.an('object');
            expect(Object.keys(result).length).to.eql(2);
            expect(result.restaurants).to.be.an('array');
            expect(result.restaurants.length).to.eql(1);
            expect(result.restaurants[0]).to.eql('description');
        });

    });

    describe('excludePredefinedFields', function () {
        it('should exclude fields from predefined variable array', function () {
            var result = excludePredefinedFields(restaurants, ['description']);
            expect(result[0]).to.include.keys('bla1');
            expect(result[0]).to.include.keys('description');
            expect(result[0].description).to.equal(undefined);
        });

        it('should exclude fields from predefined variable object', function () {
            var result = excludePredefinedFields(restaurants[0], ['description']);
            expect(result).to.include.keys('bla1');
            expect(result).to.include.keys('description');
            expect(result.description).to.equal(undefined);
        });

    });
});
