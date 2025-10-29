import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const NOTIFICATION_SOUNDS = [
  { id: 'tritone', label: '🔔 Tri-tone', description: 'Apple SMS' },
  { id: 'beep', label: '🔊 Beep', description: 'Classic beep' },
  { id: 'bell', label: '🎶 Bell', description: 'Single bell' },
  { id: 'swoosh', label: '💫 Swoosh', description: 'Upward swoosh' },
  { id: 'zap', label: '⚡ Zap', description: 'Quick electronic' },
  { id: 'silent', label: '🔕 Silent', description: 'No sound' },
];

export default function NotificationSettingsDialog() {
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(70);
  const [selectedSound, setSelectedSound] = useState('tritone');

  useEffect(() => {
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setSoundEnabled(settings.soundEnabled ?? true);
      setVolume(settings.volume ?? 70);
      setSelectedSound(settings.selectedSound ?? 'tritone');
    }
  }, []);

  const saveSettings = (newSettings: Partial<{ soundEnabled: boolean; volume: number; selectedSound: string }>) => {
    const currentSettings = {
      soundEnabled,
      volume,
      selectedSound,
      ...newSettings,
    };
    localStorage.setItem('notification-settings', JSON.stringify(currentSettings));
    if (newSettings.soundEnabled !== undefined) setSoundEnabled(newSettings.soundEnabled);
    if (newSettings.volume !== undefined) setVolume(newSettings.volume);
    if (newSettings.selectedSound !== undefined) setSelectedSound(newSettings.selectedSound);
  };

  const playNotificationSound = (soundId: string, testVolume?: number) => {
    if (soundId === 'silent') return;
    
    const audioContext = new AudioContext();
    const masterGain = audioContext.createGain();
    masterGain.gain.value = (testVolume ?? volume) / 100;
    masterGain.connect(audioContext.destination);
    
    const sounds = {
      tritone: [
        { freq: 1318.51, start: 0, duration: 0.15 },
        { freq: 1108.73, start: 0.15, duration: 0.15 },
        { freq: 880.00, start: 0.30, duration: 0.25 }
      ],
      beep: [
        { freq: 800, start: 0, duration: 0.2 }
      ],
      bell: [
        { freq: 1000, start: 0, duration: 0.3 }
      ],
      swoosh: [
        { freq: 400, start: 0, duration: 0.1 },
        { freq: 800, start: 0.1, duration: 0.1 },
        { freq: 1200, start: 0.2, duration: 0.1 }
      ],
      zap: [
        { freq: 2000, start: 0, duration: 0.05 },
        { freq: 100, start: 0.05, duration: 0.05 }
      ]
    };
    
    const notes = sounds[soundId as keyof typeof sounds] || sounds.tritone;
    
    notes.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      oscillator.frequency.value = note.freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + note.start);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + note.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.start + note.duration);
      
      oscillator.start(audioContext.currentTime + note.start);
      oscillator.stop(audioContext.currentTime + note.start + note.duration);
    });
  };

  const handleTestSound = () => {
    playNotificationSound(selectedSound, volume);
  };

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Settings className="h-5 w-5" />
          Settings
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Configure sound alerts for new messages
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {/* Sound Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-enabled" className="text-sm font-medium">Enable Sound</Label>
                <p className="text-xs text-muted-foreground">
                  Play notification sounds for new messages
                </p>
              </div>
              <Switch
                id="sound-enabled"
                checked={soundEnabled}
                onCheckedChange={(checked) => saveSettings({ soundEnabled: checked })}
              />
            </div>

            {/* Volume Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume" className="text-sm font-medium">Volume</Label>
                <span className="text-sm text-muted-foreground font-medium">{volume}%</span>
              </div>
              <Slider
                id="volume"
                value={[volume]}
                onValueChange={([value]) => saveSettings({ volume: value })}
                disabled={!soundEnabled}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Sound Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Notification Sound</Label>
              <div className="space-y-2">
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => {
                      saveSettings({ selectedSound: sound.id });
                      if (soundEnabled && sound.id !== 'silent') {
                        playNotificationSound(sound.id, volume);
                      }
                    }}
                    disabled={!soundEnabled}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                      selectedSound === sound.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${!soundEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{sound.label}</div>
                      <div className="text-xs text-muted-foreground">{sound.description}</div>
                    </div>
                    {selectedSound === sound.id && (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Button */}
            <Button
              onClick={handleTestSound}
              disabled={!soundEnabled || selectedSound === 'silent'}
              className="w-full"
              variant="outline"
            >
              🎵 Test Sound
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}