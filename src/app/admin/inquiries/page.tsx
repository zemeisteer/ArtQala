import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminInquiriesClient from './AdminInquiriesClient';
import { inquiryItemsInclude, withInquiryTotals } from '@/lib/inquiryItems';

export const dynamic = 'force-dynamic';

export default async function AdminInquiriesPage() {
  const inquiries = await prisma.inquiry.findMany({
    include: {
      painting: {
        select: {
          id: true,
          title_en: true,
          title_ru: true,
          title_uz: true,
          price: true,
          discount_price: true,
          images: true,
          is_sold: true,
        },
      },
      messages: {
        orderBy: { created_at: 'asc' },
      },
      items: inquiryItemsInclude,
    },
    orderBy: { created_at: 'desc' },
  });

  return <AdminInquiriesClient initialInquiries={inquiries.map(withInquiryTotals)} />;
}
