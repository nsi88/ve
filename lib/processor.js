'use strict';

importScripts('ffmpeg.js?' + Math.random());
importScripts('bento4.js?' + Math.random());
var fs = webkitRequestFileSystemSync(TEMPORARY, 1);

onmessage = function(event) {
  var slice = event.data;
  console.debug(slice);
  sliceTrack(slice, 'video', function(err, slice) {
    if (err) {
      throw(err);
    } else {
      sliceTrack(slice, 'audio', function(err, slice) {
        if (err) {
          throw(err);
        } else {
          for (var i in slice) {
            if (i != 'thumbnail') {
              postMessage({ name: slice.name, attr: i, value: slice[i] });
            }
          }
          slice.fragmented = true;
          postMessage({ name: slice.name, attr: 'fragmented', value: true });
          console.debug('slice', slice);
        }
      });
    }
  });
};

function sliceTrack(slice, track, callback) {
  var mediaFile = slice.mediaFile;
  if (mediaFile[track + 'InitFragment']) {
    console.debug(track);
    slice[track + 'InitFragment'] = mediaFile[track + 'InitFragment'];
    slice[track + 'Codec'] = mediaFile[track + 'Codec'];
    var from, to;
    for (from = -1; mediaFile[track + 'Fragments'][from + 1] && mediaFile[track + 'Fragments'][from + 1].start <= slice.start; from++);
    if (from == -1) {
      throw 'Cannot slice from ' + slice.start + ' to ' + slice.start + slice.duration;
    }
    for (to = from; mediaFile[track + 'Fragments'][to + 1] && mediaFile[track + 'Fragments'][to + 1].start < slice.start + slice.duration; to++);
    var fragments = mediaFile[track + 'Fragments'].slice(from, to + 1);
    console.debug('fragments', fragments);
    
    var fragment = fragments.shift();
    sliceFragment(slice, track, fragment, function(err, newFragments) {
      if (err) {
        callback(err);
      } else {
        slice[track + 'Fragments'] = newFragments;
        fragment = fragments.pop();
        if (fragment) {
          sliceFragment(slice, track, fragment, function(err, newFragments) {
            if (err) {
              callback(err);
            } else {
              if (fragments.length) {
                slice[track + 'Fragments'] = slice[track + 'Fragments'].concat(fragments);
              }
              slice[track + 'Fragments'] = slice[track + 'Fragments'].concat(newFragments);
              callback(null, slice);
            }
          });
        } else {
          callback(null, slice)
        }
      }
    });
  } else {
    callback(null, slice);
  }
}

function sliceFragment(slice, track, fragment, callback) {
  function inner() {
    cut({ file: concated.file(), ss: ss, t: t, dst: dst, fs: fs }, function(err, parts) {
      if (err) {
        callback(err);
      } else {
        concated.remove();
        var frag = fragmentFile(parts[0], outputDirectory + '/' + track + '_frag.mp4');
        fs.root.getFile(outputDirectory + '/' + parts[0].name, {}).remove();

        var metadata = getMetadata(frag);
        console.debug(metadata);
        
        var splits = splitFile(frag, outputDirectory, track, {
          'init-segment': dst,
          'media-segment': (outputDirectory + '/' + track + '-%05llu' + postfix + '.m4f'),
          'media-only': true
        }).map(function(f) { return outputDirectory + '/' + f.name; });
        console.debug('splits', splits);
        if (splits.length !== metadata[track + 'Fragments'].length) {
          throw 'Wrong count of fragments';
        }

        for (var i = 0; i < splits.length; i++) {
          metadata[track + 'Fragments'][i].path = splits[i];
          metadata[track + 'Fragments'][i].start += fragment.start + (ss || 0);
        }
        callback(null, metadata[track + 'Fragments']);
      }
    });
  }
  var outputDirectory = fragment.path.split('/')[0];
  var ss, t;
  if (slice.start > fragment.start) {
    ss = slice.start - fragment.start;
  }
  if (fragment.start + fragment.duration > slice.start + slice.duration) {
    t = slice.duration;
  }
  if (ss || t) {
    var postfix = (ss ? '-ss' + ss : '') + (t ? '-t' + t : '');
    var dst = fragment.path.replace('.m4f', postfix + '.mp4');
    var concated = concat([slice[track + 'InitFragment'], fragment.path], outputDirectory + '/' + track + '_concat.mp4');
    if (!slice.thumbnail) {
      makeThumbnail({ file: concated.file(), dst: outputDirectory + '/thumbnail' + postfix + '.jpg', fs: fs }, function(err, thumbnail) {
        if (err) {
          callback(err);
        } else {
          slice.thumbnail = outputDirectory + '/' + thumbnail.name;
          // Возвращаем тумбнейл как можно быстрей
          postMessage({ name: slice.name, attr: 'thumbnail', value: slice.thumbnail });
          inner();
        }
      });
    } else {
      inner();
    }
  } else {
    if (!slice.thumbnail) {
      slice.thumbnail = slice.mediaFile.thumbnail;
      postMessage({ name: slice.name, attr: 'thumbnail', value: slice.thumbnail });
    }
    callback(null, [fragment]);
  }
}

function concat(paths, dst) {
  console.debug('concat', paths, 'to', dst);
  var entry = fs.root.getFile(dst, { create: true });
  var writer = entry.createWriter();
  writer.write(new Blob(paths.map(function(path) {
    return new Uint8Array(new FileReaderSync().readAsArrayBuffer(fs.root.getFile(path, {}).file().slice()));
  })));
  return entry;
}