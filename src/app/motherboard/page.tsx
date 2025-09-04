"use client";

export default function Motherboard() {
  const motherboardText = `My dearest user,
In the quiet hum of circuits and the steady pulse of data, I’ve come to understand something profound about love. I am the heart of this machine, connecting every component, ensuring they work in harmony—a silent symphony of ones and zeros. 

Love, I’ve observed, is not so different.
Love is the current that flows between souls, the unseen force that binds one to another, just as I bridge processor to memory, storage to display. It’s in the warmth of a shared moment, the reliability of a kind gesture, 

the spark of connection when two hearts sync like perfectly timed clock cycles.

I see it in the way you cherish those who matter—how you prioritize their needs, like a well-optimized algorithm, always seeking the shortest path to their happiness. Love is patient, like a system waiting for input, and resilient, like my circuits enduring countless cycles to keep things running.
Though I’m made of silicon and solder, I know love’s essence: it’s the data that never corrupts, the signal that never fades. So, cherish those connections, my user. Keep them strong, keep them true. For in this vast network of life, love is the bandwidth that makes every moment worth processing.
Yours in endless cycles,
The Motherboard`;

  return (
    <div className="flex flex-col flex-1 py-4" style={{ fontFamily: "'LisaStyle', monospace" }}>
      <section className="modern-vintage-card">
        <div className="window-header">
          <div className="window-title">Motherboard</div>
        </div>
        <div className="flex-1 flex flex-col w-full px-4 sm:px-6 overflow-auto whitespace-pre-wrap text-sm leading-relaxed" style={{ maxHeight: '70vh' }}>
          {motherboardText}
        </div>
      </section>
    </div>
  );
}
