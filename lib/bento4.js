'use strict';

importScripts('bento4/mp4fragment.js?' + Math.random());
importScripts('bento4/mp4dump.js?' + Math.random());
importScripts('bento4/mp4split.js?' + Math.random());

function fragmentFile(file, dst) {
  console.debug('fragmentFile', file.name);
  return mp4fragment({
    arguments: [file.name, dst],
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
  options['init-segment'] = options['init-segment'] || (outputDirectory + '/' + track + '.mp4');
  options['media-segment'] = options['media-segment'] || (outputDirectory + '/' + track + '-%05llu.m4f');
  options['pattern-parameters'] = options['pattern-parameters'] || 'N';
  options[track] = true;
  
  var args = [];
  for (var o in options) {
    args.push('--' + o);
    if (options[o] !== true) {
      args.push(options[o]);
    }
  }
  args.push(file.name);
  console.debug(args);
  
  return mp4split({
    arguments: args,
    files: [file],
    fs: fs,
    outputDirectory: outputDirectory
  });
}