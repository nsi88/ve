'use strict';

importScripts('ffmpeg/ffmpeg.js?' + Math.random());

// Если не создался тумбнейл на указанной секунде пробуем создать на нулевой
// Нужно т.к. генерация тумбнейлов запускается в первую очередь, когда ещё нет метаинформации
function makeThumbnail(opts, callback) {
  console.debug('makeThumbnail', opts);
  opts.sec = opts.sec || 0;
  ffmpeg({
    arguments: ['-ss', opts.sec.toString(), '-i', opts.file.name, '-vf', 'scale=-1:50', '-vframes', '1', '-v', 'debug', opts.dst],
    files: [opts.file],
    fs: opts.fs,
    callback: function(err, thumbnails) {
      if ((err || !thumbnails.length) && opts.sec > 0) {
        opts.sec = 0;
        makeThumbnail(opts, callback);
      } else if (err) {
        callback(err);
      } else {
        console.debug('thumbnails', thumbnails);
        callback(null, thumbnails[0]);
      }
    }
  });
}

// mp4 поддерживает не все кодеки. 
// транскодируем неподдерживаемые аудио кодеки (напр. pcm)
// выдаем ошибку для неподдерживаемых видеокодеков
function repackFile(opts, callback) {
  console.debug('repackFile', opts);
  if (opts.file.name.split('.').pop() === 'mp4') {
    callback(null, opts.file);
  } else {
    ffmpeg({
      arguments: ['-i', opts.file.name].concat(opts.transcodeAudio ? ['-c:v', 'copy', '-strict', '-2'] : ['-c', 'copy'], opts.outputDirectory + '/repack.mp4'),
      files: [opts.file],
      fs: opts.fs,
      callback: function(err, repacks) {
        if (err) {
          if (opts.transcodeAudio) {
            callback(err);
          } else {
            console.debug(err);
            opts.transcodeAudio = true;
            repackFile(opts, callback);
          }
        } else {
          callback(null, repacks[0]);
        }
      }
    });
  }
}

function cut(opts, callback) {
  console.debug('cut', opts);
  var args = ['-i', opts.file.name, '-strict', '-2'];
  if (opts.ss) {
    args = args.concat(['-ss', opts.ss.toString()]);
  } else {
    args = args.concat(['-c', 'copy']);
  }
  if (opts.t) {
    args = args.concat(['-t', opts.t.toString()]);
  }
  args.push(opts.dst);
  console.debug(args);
  ffmpeg({
    arguments: args,
    files: [opts.file],
    fs: opts.fs,
    callback: callback
  });
}