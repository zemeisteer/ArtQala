import React, { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-[#726861]">Loading...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
