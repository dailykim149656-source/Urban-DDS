import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_KR, Space_Grotesk } from 'next/font/google';

import React from 'react';
import Providers from './providers';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-base',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-accent',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-code',
});

export const metadata: Metadata = {
  title: 'Urban-DDS',
  description: 'Urban-DDS AI 도시정비 의사결정 지원 시스템 운영 콘솔',
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
