'use strict';

var $ = require('jquery');

$(function(){
  var mustache = require('mustache');
  
  $('#add').change(function() {
    var files = $(this)[0].files;
    for (var i = 0; i < files.length; i++) {
      $('#files').append(mustache.render($('#file').html(), { file: files[i] }));
    }
  });
});