'use strict';

importScripts('ffmpeg.js?' + Math.random());
importScripts('bento4.js?' + Math.random());
var fs = webkitRequestFileSystemSync(TEMPORARY, 1);
var workerGlobalScope = this;

onmessage = function(event) {
  var mf = event.data;
  console.debug(mf);
  workerGlobalScope[mf.type + 'Process'](mf);
};

function videoProcess(mf) {
  var file = mf.file;
  var outputDirectory = Date.now().toString();

  // 1. Make thumbnail
  makeThumbnail({ file: file, sec: 10, fs: fs, dst: outputDirectory + '/thumbnail.jpg' }, function(err, thumbnail) {
    if (err) {
      throw(err);
    } else {
      postMessage({ name: mf.name, attr: 'thumbnail', value: outputDirectory + '/' + thumbnail.name });
      // 2. Repack to mp4
      repackFile({ file: file, transcodeAudio: false, fs: fs, outputDirectory: outputDirectory }, function(err, repack) {
        if (err) {
          throw(err);
        } else {
          // Bento в отличии от ffmpeg работает синхронно
          // 3. Fragment file
          var frag = fragmentFile(repack, outputDirectory + '/frag.mp4');
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
              var fragments = splitFile(frag, outputDirectory, track).map(function(f) { return outputDirectory + '/' + f.name; }).sort();
              console.debug('fragments', fragments);
              // NOTE length + 1 для init сегмента
              if (fragments.length !== metadata[track + 'Fragments'].length + 1) {
                throw 'Wrong count of fragments';
              }
              for (i = 0; i < fragments.length - 1; i++) {
                metadata[track + 'Fragments'][i].path = fragments[i];
              }
              metadata[track + 'InitFragment'] = outputDirectory + '/' + track + '.mp4';
              // TODO get codecs string from metadata (mp4info)
              metadata[track + 'Codec'] = { video: 'avc1.42C01E', audio: 'mp4a.40.2' }[track];
            }
          });
          metadata.fragmented = true;

          for (i in metadata) {
            postMessage({ name: mf.name, attr: i, value: metadata[i] });
          }

          fs.root.getFile(outputDirectory + '/' + frag.name, {}).remove();
        }
      });
    }
  });
}

function audioProcess(file, fs) {

}

function imageProcess(mf) {

}