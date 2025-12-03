'use client';

import React from 'react';

export default function FlyingBird() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style jsx>{`
        @keyframes flyAcross {
          0% {
            transform: translate(-10vw, 40vh) scale(0.5) rotate(15deg);
          }
          20% {
            transform: translate(20vw, 20vh) scale(0.6) rotate(5deg);
          }
          40% {
            transform: translate(45vw, 45vh) scale(0.7) rotate(10deg);
          }
          60% {
            transform: translate(70vw, 15vh) scale(0.6) rotate(-5deg);
          }
          80% {
            transform: translate(90vw, 30vh) scale(0.5) rotate(5deg);
          }
          100% {
            transform: translate(110vw, 10vh) scale(0.4) rotate(-10deg);
          }
        }

        @keyframes wingFlap {
          0%, 100% {
            /* Wings UP - approximate to the reference image */
            d: path('M10,10 C20,0 40,0 50,15 L55,18 L60,15 C55,10 50,5 45,5 C40,5 35,10 30,15 L10,10 Z M30,15 L35,25 L45,20 L50,15'); 
            /* Let's try a cleaner single path for the silhouette */
            d: path('M5,5 C20,-10 45,-5 55,15 L60,18 L50,25 C40,20 35,25 30,35 L20,45 L15,35 L5,5 Z');
            /* Actually, let's trace the reference image shape more closely */
            /* Head at right, tail at bottom left, wings top left and bottom right-ish? No, standard flying pose */
            /* Reference: Left wing high, Right wing low/mid. Swallow tail. */
            d: path('M48,22 C45,20 40,20 35,25 C30,30 25,35 15,40 L5,45 L15,38 C20,35 25,30 30,28 C25,35 20,45 18,55 L25,48 C30,45 35,40 40,35 L55,50 L50,30 C55,28 60,25 62,22 C60,20 55,20 48,22 Z');
          }
          50% {
            /* Wings DOWN - morph the wings downwards */
            d: path('M48,22 C45,20 40,20 35,25 C30,30 25,35 15,40 L5,55 L15,45 C20,40 25,35 30,32 C25,40 20,50 18,60 L25,52 C30,48 35,42 40,38 L55,60 L50,35 C55,32 60,28 62,22 C60,20 55,20 48,22 Z');
          }
        }
        
        /* 
           Refined Path for Swallow:
           Start at beak (right), go to head, top wing, back, tail, bottom wing, belly.
        */
        @keyframes swallowFlap {
            0%, 100% {
                /* Wings Spread / Up */
                d: path('M50,25 Q45,20 40,22 L10,5 L25,25 Q25,35 15,45 L10,55 L20,45 Q30,35 35,35 L55,55 L45,30 Q55,28 60,25 Z');
            }
            50% {
                /* Wings Down / Tucked */
                d: path('M50,25 Q45,20 40,22 L10,15 L25,28 Q25,35 15,45 L10,55 L20,45 Q30,35 35,35 L55,45 L45,30 Q55,28 60,25 Z');
            }
        }

        .bird-container {
          position: absolute;
          top: 0;
          left: 0;
          animation: flyAcross 12s linear infinite;
          will-change: transform;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));
          z-index: 100;
        }

        .bird-shape {
          animation: swallowFlap 0.3s ease-in-out infinite alternate;
          fill: #2d3748;
        }
      `}</style>
      <div className="bird-container">
        <svg
          width="80"
          height="80"
          viewBox="0 0 70 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="bird-shape"
            d="M50,25 Q45,20 40,22 L10,5 L25,25 Q25,35 15,45 L10,55 L20,45 Q30,35 35,35 L55,55 L45,30 Q55,28 60,25 Z"
          />
        </svg>
      </div>
    </div>
  );
}
