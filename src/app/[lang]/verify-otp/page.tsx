import React, { Suspense } from 'react';
import VerifyOtpClient from './VerifyOtpClient';

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-[#726861]">Loading verification...</div>}>
      <VerifyOtpClient />
    </Suspense>
  );
}
