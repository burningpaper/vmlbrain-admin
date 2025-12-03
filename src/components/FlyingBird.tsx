'use client';

import React from 'react';

export default function FlyingBird() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style jsx>{`
        @keyframes flyAcross {
          0% {
            transform: translate(-10vw, 20vh) scale(0.6) rotate(15deg);
          }
          25% {
            transform: translate(30vw, 40vh) scale(0.7) rotate(5deg);
          }
          50% {
            transform: translate(60vw, 25vh) scale(0.8) rotate(-5deg);
          }
          100% {
            transform: translate(110vw, 10vh) scale(0.6) rotate(-15deg);
          }
        }

        @keyframes wingFlap {
          0% {
            d: path('M10 50 Q 50 20, 90 50 L 50 60 Z'); /* Wings UP */
          }
          50% {
             d: path('M10 50 Q 50 80, 90 50 L 50 60 Z'); /* Wings DOWN */
          }
          100% {
            d: path('M10 50 Q 50 20, 90 50 L 50 60 Z'); /* Wings UP */
          }
        }

        .bird-container {
          position: absolute;
          top: 0;
          left: 0;
          animation: flyAcross 20s linear infinite;
          will-change: transform;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
        }

        .bird-body {
          animation: wingFlap 0.8s ease-in-out infinite;
          fill: #667eea;
        }
      `}</style>
      <div className="bird-container">
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 
            Simple bird silhouette:
            Wings are controlled by the path animation.
            The path draws from left wing tip (10,50) to right wing tip (90,50)
            with a control point in the middle that moves up/down.
            The body is the bottom part (L 50 60 Z).
          */}
          <path
            className="bird-body"
            d="M10 50 Q 50 20, 90 50 L 50 60 Z"
          />
        </svg>
      </div>
    </div>
  );
}
