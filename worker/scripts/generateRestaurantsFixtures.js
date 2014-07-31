#! /usr/local/bin/node
'use strict';

var fs = require('fs');

var mysql = require('mysql');
var es = require('event-stream');
//var amqp = require('amqp');

var konphyg = require('konphyg')(__dirname + '/../config');

var config = konphyg.all();


var query = 'SELECT id, url from restaurants WHERE url IS NOT null AND url != \'\' LIMIT 100';

console.log(config.mysql);

var mysqlConnection = mysql.createConnection(config.mysql);


var buffer = [];
mysqlConnection.query(query)
    .stream()
    .pipe(es.through(function (data) {
        buffer.push({
            basedomain: 'lieferservice.de',
            page: 'menu',
            locale: 'de_DE',
            restaurantId: data.id,
            url: data.url
        });
    }, function () {
        console.log('amount of records is ', buffer.length);
        this.emit('data', JSON.stringify(buffer, null, '    '));
        this.emit('end');
    }))

    .pipe(fs.createWriteStream(__dirname + '/../testData/restaurants.json'))
    .on('finish', function () {
        console.log('saved');
    });

mysqlConnection.end();