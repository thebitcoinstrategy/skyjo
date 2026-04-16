import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

interface ConfettiProps {
  active: boolean;
}

const confettiOptions: ISourceOptions = {
  fullScreen: { enable: true, zIndex: 100 },
  particles: {
    number: { value: 0 },
    color: {
      value: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ff9ff3', '#feca57'],
    },
    shape: {
      type: ['circle', 'square'],
    },
    opacity: {
      value: { min: 0.6, max: 1 },
      animation: { enable: true, speed: 0.5, startValue: 'max', destroy: 'min' },
    },
    size: {
      value: { min: 3, max: 8 },
    },
    move: {
      enable: true,
      speed: { min: 15, max: 30 },
      direction: 'top',
      outModes: { default: 'destroy' },
      gravity: { enable: true, acceleration: 15 },
    },
    life: {
      duration: { value: 3 },
      count: 1,
    },
    tilt: {
      enable: true,
      direction: 'random',
      value: { min: 0, max: 360 },
      animation: { enable: true, speed: 30 },
    },
    roll: {
      darken: { enable: true, value: 25 },
      enable: true,
      speed: { min: 5, max: 15 },
    },
    wobble: {
      enable: true,
      distance: 20,
      speed: 10,
    },
  },
  emitters: {
    position: { x: 50, y: 100 },
    rate: { quantity: 15, delay: 0.1 },
    life: { duration: 2, count: 1 },
    size: { width: 100, height: 0 },
  },
};

let engineReady = false;

export default function Confetti({ active }: ConfettiProps) {
  const [init, setInit] = useState(engineReady);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (engineReady) return;
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      engineReady = true;
      setInit(true);
    });
  }, []);

  useEffect(() => {
    if (active) {
      setKey((k) => k + 1);
    }
  }, [active]);

  if (!active || !init) return null;

  return (
    <Particles
      key={key}
      id={`confetti-${key}`}
      options={confettiOptions}
    />
  );
}
