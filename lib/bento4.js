'use strict';

importScripts('bento4/mp4fragment.js');
importScripts('bento4/mp4dump.js');
importScripts('bento4/mp4split.js');

function fragmentFile(file, dst) {
  console.debug('fragmentFile', file.name);
  return mp4fragment({
    arguments: ['--verbosity', '3', '--debug', file.name, dst],
    files: [file],
    fs: fs
  })[0];
}

// duration: float
// videoFragments: { start: float, duration: float, name: string }
// audioFragments: { start: float, duration: float, name: string }
function getMetadata(file) {
  console.debug('getMetadata', file.name);
  var m = '';
  mp4dump({
    arguments: ['--verbosity', '1', '--format', 'json', file.name],
    files: [file],
    fs: fs,
    print: function(line) {
      m += line;
    }
  });
  m = JSON.parse(m);
  console.debug('all metadata', m);
  
  var res = {};
  var moov = m.find(function(a) { return a.name === 'moov'; });
  var mvhd = moov.children.find(function(a) { return a.name === 'mvhd'; });
  res.duration = mvhd.duration / mvhd.timescale;
  var mfra = m.find(function(a) { return a.name === 'mfra'; });
  moov.children.filter(function(a) { return a.name === 'trak'; }).forEach(function(trak) {
    var tkhd = trak.children.find(function(a) { return a.name === 'tkhd'; });
    var mdia = trak.children.find(function(a) { return a.name === 'mdia'; });
    var mdhd = mdia.children.find(function(a) { return a.name === 'mdhd'; });
    var hdlr = mdia.children.find(function(a) { return a.name === 'hdlr'; });
    var tfra = mfra.children.find(function(a) { return a.name === 'tfra' && a.track_ID === tkhd.id; });
    
    var fragKey;
    if (hdlr.handler_type === 'vide') {
      fragKey = 'videoFragments';
    } else if (hdlr.handler_type === 'soun') {
      fragKey = 'audioFragments';
    } else {
      console.debug('Skip handler_type', hdlr.handler_type);
      return;
    }
    
    res[fragKey] = [];
    var i;
    for (i in tfra) {
      if (i.indexOf('entry') === 0) {
        res[fragKey].push({start: tfra[i].match(/time=(\d+)/)[1] / mdhd.timescale });
      }
    }
    for (i = 0; i < res[fragKey].length - 1; i++) {
      res[fragKey][i].duration = res[fragKey][i + 1].start - res[fragKey][i].start;
    }
    var lastFragment = res[fragKey][res[fragKey].length - 1];
    lastFragment.duration = tkhd.duration / mvhd.timescale - lastFragment.start;
  });

  return res;
}

// Разбивает указанные track файла на dash чанки
function splitFile(file, outputDirectory, track, options) {
  console.debug('splitFile', file.name);
  options = options || {};
  return mp4split({
    arguments: [
      '--init-segment', options.initSegment || (outputDirectory + '/' + track + '.mp4'),
      '--media-segment', options.mediaSegment || (outputDirectory + '/' + track + '-%05llu.m4f'),
      '--pattern-parameters', 'N', '--' + track, '--verbose', file.name
    ],
    files: [file],
    fs: fs,
    outputDirectory: outputDirectory
  });
}