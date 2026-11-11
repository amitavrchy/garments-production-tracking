import { notFound } from 'next/navigation';
import { modules } from '@/lib/modules';
import { Shell } from '@/components/shell';
import { ResourceWorkspace } from '@/components/resource-workspace';
export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return { title: modules[module]?.title || 'Workspace' };
}
export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!Object.hasOwn(modules, module)) notFound();
  return (
    <Shell>
      <ResourceWorkspace key={module} module={module} />
    </Shell>
  );
}
