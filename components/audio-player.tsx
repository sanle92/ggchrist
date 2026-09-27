'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Headphones } from 'lucide-react';
import { useClickOutside } from '@/lib/use-click-outside';

interface AudioPlayerProps {
  src: string;
  label?: string;
}

export function AudioPlayer({ src, label }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useClickOutside(speedMenuRef, () => setShowSpeedMenu(false), showSpeedMenu);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioProgress = () => {
      setProgress(audio.currentTime / audio.duration * 100);
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioProgress);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioProgress);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (newSpeed: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      <audio ref={audioRef} src={src} preload="metadata" aria-label={label} />
      
      <div className="flex items-center gap-4 rounded-full bg-white/10 backdrop-blur-md p-2">
        <button
          onClick={togglePlay}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-amber text-white transition hover:bg-amber/90"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
        </button>
        
        <div className="flex flex-1 flex-col gap-1">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:hover:scale-125"
            aria-label="Seek"
          />
          <div className="flex items-center justify-between text-[0.65rem] text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          className="grid size-9 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold text-white/70 transition hover:bg-white/10"
            aria-label="Playback speed"
          >
            {speed}x
          </button>
          {showSpeedMenu && (
            <div className="absolute right-0 top-full z-10 mt-2 rounded-lg border border-white/20 bg-black/90 p-1 backdrop-blur">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    handleSpeedChange(s);
                    setShowSpeedMenu(false);
                  }}
                  className={`block w-full rounded px-4 py-2 text-[0.65rem] font-semibold transition hover:bg-white/10 ${
                    speed === s ? 'bg-amber text-white' : 'text-white/70'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
