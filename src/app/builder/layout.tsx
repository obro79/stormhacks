// Force dynamic rendering for builder page
export const dynamic = 'force-dynamic';

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
