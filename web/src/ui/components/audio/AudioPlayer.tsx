'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface AudioPlayerProps {
  src: string;
  title?: string;
  author?: string;
  coverUrl?: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

export default function AudioPlayer({
  src,
  title = 'Sách nói AI',
  author = 'HUKI Voice',
  coverUrl,
  onClose,
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // BUG-010: Cleanup audio playback on component unmount / route change
  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && autoPlay) {
      audioEl.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    };
  }, [src, autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-4 shadow-2xl text-white">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-12 h-12 rounded-lg object-cover shadow-md shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-emerald-600/30 flex items-center justify-center shrink-0 text-emerald-400">
            <span className="material-symbols-outlined text-2xl">headphones</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-white truncate">{title}</h4>
          <p className="text-xs text-zinc-400 truncate">{author}</p>
        </div>

        {onClose && (
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeAttribute('src');
                audioRef.current.load();
              }
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
            title="Đóng trình phát"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Progress slider */}
      <div className="mt-3 space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
            title={isMuted ? 'Bật âm' : 'Tắt âm'}
          >
            <span className="material-symbols-outlined text-lg">
              {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
            </span>
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
        >
          <span className="material-symbols-outlined text-2xl font-bold">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
      </div>
    </div>
  );
}

