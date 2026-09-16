'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  ArrowRight,
  TrendingUp,
  Eye,
  Users,
  DollarSign,
  MessageSquare,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  Palette,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface TimelineItem {
  label: string;
  dateKey: string;
  revenue: number;
  visits: number;
  views: number;
}

interface CategoryStat {
  id: string;
  slug: string;
  name_en: string;
  name_ru: string;
  name_uz: string;
  views: number;
  inquiries: number;
}

interface ArtistStat {
  id: string;
  name: string;
  views: number;
  inquiries: number;
  sales: number;
}

interface SummaryData {
  totalRevenue: number;
  totalVisits: number;
  totalViews: number;
  totalInquiries: number;
  totalSales: number;
}

interface ContentCounts {
  paintings: number;
  artists: number;
  categories: number;
}

interface AdminDashboardClientProps {
  initialSummary: SummaryData;
  initialTimeline: TimelineItem[];
  initialCategoryStats: CategoryStat[];
  initialArtistStats: ArtistStat[];
  recentInquiries: any[];
  topViewedPaintings: any[];
  contentCounts: ContentCounts;
}

export default function AdminDashboardClient({
  initialSummary,
  initialTimeline,
  initialCategoryStats,
  initialArtistStats,
  recentInquiries,
  topViewedPaintings,
  contentCounts,
}: AdminDashboardClientProps) {
  const { t, lang, formatPrice } = useApp();
  const [isMounted, setIsMounted] = useState(false);

  // Time-range selector state: 'daily' | 'weekly' | 'monthly'
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch timeline when timeRange changes
  const handleRangeChange = async (range: 'daily' | 'weekly' | 'monthly') => {
    if (range === timeRange) return;
    setTimeRange(range);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/admin/stats?range=${range}`);
      const data = await res.json();
      if (data.success && data.timeline) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error('Failed to update stats timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Localized category names
  const localizedCategoryData = initialCategoryStats.map((c) => ({
    name: lang === 'ru' ? c.name_ru : lang === 'uz' ? c.name_uz : c.name_en,
    views: c.views,
    inquiries: c.inquiries,
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="bg-[#E0F2FE] text-[#0284C7] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.new}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="bg-[#FEF3C7] text-[#D97706] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.inProgress}
          </span>
        );
      case 'ANSWERED':
        return (
          <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.answered}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-[#F3E8FF] text-[#9333EA] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.completed}
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  // Custom chart tooltip styling
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1D100B] text-[#FAF4EC] p-3 rounded shadow-xl border border-[#423129] text-xs space-y-1">
          <p className="font-semibold text-[#DAA932] border-b border-[#35251F] pb-1 mb-1">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {entry.dataKey === 'revenue' ? `$${entry.value.toLocaleString()}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#726861] uppercase">
              {t.admin.totalRevenue}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#DAA932]/10 flex items-center justify-center text-[#DAA932]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#281C18] mt-2">
            {formatPrice(initialSummary.totalRevenue)}
          </div>
          <div className="text-xs text-[#DAA932] font-medium mt-1">
            {initialSummary.totalSales} {t.admin.sold.toLowerCase()}
          </div>
        </div>

        {/* Site Visits */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#726861] uppercase">
              {t.admin.totalVisits}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#429599]/10 flex items-center justify-center text-[#429599]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#281C18] mt-2">
            {initialSummary.totalVisits.toLocaleString()}
          </div>
          <div className="text-xs text-[#429599] font-medium mt-1">
            {t.admin.visits}
          </div>
        </div>

        {/* Artwork Views */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#726861] uppercase">
              {t.admin.totalViews}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#BA4E25]/10 flex items-center justify-center text-[#BA4E25]">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#BA4E25] mt-2">
            {initialSummary.totalViews.toLocaleString()}
          </div>
          <div className="text-xs text-[#8F8178] mt-1">
            {t.admin.views}
          </div>
        </div>

        {/* Inquiries */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#726861] uppercase">
              {t.admin.inquiriesCount}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#726861]/10 flex items-center justify-center text-[#726861]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#281C18] mt-2">
            {initialSummary.totalInquiries}
          </div>
          <div className="text-xs text-[#8F8178] mt-1">
            {t.admin.inquiries}
          </div>
        </div>
      </div>

      {/* 1b. Content Inventory — just the three main catalog counts. */}
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#F0EAE1]">
          <Layers className="w-5 h-5 text-[#BA4E25]" />
          <h2 className="font-serif text-xl font-semibold text-[#281C18]">
            {t.admin.contentInventory}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/admin/paintings', label: t.admin.paintings, icon: Palette, value: contentCounts.paintings },
            { href: '/admin/artists', label: t.admin.artists, icon: Users, value: contentCounts.artists },
            { href: '/admin/categories', label: t.admin.categories, icon: Layers, value: contentCounts.categories },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1.5 p-3.5 rounded-[3px] border border-[#E7E0D8] bg-white hover:border-[#BA4E25]/50 hover:shadow-xs transition-all text-center"
            >
              <item.icon className="w-4 h-4 text-[#BA4E25]" />
              <span className="font-serif text-2xl font-semibold text-[#281C18]">
                {item.value}
              </span>
              <span className="text-[10.5px] font-bold tracking-wide text-[#8F8178] uppercase">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 2. Primary Dynamics Chart: Revenue, Visits, and Views */}
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-4 border-b border-[#F0EAE1] gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#BA4E25]" />
              <h2 className="font-serif text-xl font-semibold text-[#281C18]">
                {t.admin.overviewDynamics}
              </h2>
            </div>
            <p className="text-xs text-[#726861] mt-1">
              {t.admin.dynamicsDesc}
            </p>
          </div>

          {/* Range Switcher Buttons */}
          <div className="inline-flex items-center bg-[#F0EAE1] p-1 rounded-md text-xs font-semibold">
            <button
              onClick={() => handleRangeChange('daily')}
              className={`px-3 py-1.5 rounded transition ${
                timeRange === 'daily'
                  ? 'bg-[#BA4E25] text-white shadow-xs'
                  : 'text-[#554740] hover:text-[#1D100B]'
              }`}
            >
              {t.admin.daily}
            </button>
            <button
              onClick={() => handleRangeChange('weekly')}
              className={`px-3 py-1.5 rounded transition ${
                timeRange === 'weekly'
                  ? 'bg-[#BA4E25] text-white shadow-xs'
                  : 'text-[#554740] hover:text-[#1D100B]'
              }`}
            >
              {t.admin.weekly}
            </button>
            <button
              onClick={() => handleRangeChange('monthly')}
              className={`px-3 py-1.5 rounded transition ${
                timeRange === 'monthly'
                  ? 'bg-[#BA4E25] text-white shadow-xs'
                  : 'text-[#554740] hover:text-[#1D100B]'
              }`}
            >
              {t.admin.monthly}
            </button>
          </div>
        </div>

        {/* Dynamics Chart Area */}
        <div className="w-full h-80 relative">
          {loadingTimeline && (
            <div className="absolute inset-0 bg-[#FDFBF9]/60 backdrop-blur-xs flex items-center justify-center z-10">
              <span className="text-xs font-semibold text-[#BA4E25]">Yuklanmoqda...</span>
            </div>
          )}

          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DAA932" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#DAA932" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#429599" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#429599" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#BA4E25" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#BA4E25" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#8F8178"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E7E0D8' }}
                />
                {/* Left Y Axis for Counts (Visits / Views) */}
                <YAxis
                  yAxisId="counts"
                  stroke="#8F8178"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                {/* Right Y Axis for Revenue ($) */}
                <YAxis
                  yAxisId="revenue"
                  orientation="right"
                  stroke="#DAA932"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTimelineTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  yAxisId="counts"
                  type="monotone"
                  dataKey="visits"
                  name={t.admin.visits}
                  stroke="#429599"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVisits)"
                />
                <Area
                  yAxisId="counts"
                  type="monotone"
                  dataKey="views"
                  name={t.admin.views}
                  stroke="#BA4E25"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  name={`${t.admin.revenue} ($)`}
                  stroke="#DAA932"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#FAF4EC]/30 rounded">
              <span className="text-xs text-[#8F8178]">Grafik yuklanmoqda...</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Side-by-Side Category & Artist Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Interest Chart */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs">
          <div className="pb-4 mb-4 border-b border-[#F0EAE1]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#429599]" />
              <h3 className="font-serif text-lg font-semibold text-[#281C18]">
                {t.admin.categoryInterest}
              </h3>
            </div>
            <p className="text-xs text-[#726861] mt-1">
              {t.admin.categoryInterestDesc}
            </p>
          </div>

          <div className="w-full h-72">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={localizedCategoryData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#8F8178"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#E7E0D8' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#8F8178" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1D100B',
                      borderColor: '#423129',
                      color: '#FAF4EC',
                      fontSize: '11px',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar
                    dataKey="views"
                    name={t.admin.views}
                    fill="#429599"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="inquiries"
                    name={t.admin.inquiries}
                    fill="#BA4E25"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#FAF4EC]/30 rounded">
                <span className="text-xs text-[#8F8178]">Grafik yuklanmoqda...</span>
              </div>
            )}
          </div>
        </div>

        {/* Artist Interest Chart */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs">
          <div className="pb-4 mb-4 border-b border-[#F0EAE1]">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#DAA932]" />
              <h3 className="font-serif text-lg font-semibold text-[#281C18]">
                {t.admin.artistInterest}
              </h3>
            </div>
            <p className="text-xs text-[#726861] mt-1">
              {t.admin.artistInterestDesc}
            </p>
          </div>

          <div className="w-full h-72">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={initialArtistStats}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#8F8178"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#E7E0D8' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#8F8178" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1D100B',
                      borderColor: '#423129',
                      color: '#FAF4EC',
                      fontSize: '11px',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar
                    dataKey="views"
                    name={t.admin.views}
                    fill="#429599"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="inquiries"
                    name={t.admin.inquiries}
                    fill="#BA4E25"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sales"
                    name={t.admin.sales}
                    fill="#DAA932"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#FAF4EC]/30 rounded">
                <span className="text-xs text-[#8F8178]">Grafik yuklanmoqda...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Inquiries and Top Viewed Artwork Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#F0EAE1]">
            <h3 className="font-serif text-lg font-semibold text-[#281C18]">
              {t.admin.inquiries}
            </h3>
            <Link
              href="/admin/inquiries"
              className="text-xs font-semibold text-[#BA4E25] hover:underline flex items-center gap-1"
            >
              <span>{t.admin.all}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E0D8] text-[#8F8178] font-bold tracking-wider uppercase text-[10.5px]">
                  <th className="py-2.5 px-3">MIJOZ</th>
                  <th className="py-2.5 px-3">KARTINA</th>
                  <th className="py-2.5 px-3">SANA</th>
                  <th className="py-2.5 px-3 text-right">HOLAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {recentInquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-[#FAF4EC]/50 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-[#281C18]">
                      {inq.guest_name || 'Guest Customer'}
                    </td>
                    <td className="py-3.5 px-3 text-[#554740]">
                      {lang === 'ru'
                        ? inq.painting?.title_ru || inq.painting?.title_en
                        : lang === 'uz'
                        ? inq.painting?.title_uz || inq.painting?.title_en
                        : inq.painting?.title_en || 'Artwork'}
                    </td>
                    <td className="py-3.5 px-3 text-[#8F8178]">
                      {new Date(inq.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-3 text-right">{getStatusBadge(inq.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Viewed Artworks */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#F0EAE1]">
            <h3 className="font-serif text-lg font-semibold text-[#281C18]">
              {t.admin.totalViews}
            </h3>
            <Link
              href="/admin/paintings"
              className="text-xs font-semibold text-[#BA4E25] hover:underline flex items-center gap-1"
            >
              <span>{t.admin.paintings}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E0D8] text-[#8F8178] font-bold tracking-wider uppercase text-[10.5px]">
                  <th className="py-2.5 px-3">KARTINA</th>
                  <th className="py-2.5 px-3">RASSOM</th>
                  <th className="py-2.5 px-3">KO'RISHLAR</th>
                  <th className="py-2.5 px-3 text-right">SO'ROVLAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {topViewedPaintings.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF4EC]/50 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-[#281C18]">
                      {lang === 'ru'
                        ? p.title_ru || p.title_en
                        : lang === 'uz'
                        ? p.title_uz || p.title_en
                        : p.title_en}
                    </td>
                    <td className="py-3.5 px-3 text-[#554740]">{p.artist.name}</td>
                    <td className="py-3.5 px-3 font-mono font-medium text-[#281C18]">
                      {p.views_count}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#BA4E25]">
                      {p._count.inquiries}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
