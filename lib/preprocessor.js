'use strict';

importScripts('ffmpeg.js?' + Math.random());
importScripts('mp4fragment.js?' + Math.random());
importScripts('mp4dump.js?' + Math.random());
importScripts('mp4split.js?' + Math.random());
var fs = webkitRequestFileSystemSync(TEMPORARY, 1);

onmessage = function(event) {
  console.debug(event.data);
  var file = event.data.file;

  if (file.type.indexOf('video') === 0) {
    processVideo(file, fs);
  } else if (file.type.indexOf('audio') === 0) {
    processAudio(file, fs);
  } else {
    throw('Invalid file type for ' + file.name);
  }
};

function processVideo(file) {
  postMessage({ file: file.name, attr: 'state', value: 'processing' });
  var outputDirectory = Date.now().toString();
  postMessage({ file: file.name, attr: 'outputDirectory', value: outputDirectory });

  // 1. Make image
  makeImage(file, 10, function(err, image) {
    if (err) {
      throw(err);
    } else {
      postMessage({ file: file.name, attr: 'image', value: image.name });
      // 2. Repack to mp4
      repackFile(file, false, function(err, repack) {
        if (err) {
          throw(err);
        } else {
          // Bento в отличии от ffmpeg работает синхронно
          // 3. Fragment file
          var frag = fragmentFile(repack);
          if (file.name !== repack.name) {
            fs.root.getFile(outputDirectory + '/' + repack.name, {}).remove();
          }
          
          // 4. Get metadata
          var metadata = getMetadata(frag);
          console.debug(metadata);

          // 5. Split file
          var i;
          ['video', 'audio'].forEach(function(track) {
            if (metadata[track + 'Fragments']) {
              var fragments = splitFile(frag, track).map(function(f) { return f.name; }).sort();
              console.debug('fragments', fragments);
              // NOTE length + 1 для init сегмента
              if (fragments.length !== metadata[track + 'Fragments'].length + 1) {
                throw 'Wrong count of fragments';
              }
              for (i = 0; i < fragments.length - 1; i++) {
                metadata[track + 'Fragments'][i].name = fragments[i];
              }
            }
          });

          for (i in metadata) {
            postMessage({ file: file.name, attr: i, value: metadata[i] });
          }

          fs.root.getFile(outputDirectory + '/' + frag.name, {}).remove();
        }
      });
    }
  });

  // Если не создался тумбнейл на указанной секунде пробуем создать на нулевой
  // Нужно т.к. генерация тумбнейлов запускается в первую очередь, когда ещё нет метаинформации
  function makeImage(file, sec, callback) {
    console.debug('makeImage', file.name, sec);
    ffmpeg({
      arguments: ['-ss', sec.toString(), '-i', file.name, '-vf', 'scale=-1:50', '-vframes', '1', '-v', 'debug', outputDirectory + '/image.jpg'],
      files: [file],
      fs: fs,
      callback: function(err, images) {
        if (err) {
          callback(err);
        } else if (!images.length && sec > 0) {
          makeImage(file, 0, callback);
        } else {
          console.debug('images', images);
          callback(null, images[0]);
        }
      }
    });
  }

  // mp4 поддерживает не все кодеки. 
  // транскодируем неподдерживаемые аудио кодеки (напр. pcm)
  // выдаем ошибку для неподдерживаемых видеокодеков
  function repackFile(file, transcodeAudio, callback) {
    console.debug('repackFile', file.name, transcodeAudio);
    if (file.name.split('.').pop() === 'mp4') {
      callback(null, file);
    } else {
      ffmpeg({
        arguments: ['-i', file.name].concat(transcodeAudio ? ['-c:v', 'copy', '-strict', '-2'] : ['-c', 'copy'], outputDirectory + '/repack.mp4'),
        files: [file],
        fs: fs,
        callback: function(err, repacks) {
          if (err) {
            if (transcodeAudio) {
              callback(err);
            } else {
              console.debug(err);
              repackFile(file, true, callback);
            }
          } else {
            callback(null, repacks[0]);
          }
        }
      });
    }
  }

  function fragmentFile(file) {
    console.debug('fragmentFile', file.name);
    return mp4fragment({
      arguments: ['--verbosity', '3', '--debug', file.name, outputDirectory + '/frag.mp4'],
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
  
  function splitFile(file, track) {
    console.debug('splitFile', file.name);
    return mp4split({
      arguments: ['--init-segment', outputDirectory + '/' + track + '.mp4', '--media-segment', outputDirectory + '/' + track + '-%05llu.m4f', '--pattern-parameters', 'N', '--' + track, '--verbose', file.name],
      files: [file],
      fs: fs,
      outputDirectory: outputDirectory
    });
  }
}

function processAudio(file, fs) {

}