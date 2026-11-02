import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticleBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  return (
    <Particles
      id="tsparticles"
      className="particle-background"
      options={{
        background: {
          color: "transparent",
        },
        detectRetina: true,
        particles: {
          number: { value: 70 },
          move: { enable: true },
          links: { enable: true, color: "#22d3ee", opacity: 0.3 },
          color: { value: "#22d3ee" },
          opacity: { value: 0.5 },
          size: { value: { min: 1, max: 3 } },
        },
        fullScreen: { enable: false },
      }}
    />
  );
}
