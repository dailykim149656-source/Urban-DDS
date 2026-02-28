import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_KR, Space_Grotesk } from 'next/font/google';

import React from 'react';
import Providers from './providers';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-base',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '700'],
  variable: '--font-accent',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-code',
});

export const metadata: Metadata = {
  title: 'Urban-DDS',
  description: 'Urban-DDS AI 기반 도시 분석 대시보드입니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


