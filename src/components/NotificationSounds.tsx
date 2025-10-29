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
  const [playingSection, setPlayingSection] = useState<'messages' | 'tickets' | null>(null);
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

  const playSound = (sound: Sound, section: 'messages' | 'tickets') => {
    if (!soundEnabled) return;
    
    setPlaying(sound.id);
    setPlayingSection(section);
    
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

    setTimeout(() => {
      setPlaying(null);
      setPlayingSection(null);
    }, startTime * 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-[#4890F8] to-blue-700 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Team Notification Settings</h1>
          <p className="text-blue-100">Configure sound alerts for your support workflow</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* New Messages */}
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">New Messages</h2>
                <p className="text-gray-600 text-sm">Sound when new chat messages arrive</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {sounds.map((sound) => (
                <button
                  key={`msg-${sound.id}`}
                  onClick={() => {
                    setSelectedSound(sound.id);
                    playSound(sound, 'messages');
                  }}
                  disabled={(playing === sound.id && playingSection === 'messages') || !soundEnabled}
                  style={{
                    backgroundColor: ((playing === sound.id && playingSection === 'messages') || selectedSound === sound.id) ? '#4890F8' : '',
                    borderColor: ((playing === sound.id && playingSection === 'messages') || selectedSound === sound.id) ? '#4890F8' : ''
                  }}
                  className={`
                    p-4 rounded-xl transition-all duration-200 relative text-left border-2
                    ${(playing === sound.id && playingSection === 'messages')
                      ? 'shadow-xl shadow-blue-500/30 scale-105' 
                      : selectedSound === sound.id
                        ? 'shadow-lg'
                        : 'bg-gray-50 border-gray-200 hover:border-[#4890F8] hover:bg-gray-100 hover:scale-102'
                    }
                    ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{sound.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${((playing === sound.id && playingSection === 'messages') || selectedSound === sound.id) ? 'text-white' : 'text-gray-800'}`}>
                        {sound.name}
                      </div>
                      <div className={`text-xs truncate ${((playing === sound.id && playingSection === 'messages') || selectedSound === sound.id) ? 'text-blue-100' : 'text-gray-500'}`}>
                        {sound.description}
                      </div>
                    </div>
                    {selectedSound === sound.id && (
                      <Check className="h-5 w-5 text-white flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* New Tickets */}
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <span className="text-2xl">🎫</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">New Tickets</h2>
                <p className="text-gray-600 text-sm">Sound when new support tickets are created</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {sounds.map((sound) => (
                <button
                  key={`ticket-${sound.id}`}
                  onClick={() => {
                    setSelectedSoundNewTicket(sound.id);
                    playSound(sound, 'tickets');
                  }}
                  disabled={(playing === sound.id && playingSection === 'tickets') || !soundEnabled}
                  style={{
                    backgroundColor: ((playing === sound.id && playingSection === 'tickets') || selectedSoundNewTicket === sound.id) ? '#4890F8' : '',
                    borderColor: ((playing === sound.id && playingSection === 'tickets') || selectedSoundNewTicket === sound.id) ? '#4890F8' : ''
                  }}
                  className={`
                    p-4 rounded-xl transition-all duration-200 relative text-left border-2
                    ${(playing === sound.id && playingSection === 'tickets')
                      ? 'shadow-xl shadow-blue-500/30 scale-105' 
                      : selectedSoundNewTicket === sound.id
                        ? 'shadow-lg'
                        : 'bg-gray-50 border-gray-200 hover:border-[#4890F8] hover:bg-gray-100 hover:scale-102'
                    }
                    ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{sound.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${((playing === sound.id && playingSection === 'tickets') || selectedSoundNewTicket === sound.id) ? 'text-white' : 'text-gray-800'}`}>
                        {sound.name}
                      </div>
                      <div className={`text-xs truncate ${((playing === sound.id && playingSection === 'tickets') || selectedSoundNewTicket === sound.id) ? 'text-blue-100' : 'text-gray-500'}`}>
                        {sound.description}
                      </div>
                    </div>
                    {selectedSoundNewTicket === sound.id && (
                      <Check className="h-5 w-5 text-white flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}}
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="mt-8 bg-white/95 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Audio Settings</h2>
              <p className="text-gray-600 text-sm">Configure volume and notification behavior</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Enable/Disable */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-gray-800 font-semibold text-sm">Enable Notifications</div>
                  <div className="text-gray-600 text-xs">Turn sound alerts on/off</div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${soundEnabled ? 'bg-[#4890F8]' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                      ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </label>
            </div>

            {/* Volume */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-gray-800 font-semibold text-sm mb-2">Volume</div>
              <div className="flex items-center gap-3">
                <VolumeX className="text-gray-500" size={16} />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume * 100}
                  onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
                  disabled={!soundEnabled}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, #4890F8 0%, #4890F8 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                  }}
                />
                <Volume2 className="text-gray-500" size={16} />
              </div>
              <div className="text-gray-600 text-xs text-center mt-2">{Math.round(volume * 100)}%</div>
            </div>

            {/* Repeat Count */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-gray-800 font-semibold text-sm mb-2">Repeat Sound</div>
              <select
                value={repeatCount}
                onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                disabled={!soundEnabled}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#4890F8] focus:border-[#4890F8]"
              >
                <option value="1">Once</option>
                <option value="2">2 times</option>
                <option value="3">3 times</option>
                <option value="5">5 times</option>
              </select>
            </div>

            {/* Only When Away */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-gray-800 font-semibold text-sm">Only when away</div>
                  <div className="text-gray-600 text-xs">Tab inactive only</div>
                </div>
                <button
                  onClick={() => setNotifyOnlyWhenAway(!notifyOnlyWhenAway)}
                  disabled={!soundEnabled}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${notifyOnlyWhenAway ? 'bg-[#4890F8]' : 'bg-gray-300'}
                    ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                      ${notifyOnlyWhenAway ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>

        {/* Test Area */}
        {playing && (
          <div className="mt-8 bg-white/95 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 shadow-lg text-center">
            <div className="mb-4">
              <span className="text-6xl">
                {sounds.find(s => s.id === playing)?.icon}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">
              {sounds.find(s => s.id === playing)?.name}
            </h3>
            <p className="text-gray-600 mb-6">
              {sounds.find(s => s.id === playing)?.description}
            </p>
            <div className="flex justify-center gap-1">
              <div className="w-1 h-8 bg-[#4890F8] rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-8 bg-[#4890F8] rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
              <div className="w-1 h-8 bg-[#4890F8] rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-8 bg-[#4890F8] rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}