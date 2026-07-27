import './globals.css';

export const metadata = {
  title: 'StreamerHub',
  description: 'Центр управления OBS, коллаборациями, календарем и сообществом стримеров.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
