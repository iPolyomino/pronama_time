"use strict";

let audio;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "play_audio") {
    return;
  }

  audio = new Audio(message.path);

  audio.play().then(() => {
    audio.addEventListener("ended", () => {
      notifyAudioEnded();
    });
  }).catch((error) => {
    console.error("Failed to play audio:", error);
    notifyAudioEnded();
  });
});

function notifyAudioEnded() {
  chrome.runtime.sendMessage({
    type: "audio_ended",
  });
  audio = undefined;
}
