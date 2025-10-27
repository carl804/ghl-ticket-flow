import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function NotificationSounds() {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("notification-volume");
    return saved ? parseInt(saved) / 100 : 0.7;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("notification-sound-enabled");
    return saved ? JSON.parse(saved) : true;
  });
  const [playing, setPlaying] = useState<string | null>(null);

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem("notification-volume", (volume * 100).toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("notification-sound-enabled", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const sounds = [
    {
      id: 'tritone',
      name: 'Tri-tone',
      icon: '🔔',
      description: 'Apple SMS',
      frequencies: [
        { freq: 1000, duration: 0.15 },
        { freq: 1320, duration: 0.15 },
        { freq: 1480, duration: 0.3 }
      ]
    },
    {
      id: 'beep',
      name: 'Beep',
      icon: '🔊',
      description: 'Classic beep',
      frequencies: [
        { freq: 800, duration: 0.2 }
      ]
    },
    {
      id: 'bell',
      name: 'Bell',
      icon: '🎶',
      description: 'Single bell',
      frequencies: [
        { freq: 1760, duration: 0.6 }
      ]
    },
    {
      id: 'swoosh',
      name: 'Swoosh',
      icon: '💫',
      description: 'Upward swoosh',
      frequencies: [
        { freq: 400, duration: 0.3, slide: 1200 }
      ]
    },
    {
      id: 'zap',
      name: 'Zap',
      icon: '⚡',
      description: 'Quick electronic',
      frequencies: [
        { freq: 1500, duration: 0.05 },
        { freq: 800, duration: 0.05 }
      ]
    }
  ];

  const playSound = (sound: typeof sounds[0]) => {
    if (!soundEnabled) return;
    
    setPlaying(sound.id);
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let startTime = audioContext.currentTime;

    sound.frequencies.forEach((note) => {
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

    setTimeout(() => setPlaying(null), startTime * 1000);
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-blue-400 via-[#4890F8] to-blue-700">
      {/* Sidebar */}
      <div className="w-64 bg-black/30 backdrop-blur-xl border-r border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Sounds</h2>
        </div>
        <div className="space-y-2">
          {sounds.map((sound) => (
            <button
              key={sound.id}
              onClick={() => playSound(sound)}
              disabled={playing === sound.id || !soundEnabled}
              className={`
                w-full text-left p-3 rounded-lg transition-all duration-200
                ${playing === sound.id 
                  ? 'bg-[#4890F8]/80 shadow-lg shadow-blue-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
                }
                ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{sound.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">{sound.name}</div>
                  <div className="text-blue-100 text-xs truncate">{sound.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Sound Enable Toggle */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-white text-sm font-medium">Notifications</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${soundEnabled ? 'bg-[#4890F8]' : 'bg-white/20'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
        </div>

        {/* Volume Control in Sidebar */}
        <div className="mt-4">
          <div className="text-white text-sm font-medium mb-3">Volume</div>
          <div className="flex items-center gap-3">
            <VolumeX className="text-blue-200" size={16} />
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
              disabled={!soundEnabled}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #4890F8 0%, #4890F8 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <Volume2 className="text-blue-200" size={16} />
          </div>
          <div className="text-blue-100 text-xs text-center mt-2">{Math.round(volume * 100)}%</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-3">Classic Notification Sounds</h1>
            <p className="text-blue-50 text-lg">Click any sound from the sidebar to play</p>
          </div>

          {/* Large Display Area */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20">
            {playing ? (
              <div className="text-center">
                <div className="mb-6">
                  <span className="text-9xl">
                    {sounds.find(s => s.id === playing)?.icon}
                  </span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">
                  {sounds.find(s => s.id === playing)?.name}
                </h2>
                <p className="text-blue-50 text-xl mb-8">
                  {sounds.find(s => s.id === playing)?.description}
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-2 h-16 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-16 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-16 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-2 h-16 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-8xl mb-6">🎵</div>
                <h2 className="text-3xl font-semibold text-white mb-3">
                  Ready to Play
                </h2>
                <p className="text-blue-100 text-lg">
                  Select a sound from the sidebar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
