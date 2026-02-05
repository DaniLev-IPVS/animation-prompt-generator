'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ProjectData,
  ConfigInput,
  BatchProgress,
  ChatMessage,
} from '@/types';

const AUTOSAVE_DELAY = 2000; // 2 seconds

interface UseProjectOptions {
  projectId?: string;
}

interface ExpandedSections {
  stage2?: boolean;
  stage3?: boolean;
  stage4?: boolean;
  stage5?: boolean;
  stage6?: boolean;
  stage7?: boolean;
  stage8?: boolean;
  [key: string]: boolean | undefined;
}

const defaultProjectData: ProjectData = {
  stage1: {},
  stage2: [],
  stage3: { style: '', aiGenerationPrompt: '' },
  stage4: [],
  stage5: [],
  stage6: [],
  stage7: [],
  stage8: [],
};

const defaultConfigInput: ConfigInput = {
  stylePreference: '',
  expectedDuration: '',
  audioType: 'auto',
  hook: 'auto',
  aspectRatio: '16:9',
  narrationPace: 'normal',
  narrationComplexity: 'standard',
  dialogueIntensity: 'medium',
  dialogueComplexity: 'standard',
  contentComplexity: 'standard',
  autoDuration: false,
};

const defaultBatchProgress: BatchProgress = {
  stage7ScenesCompleted: 0,
  stage8ScenesCompleted: 0,
};

const defaultExpandedSections: ExpandedSections = {};

// Helper function to determine current stage from project data
function determineCurrentStage(data: ProjectData): number {
  if (data.stage8?.length > 0) return 7;
  if (data.stage7?.length > 0) return 6;
  if (data.stage6?.length > 0 || data.stage5?.length > 0) return 6;
  if (data.stage5?.length > 0) return 5;
  if (data.stage4?.length > 0) return 4;
  if (data.stage3?.style) return 3;
  if (data.stage2?.length > 0) return 2;
  return 0;
}

export function useProject({ projectId }: UseProjectOptions = {}) {
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(
    projectId
  );
  const [projectName, setProjectName] = useState('');
  const [scriptInput, setScriptInput] = useState('');
  const [configInput, setConfigInput] = useState<ConfigInput>(defaultConfigInput);
  const [projectData, setProjectData] = useState<ProjectData>(defaultProjectData);
  const [batchProgress, setBatchProgress] =
    useState<BatchProgress>(defaultBatchProgress);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [completedPrompts, setCompletedPrompts] = useState<
    Record<string, boolean>
  >({});
  const [currentStage, setCurrentStage] = useState(0);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(defaultExpandedSections);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Load project if ID is provided
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  // Auto-save when data changes
  useEffect(() => {
    // If we have a project ID, auto-save changes
    if (currentProjectId && hasChangesRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveProject();
      }, AUTOSAVE_DELAY);
    }
    // If no project ID but we have generated shots, auto-create a project
    else if (!currentProjectId && projectData.stage2?.length > 0 && hasChangesRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const autoName = `Auto-save ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        await createProjectInternal(autoName);
      }, AUTOSAVE_DELAY);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    scriptInput,
    configInput,
    projectData,
    batchProgress,
    chatMessages,
    completedPrompts,
    currentProjectId,
  ]);

  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load project');
      }

      const project = await response.json();

      const loadedProjectData = project.projectData || defaultProjectData;

      setCurrentProjectId(project.id);
      setProjectName(project.name || '');
      setScriptInput(project.scriptInput || '');
      setConfigInput(project.configInput || defaultConfigInput);
      setProjectData(loadedProjectData);
      setBatchProgress(project.batchProgress || defaultBatchProgress);
      setChatMessages(project.chatMessages || []);
      setCompletedPrompts(project.completedPrompts || {});

      // Restore the current stage based on project data
      const stage = determineCurrentStage(loadedProjectData);
      setCurrentStage(stage);

      // Expand relevant sections based on what data exists
      const sections: ExpandedSections = {};
      if (loadedProjectData.stage2?.length > 0) sections.stage2 = true;
      if (loadedProjectData.stage3?.style) sections.stage3 = true;
      if (loadedProjectData.stage4?.length > 0) sections.stage4 = true;
      if (loadedProjectData.stage5?.length > 0) sections.stage5 = true;
      if (loadedProjectData.stage6?.length > 0) sections.stage6 = true;
      if (loadedProjectData.stage7?.length > 0) sections.stage7 = true;
      if (loadedProjectData.stage8?.length > 0) sections.stage8 = true;
      setExpandedSections(sections);

      hasChangesRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback(async () => {
    if (!currentProjectId) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          scriptInput,
          configInput,
          projectData,
          batchProgress,
          chatMessages,
          completedPrompts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save project');
      }

      setLastSaved(new Date());
      hasChangesRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  }, [
    currentProjectId,
    projectName,
    scriptInput,
    configInput,
    projectData,
    batchProgress,
    chatMessages,
    completedPrompts,
  ]);

  // Internal create function for auto-save (doesn't show saving indicator)
  const createProjectInternal = useCallback(
    async (name: string) => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            scriptInput,
            configInput,
            projectData,
            batchProgress,
            chatMessages,
            completedPrompts,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create project');
        }

        const project = await response.json();
        setCurrentProjectId(project.id);
        setProjectName(project.name);
        setLastSaved(new Date());
        hasChangesRef.current = false;

        return project;
      } catch {
        // Silently fail for auto-save
        return null;
      }
    },
    [
      scriptInput,
      configInput,
      projectData,
      batchProgress,
      chatMessages,
      completedPrompts,
    ]
  );

  const createProject = useCallback(
    async (name: string) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            scriptInput,
            configInput,
            projectData,
            batchProgress,
            chatMessages,
            completedPrompts,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create project');
        }

        const project = await response.json();
        setCurrentProjectId(project.id);
        setProjectName(project.name);
        setLastSaved(new Date());
        hasChangesRef.current = false;

        return project;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [
      scriptInput,
      configInput,
      projectData,
      batchProgress,
      chatMessages,
      completedPrompts,
    ]
  );

  const newProject = useCallback(() => {
    setCurrentProjectId(undefined);
    setProjectName('');
    setScriptInput('');
    setConfigInput(defaultConfigInput);
    setProjectData(defaultProjectData);
    setBatchProgress(defaultBatchProgress);
    setChatMessages([]);
    setCompletedPrompts({});
    setCurrentStage(0);
    setExpandedSections(defaultExpandedSections);
    setLastSaved(null);
    hasChangesRef.current = false;
  }, []);

  const markChanged = useCallback(() => {
    hasChangesRef.current = true;
  }, []);

  // Wrapper functions to mark changes
  const updateScriptInput = useCallback(
    (value: string) => {
      setScriptInput(value);
      markChanged();
    },
    [markChanged]
  );

  const updateConfigInput = useCallback(
    (value: ConfigInput | ((prev: ConfigInput) => ConfigInput)) => {
      setConfigInput(value);
      markChanged();
    },
    [markChanged]
  );

  const updateProjectData = useCallback(
    (value: ProjectData | ((prev: ProjectData) => ProjectData)) => {
      setProjectData(value);
      markChanged();
    },
    [markChanged]
  );

  const updateBatchProgress = useCallback(
    (value: BatchProgress | ((prev: BatchProgress) => BatchProgress)) => {
      setBatchProgress(value);
      markChanged();
    },
    [markChanged]
  );

  const updateChatMessages = useCallback(
    (value: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setChatMessages(value);
      markChanged();
    },
    [markChanged]
  );

  const updateCompletedPrompts = useCallback(
    (
      value:
        | Record<string, boolean>
        | ((prev: Record<string, boolean>) => Record<string, boolean>)
    ) => {
      setCompletedPrompts(value);
      markChanged();
    },
    [markChanged]
  );

  // Wrapper for currentStage
  const updateCurrentStage = useCallback(
    (value: number | ((prev: number) => number)) => {
      setCurrentStage(value);
      markChanged();
    },
    [markChanged]
  );

  // Wrapper for expandedSections
  const updateExpandedSections = useCallback(
    (value: ExpandedSections | ((prev: ExpandedSections) => ExpandedSections)) => {
      setExpandedSections(value);
    },
    []
  );

  return {
    // State
    currentProjectId,
    projectName,
    setProjectName,
    scriptInput,
    setScriptInput: updateScriptInput,
    configInput,
    setConfigInput: updateConfigInput,
    projectData,
    setProjectData: updateProjectData,
    batchProgress,
    setBatchProgress: updateBatchProgress,
    chatMessages,
    setChatMessages: updateChatMessages,
    completedPrompts,
    setCompletedPrompts: updateCompletedPrompts,
    currentStage,
    setCurrentStage: updateCurrentStage,
    expandedSections,
    setExpandedSections: updateExpandedSections,

    // Status
    isSaving,
    lastSaved,
    isLoading,
    error,

    // Actions
    loadProject,
    saveProject,
    createProject,
    newProject,
    markChanged,
  };
}
