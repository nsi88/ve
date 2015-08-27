'use strict';

function Timeline(timelineId, playerObj) {
  this.el = document.getElementById(timelineId);
  this.player = playerObj;
  this.el.addEventListener('input', this.oninput.bind(this), false);
}

Timeline.prototype.oninput = function(e) {
  this.player.seek(this.el.value);
};

Timeline.prototype.seek = function(position) {
  this.el.value = position;
};

Timeline.prototype.setDuration = function(duration) {
  this.el.max = duration;
  this.el.value = 0;
  this.el.style.display = '';
};

module.exports = Timeline;