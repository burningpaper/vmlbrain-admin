'use client';

import React from 'react';

export default function FlyingBird() {
    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            <style jsx>{`
        @keyframes flyAcross {
          0% {
            transform: translate(-100px, 100px) scale(0.5);
          }
          25% {
            transform: translate(25vw, 300px) scale(0.6);
          }
          50% {
            transform: translate(50vw, 100px) scale(0.7);
          }
          75% {
            transform: translate(75vw, 250px) scale(0.6);
          }
          100% {
            transform: translate(110vw, 50px) scale(0.5);
          }
        }

        @keyframes wingFlap {
          0%, 100% {
            d: path('M10 20 Q 30 5, 50 20 T 90 20');
          }
          50% {
            d: path('M10 20 Q 30 35, 50 20 T 90 20');
          }
        }

        .bird-container {
          position: absolute;
          top: 0;
          left: 0;
          animation: flyAcross 15s linear infinite;
          will-change: transform;
        }

        .bird-wing {
          animation: wingFlap 0.5s ease-in-out infinite alternate;
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
                    {/* Bird Body */}
                    <path
                        d="M10 20 Q 30 20, 50 20 T 90 20"
                        stroke="#667eea"
                        strokeWidth="2"
                        fill="none"
                        className="bird-wing"
                    />
                    <path
                        d="M45 20 Q 50 15, 55 20 T 65 20"
                        fill="#667eea"
                    />
                </svg>
            </div>
        </div>
    );
}
