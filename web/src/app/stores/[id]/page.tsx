import { redirect } from 'next/navigation';

export default async function StoreRedirectPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  redirect(`/shop/${resolvedParams.id}`);
}
