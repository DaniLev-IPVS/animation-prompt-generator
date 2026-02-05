import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Sparkles, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { ProjectData, Shot, Character, Background, Item, Frame, Animation } from '@/types';

interface SharedProjectPageProps {
  params: Promise<{ shareId: string }>;
}

export default async function SharedProjectPage({ params }: SharedProjectPageProps) {
  const { shareId } = await params;

  const project = await prisma.project.findUnique({
    where: { shareId },
  });

  if (!project || !project.isPublic) {
    notFound();
  }

  const projectData = project.projectData as unknown as ProjectData | null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-purple-600" />
              <span className="text-lg font-bold text-gray-800">
                Animation Prompt Generator
              </span>
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Your Own
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <p className="text-gray-600 text-sm">
              Shared animation project - view only
            </p>
          </div>

          {projectData ? (
            <div className="space-y-6">
              {/* Summary */}
              {projectData.metadata && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Project Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{projectData.metadata.totalScenes}</p>
                      <p className="text-sm text-gray-600">Scenes</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{projectData.metadata.totalShots}</p>
                      <p className="text-sm text-gray-600">Shots</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{projectData.metadata.estimatedRuntime?.toFixed(1)}s</p>
                      <p className="text-sm text-gray-600">Runtime</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{projectData.stage4?.length || 0}</p>
                      <p className="text-sm text-gray-600">Characters</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Art Style */}
              {projectData.stage3?.style && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Art Style: {projectData.stage3.style}</h2>
                  <p className="text-sm text-gray-600 font-mono bg-gray-50 p-4 rounded-lg">
                    {projectData.stage3.aiGenerationPrompt}
                  </p>
                </div>
              )}

              {/* Characters */}
              {projectData.stage4?.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Characters ({projectData.stage4.length})</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {projectData.stage4.map((char: Character) => (
                      <div key={char.id} className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-purple-700 mb-2">{char.name}</h3>
                        <p className="text-sm text-gray-600 font-mono">{char.visualPrompt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Backgrounds */}
              {projectData.stage5?.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Backgrounds ({projectData.stage5.length})</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {projectData.stage5.map((bg: Background) => (
                      <div key={bg.id} className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-green-700 mb-2">{bg.name}</h3>
                        <p className="text-sm text-gray-600 font-mono">{bg.visualPrompt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shot List */}
              {projectData.stage2?.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Shot List ({projectData.stage2.length} shots)</h2>
                  <div className="space-y-4">
                    {Object.entries(
                      projectData.stage2.reduce((acc: Record<number, Shot[]>, shot: Shot) => {
                        if (!acc[shot.scene]) acc[shot.scene] = [];
                        acc[shot.scene].push(shot);
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([sceneNum, shots]) => (
                        <div key={sceneNum} className="border rounded-lg overflow-hidden">
                          <div className="bg-purple-100 px-4 py-2">
                            <h3 className="font-semibold text-purple-900">Scene {sceneNum}</h3>
                          </div>
                          <div className="divide-y">
                            {(shots as Shot[]).map((shot: Shot) => (
                              <div key={shot.id} className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-mono text-sm text-purple-600">Shot {shot.shotNumber}</span>
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{shot.timing}s</span>
                                  {shot.framing && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{shot.framing}</span>}
                                </div>
                                <p className="text-sm text-gray-700">{shot.description}</p>
                                {shot.vo && <p className="text-sm text-purple-600 mt-2">VO: {shot.vo}</p>}
                                {shot.dialogue && <p className="text-sm text-green-600 mt-1">Dialogue: {shot.dialogue}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <p className="text-gray-500">No project data available</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
