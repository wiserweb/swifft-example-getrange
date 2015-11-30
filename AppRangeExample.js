#!/usr/bin/env node
"use strict"

// This sample demonstrates how to connect to OpenStack Swift using a modified version of npm swifft package
// This sample provides an example usage of the getRange method

// To get package working
// execute: $ node --harmony AppRangeExample.js

// For API reference see:
// http://developer.openstack.org/api-ref-objectstorage-v1.html

// Initialize all required objects.
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var Swifft = require('swifft');

// Enter your openstack swift credentials
// Tenant_id is optional for some providers and may be commented out
var options = {
    auth_url: "",
    //tenant_id: "",
    tenant_name: "",
    region: "",
    username: "",
    password: ""
}

var account = Swifft.create(options);

// List of filename extensions and MIME names 
var mimeNames = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'application/ogg', 
    '.ogv': 'video/ogg', 
    '.oga': 'audio/ogg',
    '.txt': 'text/plain',
    '.wav': 'audio/x-wav',
    '.webm': 'video/webm'
};

var account = Swifft.create(options);
var total = 3; // specify file length limit here
var cname =''; //place the container name here
var oname = 'foo.txt'; //object name here

http.createServer(httpListener).listen(8000);
console.log("Server running at http://localhost:8000/");


function httpListener(request, response) {

    var start;
    var end;
    var responseHeaders = {};

    // We will only accept 'GET' method. Otherwise will return 405 'Method Not Allowed'.

    if (request.method != 'GET') {
        sendResponse(response, 405, { 'Allow': 'GET' }, null);
        return null;
    }    

    request.headers['range'] = 'bytes=0-1';

    var rangeRequest = readRangeHeader(request.headers['range'], total);

    if (rangeRequest == null)  {
        var max_range = total -1;
        request.headers['range'] = 'bytes=0-'+max_range.toString();        
        rangeRequest = readRangeHeader(request.headers['range'], total);
    }

    start = rangeRequest.Start;
    end = rangeRequest.End;

    // override header values
    // start = 0;
    // end = 1;

    // If the range can't be fulfilled.
    if (start >= total || end >= total) {
        // Indicate the acceptable range.
        responseHeaders['Content-Range'] = 'bytes */' + total; // File size.

        // Return the 416 'Requested Range Not Satisfiable'.
        sendResponse(response, 416, responseHeaders, null);
        return null;
    }

    // Indicate the current range.
    responseHeaders['Content-Range'] = 'bytes ' + start + '-' + end + '/' + total;
    responseHeaders['Content-Length'] = start == end ? 0 : (end - start + 1);
    responseHeaders['Content-Type'] = 'text/plain';
    responseHeaders['Accept-Ranges'] = 'bytes';
    responseHeaders['Cache-Control'] = 'no-cache';

    console.log('request headers: ' + JSON.stringify(request.headers));
    console.log('response headers: ' + JSON.stringify(responseHeaders));

    // Return the 206 'Partial Content'.
    response.writeHead(206, responseHeaders);

    account.container(cname).object(oname).getRange(request.headers,function (err, stream, settings) {

       console.log(stream.length)
       console.log(stream.toString())
       // console.log(stream.pipe(response)); //use with getStream

    });    

}

function sendResponse(response, responseStatus, responseHeaders, readable) {
    response.writeHead(responseStatus, responseHeaders);

    if (readable == null) {
        console.log('response.end()');
        response.end();
    }
    else
        readable.on('open', function () {
            console.log('readable.pipe(response)');
            readable.pipe(response);
        });

    return null;
}

function getMimeNameFromExt(ext) {
    var result = mimeNames[ext.toLowerCase()];
    
    // It's better to give a default value.
    if (result == null)
        result = 'application/octet-stream';
    
    return result;
}

function readRangeHeader(range, totalLength) {
    /*
     * Example of the method 'split' with regular expression.
     * 
     * Input: bytes=100-200
     * Output: [null, 100, 200, null]
     * 
     * Input: bytes=-200
     * Output: [null, null, 200, null]
     */

    if (range == null || range.length == 0)
        return null;

    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    var result = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (totalLength - 1) : end
    };
    
    if (!isNaN(start) && isNaN(end)) {
        result.Start = start;
        result.End = totalLength - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        result.Start = totalLength - end;
        result.End = totalLength - 1;
    }

    return result;
}