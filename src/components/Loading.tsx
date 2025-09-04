import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <DotLottieReact
          src="https://lottie.host/ae057893-3e0e-4fac-957c-bcc92b7b2c7d/m83xpaXe5w.lottie"
          loop
          autoplay
          style={{ width: '120px', height: '120px' }}
        />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
