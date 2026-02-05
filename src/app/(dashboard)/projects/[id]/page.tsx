'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import AnimationGenerator from '@/components/generator/AnimationGenerator';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    // Verify the project exists
    async function checkProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          setError('Project not found');
        }
      } catch {
        setError('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    }

    checkProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-xl font-semibold text-red-600 mb-4">{error}</h1>
        <button
          onClick={() => router.push('/projects')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
      </div>
    );
  }

  return <AnimationGenerator />;
}
