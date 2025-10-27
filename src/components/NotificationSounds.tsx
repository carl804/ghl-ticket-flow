import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Check, Bell } from 'lucide-react';

interface SoundNote {
  freq: number;
  duration: number;
  slide?: number;
}

interface Sound {
  id: string;
  name: string;
  icon: string;
  description: string;
  frequencies: SoundNote[];
}

export default function NotificationSounds() {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("notification-volume");
    return saved ? parseInt(saved) / 100 : 0.7;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("notification-sound-enabled");
    return saved ? JSON.parse(saved) : true;
  });
  const [selectedSound, setSelectedSound] = useState(() => {
    const saved = localStorage.getItem("notification-sound-type");
    return saved || 'tritone';
  });
  const [selectedSoundNewTicket, setSelectedSoundNewTicket] = useState(() => {
    const saved = localStorage.getItem("notification-sound-type-new-ticket");
    return saved || 'ding';
  });
  const [playing, setPlaying] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(() => {
    const saved = localStorage.getItem("notification-repeat-count");
    return saved ? parseInt(saved) : 1;
  });
  const [notifyOnlyWhenAway, setNotifyOnlyWhenAway] = useState(() => {
    const saved = localStorage.getItem("notification-only-when-away");
    return saved ? JSON.parse(saved) : false;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem("notification-volume", (volume * 100).toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("notification-sound-enabled", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("notification-sound-type", selectedSound);
  }, [selectedSound]);

  useEffect(() => {
    localStorage.setItem("notification-sound-type-new-ticket", selectedSoundNewTicket);
  }, [selectedSoundNewTicket]);

  useEffect(() => {
    localStorage.setItem("notification-repeat-count", repeatCount.toString());
  }, [repeatCount]);

  useEffect(() => {
    localStorage.setItem("notification-only-when-away", JSON.stringify(notifyOnlyWhenAway));
  }, [notifyOnlyWhenAway]);

  const sounds: Sound[] = [
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
      id: 'ding',
      name: 'Ding',
      icon: '🔔',
      description: 'Apple notification',
      frequencies: [
        { freq: 1200, duration: 0.1 },
        { freq: 1800, duration: 0.15 }
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
    },
    {
      id: 'pacman',
      name: 'Pac-Man',
      icon: '🟡',
      description: 'Waka waka waka',
      frequencies: [
        { freq: 493, duration: 0.08 },
        { freq: 587, duration: 0.08 },
        { freq: 493, duration: 0.08 },
        { freq: 587, duration: 0.08 }
      ]
    }
  ];

  const playSound = (sound: Sound) => {
    if (!soundEnabled) return;
    
    setPlaying(sound.id);
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let startTime = audioContext.currentTime;

    sound.frequencies.forEach((note: SoundNote) => {
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
      <div className="w-64 bg-black/30 backdrop-blur-xl border-r border-white/20 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Sounds</h2>
        </div>

        {/* New Messages Section */}
        <div className="mb-6">
          <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">New Messages</h3>
          <div className="space-y-2">
            {sounds.map((sound) => (
              <button
                key={`msg-${sound.id}`}
                onClick={() => {
                  setSelectedSound(sound.id);
                  playSound(sound);
                }}
                disabled={playing === sound.id || !soundEnabled}
                className={`
                  w-full text-left p-2.5 rounded-lg transition-all duration-200 relative
                  ${playing === sound.id 
                    ? 'bg-[#4890F8]/80 shadow-lg shadow-blue-500/30' 
                    : selectedSound === sound.id
                      ? 'bg-[#4890F8]/60 shadow-md'
                      : 'bg-white/5 hover:bg-white/10'
                  }
                  ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{sound.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-xs">{sound.name}</div>
                    <div className="text-blue-100 text-[10px] truncate">{sound.description}</div>
                  </div>
                  {selectedSound === sound.id && (
                    <Check className="h-3 w-3 text-white flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* New Tickets Section */}
        <div className="mb-6 pt-4 border-t border-white/10">
          <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">New Tickets</h3>
          <div className="space-y-2">
            {sounds.map((sound) => (
              <button
                key={`ticket-${sound.id}`}
                onClick={() => {
                  setSelectedSoundNewTicket(sound.id);
                  playSound(sound);
                }}
                disabled={playing === sound.id || !soundEnabled}
                className={`
                  w-full text-left p-2.5 rounded-lg transition-all duration-200 relative
                  ${playing === sound.id 
                    ? 'bg-[#4890F8]/80 shadow-lg shadow-blue-500/30' 
                    : selectedSoundNewTicket === sound.id
                      ? 'bg-[#4890F8]/60 shadow-md'
                      : 'bg-white/5 hover:bg-white/10'
                  }
                  ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{sound.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-xs">{sound.name}</div>
                    <div className="text-blue-100 text-[10px] truncate">{sound.description}</div>
                  </div>
                  {selectedSoundNewTicket === sound.id && (
                    <Check className="h-3 w-3 text-white flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sound Enable Toggle */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-white text-xs font-medium">Notifications</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                ${soundEnabled ? 'bg-[#4890F8]' : 'bg-white/20'}
              `}
            >
              <span
                className={`
                  inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                  ${soundEnabled ? 'translate-x-5' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
        </div>

        {/* Volume Control */}
        <div className="mt-3">
          <div className="text-white text-xs font-medium mb-2">Volume</div>
          <div className="flex items-center gap-2">
            <VolumeX className="text-blue-200" size={14} />
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
              disabled={!soundEnabled}
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #4890F8 0%, #4890F8 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <Volume2 className="text-blue-200" size={14} />
          </div>
          <div className="text-blue-100 text-[10px] text-center mt-1">{Math.round(volume * 100)}%</div>
        </div>

        {/* Repeat Count */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-white text-xs font-medium mb-2">Repeat Sound</div>
          <select
            value={repeatCount}
            onChange={(e) => setRepeatCount(parseInt(e.target.value))}
            disabled={!soundEnabled}
            className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#4890F8]"
          >
            <option value="1">Once</option>
            <option value="2">2 times</option>
            <option value="3">3 times</option>
            <option value="5">5 times</option>
          </select>
        </div>

        {/* Only When Away */}
        <div className="mt-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-white text-xs font-medium">Only when away</div>
              <div className="text-blue-100 text-[10px] mt-0.5">Tab inactive only</div>
            </div>
            <button
              onClick={() => setNotifyOnlyWhenAway(!notifyOnlyWhenAway)}
              disabled={!soundEnabled}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                ${notifyOnlyWhenAway ? 'bg-[#4890F8]' : 'bg-white/20'}
                ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                  ${notifyOnlyWhenAway ? 'translate-x-5' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
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
              <div className="text-center space-y-8">
                {/* New Messages */}
                <div className="pb-8 border-b border-white/20">
                  <div className="text-sm text-blue-200 mb-2">New Messages</div>
                  <div className="mb-4">
                    <span className="text-7xl">
                      {sounds.find(s => s.id === selectedSound)?.icon}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {sounds.find(s => s.id === selectedSound)?.name}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {sounds.find(s => s.id === selectedSound)?.description}
                  </p>
                </div>

                {/* New Tickets */}
                <div>
                  <div className="text-sm text-blue-200 mb-2">New Tickets</div>
                  <div className="mb-4">
                    <span className="text-7xl">
                      {sounds.find(s => s.id === selectedSoundNewTicket)?.icon}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {sounds.find(s => s.id === selectedSoundNewTicket)?.name}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {sounds.find(s => s.id === selectedSoundNewTicket)?.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}