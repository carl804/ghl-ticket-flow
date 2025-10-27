
// src/lib/notificationSound.ts

interface SoundNote {

  freq: number;

  duration: number;

  slide?: number;

}

const sounds = {

  tritone: [

    { freq: 1000, duration: 0.15 },

    { freq: 1320, duration: 0.15 },

    { freq: 1480, duration: 0.3 }

  ],

  beep: [

    { freq: 800, duration: 0.2 }

  ],

  bell: [

    { freq: 1760, duration: 0.6 }

  ],

  swoosh: [

    { freq: 400, duration: 0.3, slide: 1200 }

  ],

  zap: [

    { freq: 1500, duration: 0.05 },

    { freq: 800, duration: 0.05 }

  ]

};

export type SoundType = keyof typeof sounds;

export function playNotificationSound(soundType: SoundType = 'tritone') {

  // Check if notifications are enabled

  const soundEnabled = localStorage.getItem("notification-sound-enabled");

  if (soundEnabled === "false") {

    console.log("Notification sound disabled");

    return;

  }

  // Get volume

  const volumeStr = localStorage.getItem("notification-volume");

  const volume = volumeStr ? parseInt(volumeStr) / 100 : 0.7;

  // Get selected sound type (if saved)

  const savedSound = localStorage.getItem("notification-sound-type") as SoundType;

  const selectedSound = sounds[savedSound] || sounds[soundType];

  

  try {

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    let startTime = audioContext.currentTime;

    selectedSound.forEach((note: SoundNote) => {

      const oscillator = audioContext.createOscillator();

      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);

      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(note.freq, startTime);

      

      if (note.slide) {

        oscillator.frequency.linearRampToValueAtTime(

          note.slide,

          startTime + note.duration

        );

      }

      gainNode.gain.setValueAtTime(0, startTime);

      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);

      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);

      oscillator.start(startTime);

      oscillator.stop(startTime + note.duration);

      startTime += note.duration;

    });

    

    console.log(`🔔 Notification sound played: ${savedSound || soundType}`);

  } catch (error) {

    console.error("Failed to play notification sound:", error);

  }

}

// Function to get the selected notification sound type from localStorage

export function getSelectedSound(): SoundType {

  const saved = localStorage.getItem("notification-sound-type");

  return (saved as SoundType) || 'tritone';

}

// Function to save the selected sound

export function saveSelectedSound(soundType: SoundType) {

  localStorage.setItem("notification-sound-type", soundType);

}

