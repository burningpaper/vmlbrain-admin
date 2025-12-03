'use client';

import React from 'react';

export default function FlyingBird() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style jsx>{`
        @keyframes flyAcross {
          0% {
            transform: translate(-10vw, 15vh) scale(0.8) rotate(10deg);
          }
          25% {
            transform: translate(30vw, 30vh) scale(0.9) rotate(5deg);
          }
          50% {
            transform: translate(60vw, 20vh) scale(1) rotate(-5deg);
          }
          75% {
            transform: translate(85vw, 35vh) scale(0.9) rotate(5deg);
          }
          100% {
            transform: translate(110vw, 10vh) scale(0.8) rotate(-10deg);
          }
        }

        @keyframes wingFlap {
          0%, 100% {
            d: path('M2,18 C10,-5 30,-5 38,18 L20,28 L2,18 Z'); /* Wings UP */
          }
          50% {
            d: path('M2,18 C10,35 30,35 38,18 L20,28 L2,18 Z'); /* Wings DOWN */
          }
        }

        .bird-container {
          position: absolute;
          top: 0;
          left: 0;
          animation: flyAcross 18s linear infinite;
          will-change: transform;
          filter: drop-shadow(0 4px 4px rgba(0,0,0,0.2));
          z-index: 100;
        }

        .bird-shape {
          animation: wingFlap 0.4s ease-in-out infinite alternate;
          fill: #4a5568; /* Darker grey-blue for visibility */
        }
      `}</style>
      <div className="bird-container">
        <svg
          width="60"
          height="60"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 
            Distinct Bird Silhouette:
            A central body with wings that flap via path morphing.
            The path defines the wings and upper body.
          */}
          <path
            className="bird-shape"
            d="M2,18 C10,-5 30,-5 38,18 L20,28 L2,18 Z"
          />
        </svg>
      </div>
    </div>
  );
}
