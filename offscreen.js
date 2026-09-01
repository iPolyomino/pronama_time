"use strict";

let audio;

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen" || message.type !== "play_audio") {
    return;
  }

  audio = new Audio(message.path);
  audio.addEventListener("ended", () => {
    notifyAudioEnded().catch(reportError);
  }, { once: true });

  audio.play().catch((error) => {
    console.error("Failed to play audio:", error);
    notifyAudioEnded().catch(reportError);
  });
});

async function notifyAudioEnded() {
  await chrome.runtime.sendMessage({
    type: "audio_ended",
    target: "service_worker",
  });
  audio = undefined;
}

function reportError(error) {
  console.error(error);
}
