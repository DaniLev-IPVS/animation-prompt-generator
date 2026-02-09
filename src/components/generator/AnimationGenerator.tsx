'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Edit2,
  Save,
  X,
  Download,
  Upload,
  Check,
  Send,
  MessageCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  FolderOpen,
  Trash2,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import { useAnthropicAPI } from '@/hooks/useAnthropicAPI';
import type { Shot, Character, Background, Item, Frame, Animation, ScenePlan } from '@/types';

const SCENES_PER_BATCH = 3;

export default function AnimationGenerator() {
  const {
    currentProjectId,
    projectName,
    setProjectName,
    scriptInput,
    setScriptInput,
    configInput,
    setConfigInput,
    projectData,
    setProjectData,
    batchProgress,
    setBatchProgress,
    chatMessages,
    setChatMessages,
    completedPrompts,
    setCompletedPrompts,
    currentStage,
    setCurrentStage,
    expandedSections,
    setExpandedSections,
    isSaving,
    lastSaved,
    loadProject,
    createProject,
    newProject,
  } = useProject();

  const { callAnthropic } = useAnthropicAPI();
  const [copiedId, setCopiedId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, stage: '' });
  const [generationError, setGenerationError] = useState<{ message: string } | null>(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [saveMessage, setSaveMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [showStoryChat, setShowStoryChat] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingShotField, setEditingShotField] = useState<string | null>(null);
  const [editingShotValue, setEditingShotValue] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Projects list state
  interface ProjectListItem {
    id: string;
    name: string;
    updatedAt: string;
    shotCount: number;
    sceneCount: number;
    runtime: number;
    isPublic: boolean;
    shareId: string | null;
  }
  const [projectsList, setProjectsList] = useState<ProjectListItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch projects list
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjectsList(data);
      }
    } catch {
      // Silently fail
    }
    setIsLoadingProjects(false);
  };

  // Load projects when switching to projects tab
  useEffect(() => {
    if (activeTab === 'projects') {
      fetchProjects();
    }
  }, [activeTab]);

  // Open a project from the list
  const openProject = async (projectId: string) => {
    await loadProject(projectId);
    setActiveTab('editor');
    setSaveMessage('Project loaded');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Start renaming a project
  const startRenaming = (project: ProjectListItem) => {
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
  };

  // Save renamed project
  const saveRename = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue }),
      });
      if (response.ok) {
        // Update local list
        setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, name: renameValue } : p));
        // Update current project name if it's the open one
        if (currentProjectId === projectId) {
          setProjectName(renameValue);
        }
      }
    } catch {
      // Silently fail
    }
    setRenamingProjectId(null);
    setRenameValue('');
  };

  // Delete a project
  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjectsList(prev => prev.filter(p => p.id !== projectId));
        // If we deleted the current project, reset
        if (currentProjectId === projectId) {
          newProject();
        }
      }
    } catch {
      // Silently fail
    }
  };

  const exportProject = async (project: ProjectListItem) => {
    setExportingProjectId(project.id);
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const projectData = await response.json();
        const exportData = {
          name: projectData.name,
          exportedAt: new Date().toISOString(),
          scriptInput: projectData.scriptInput,
          configInput: projectData.configInput,
          projectData: projectData.projectData,
          completedPrompts: projectData.completedPrompts,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silently fail
    } finally {
      setExportingProjectId(null);
    }
  };

  const toggleShare = async (project: ProjectListItem) => {
    setSharingProjectId(project.id);
    try {
      if (project.isPublic) {
        await fetch(`/api/projects/${project.id}/share`, { method: 'DELETE' });
        setProjectsList(prev => prev.map(p => p.id === project.id ? { ...p, isPublic: false, shareId: null } : p));
      } else {
        const response = await fetch(`/api/projects/${project.id}/share`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          setProjectsList(prev => prev.map(p => p.id === project.id ? { ...p, isPublic: true, shareId: data.shareId } : p));
        }
      }
    } catch {
      // Silently fail
    } finally {
      setSharingProjectId(null);
    }
  };

  const copyShareLink = (shareId: string) => {
    const url = `${window.location.origin}/shared/${shareId}`;
    navigator.clipboard.writeText(url);
  };

  // Utility functions
  const cleanAsterisks = (text: string | undefined | null): string => {
    if (!text) return '';
    return String(text).replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s*/g, '').replace(/#/g, '').replace(/--/g, '—').replace(/^Art Style:\s*Art Style:/gi, 'Art Style:').trim();
  };

  const cleanNarration = (text: string | undefined | null): string => {
    if (!text) return '';
    return String(text)
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/#/g, '')
      .replace(/—/g, ', ')
      .replace(/–/g, ', ')
      .replace(/--/g, ', ')
      .replace(/ - /g, ', ')
      .replace(/^-\s*/gm, '')
      .replace(/-$/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const ensureArtStylePrefix = (text: string): string => {
    const cleaned = cleanAsterisks(text);
    if (!cleaned) return '';
    if (cleaned.toLowerCase().startsWith('art style:')) return cleaned;
    return 'Art Style: ' + cleaned;
  };

  const cleanMarkdown = (text: string): string => {
    return text.replace(/#{1,6}\s*/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/^\s*[-*+]\s+/gm, '• ').replace(/^\s*\d+\.\s+/gm, '').trim();
  };

  const copyToClipboard = async (text: string, id = '') => {
    const plain = cleanAsterisks(String(text || '').replace(/<[^>]*>/g, ''));
    try {
      await navigator.clipboard.writeText(plain);
      if (id) { setCopiedId(id); setTimeout(() => setCopiedId(''), 2000); }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = plain;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); if (id) { setCopiedId(id); setTimeout(() => setCopiedId(''), 2000); } } catch { /* ignore */ }
      document.body.removeChild(textArea);
    }
  };

  const copyWithStyle = async (text: string, id: string) => {
    const artStyle = ensureArtStylePrefix(projectData.stage3?.aiGenerationPrompt || '');
    const fullPrompt = cleanAsterisks(text) + '\n\n' + artStyle;
    await copyToClipboard(fullPrompt, id);
  };

  const toggleComplete = (id: string) => setCompletedPrompts(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  const startEditing = (id: string, value: string) => { setEditingPrompt(id); setEditingValue(value || ''); };
  const cancelEditing = () => { setEditingPrompt(null); setEditingValue(''); };

  const startShotEdit = (shotId: string, field: string, value: string | number) => {
    setEditingShotField(`${shotId}-${field}`);
    setEditingShotValue(String(value) || '');
  };
  const cancelShotEdit = () => { setEditingShotField(null); setEditingShotValue(''); };

  const saveShotEdit = (shotId: string, field: string) => {
    setProjectData(prev => ({
      ...prev,
      stage2: prev.stage2.map(s => s.id === shotId ? {
        ...s,
        [field]: field === 'timing' ? parseFloat(editingShotValue) || s.timing : editingShotValue
      } : s)
    }));
    cancelShotEdit();
  };

  const getCleanName = (name: string): string => {
    return cleanAsterisks(name).replace(/\s*\[(PROTAGONIST|ANTAGONIST|SECONDARY|TERTIARY|ANTIHERO)\]\s*/gi, '').trim();
  };

  const getRoleBadge = (name: string) => {
    const roleMatch = name.match(/\[(PROTAGONIST|ANTAGONIST|SECONDARY|TERTIARY|ANTIHERO)\]/i);
    if (!roleMatch) return null;
    const role = roleMatch[1].toUpperCase();
    const colors: Record<string, string> = {
      'PROTAGONIST': 'bg-blue-500 text-white',
      'ANTAGONIST': 'bg-red-500 text-white',
      'SECONDARY': 'bg-green-500 text-white',
      'TERTIARY': 'bg-gray-500 text-white',
      'ANTIHERO': 'bg-purple-500 text-white'
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${colors[role] || 'bg-gray-400 text-white'}`}>{role}</span>;
  };

  const hasStage7ForShot = (scene: number, shotNumber: number) =>
    projectData.stage7?.some(f => f.scene === scene && f.shotNumber === shotNumber);

  const hasStage8ForShot = (scene: number, shotNumber: number) =>
    projectData.stage8?.some(a => a.scene === scene && a.shotNumber === shotNumber);

  // Helper to check if a name matches in text
  const nameMatchesInText = (name: string, text: string): boolean => {
    const cleanName = name.toLowerCase().trim();
    const textLower = text.toLowerCase();

    // Direct match of full name
    if (textLower.includes(cleanName)) return true;

    // Split name into parts (minimum 2 chars)
    const nameParts = cleanName.split(/[\s\-_]+/).filter(p => p.length >= 2);

    // Check if ANY significant part of the name appears in text
    // This handles "Fly One" matching "fly" or "Buzz the Fly" matching "buzz"
    for (const part of nameParts) {
      if (part.length >= 3 && textLower.includes(part)) return true;
    }

    return false;
  };

  // Find shots that reference a character (by name match in description)
  // Returns all matching shots with info about whether Frames/Animation are generated
  const getShotsForCharacter = (characterName: string): { scene: number; shot: number; hasStage7: boolean; hasStage8: boolean }[] => {
    const cleanName = getCleanName(characterName);
    return projectData.stage2
      .filter(s => nameMatchesInText(cleanName, s.description))
      .map(s => ({
        scene: s.scene,
        shot: s.shotNumber,
        hasStage7: projectData.stage7?.some(f => f.scene === s.scene && f.shotNumber === s.shotNumber) || false,
        hasStage8: projectData.stage8?.some(a => a.scene === s.scene && a.shotNumber === s.shotNumber) || false
      }));
  };

  // Find shots that reference a background (by location/scene matching)
  const getShotsForBackground = (bgName: string): { scene: number; shot: number; hasStage7: boolean; hasStage8: boolean }[] => {
    const scenes = projectData.metadata?.scenePlan?.scenes || [];
    // Find scenes with matching location
    const matchingScenes = scenes.filter(s =>
      nameMatchesInText(bgName, s.location) || nameMatchesInText(s.location, bgName)
    ).map(s => s.scene);

    return projectData.stage2
      .filter(s => matchingScenes.includes(s.scene) || nameMatchesInText(bgName, s.description))
      .map(s => ({
        scene: s.scene,
        shot: s.shotNumber,
        hasStage7: projectData.stage7?.some(f => f.scene === s.scene && f.shotNumber === s.shotNumber) || false,
        hasStage8: projectData.stage8?.some(a => a.scene === s.scene && a.shotNumber === s.shotNumber) || false
      }));
  };

  // Find shots that reference an item (by name match in description)
  const getShotsForItem = (itemName: string): { scene: number; shot: number; hasStage7: boolean; hasStage8: boolean }[] => {
    return projectData.stage2
      .filter(s => nameMatchesInText(itemName, s.description))
      .map(s => ({
        scene: s.scene,
        shot: s.shotNumber,
        hasStage7: projectData.stage7?.some(f => f.scene === s.scene && f.shotNumber === s.shotNumber) || false,
        hasStage8: projectData.stage8?.some(a => a.scene === s.scene && a.shotNumber === s.shotNumber) || false
      }));
  };

  // Find characters, backgrounds, and items referenced in a shot
  const getReferencesForShot = (shot: { scene: number; shotNumber: number; description: string }) => {
    const sceneInfo = projectData.metadata?.scenePlan?.scenes?.find(s => s.scene === shot.scene);

    const characters = projectData.stage4.filter(c => {
      const cleanName = getCleanName(c.name);
      return nameMatchesInText(cleanName, shot.description);
    });

    const backgrounds = projectData.stage5.filter(bg => {
      const sceneLocation = sceneInfo?.location || '';
      return nameMatchesInText(bg.name, shot.description) ||
             nameMatchesInText(bg.name, sceneLocation) ||
             nameMatchesInText(sceneLocation, bg.name);
    });

    const items = projectData.stage6.filter(item => {
      return nameMatchesInText(item.name, shot.description);
    });

    return { characters, backgrounds, items };
  };

  // Find characters, backgrounds, and items referenced in a frame (Stage 7)
  // Uses stored IDs if available (new projects), otherwise derives from scene info
  const getReferencesForFrame = (frame: { scene: number; shotNumber: number; firstFrame: string; lastFrame: string; characterIds?: string[]; backgroundIds?: string[]; itemIds?: string[] }) => {
    // If we have stored IDs with actual content, use them
    if (frame.characterIds && frame.characterIds.length > 0) {
      const characters = projectData.stage4.filter(c => frame.characterIds!.includes(c.id));
      const backgrounds = frame.backgroundIds?.length
        ? projectData.stage5.filter(bg => frame.backgroundIds!.includes(bg.id))
        : [];
      const items = frame.itemIds?.length
        ? projectData.stage6.filter(item => frame.itemIds!.includes(item.id))
        : [];
      return { characters, backgrounds, items };
    }

    // Derive references from shot-specific content
    const shot = projectData.stage2.find(s => s.scene === frame.scene && s.shotNumber === frame.shotNumber);
    const sceneInfo = projectData.metadata?.scenePlan?.scenes?.find(s => s.scene === frame.scene);
    const sceneLocation = sceneInfo?.location || '';

    // Combine shot description + frame content for matching
    const shotText = (shot?.description || '') + ' ' + frame.firstFrame + ' ' + frame.lastFrame;

    // CHARACTERS: Only include characters actually mentioned in THIS shot/frame
    const characters = projectData.stage4.filter(c => {
      const cleanName = getCleanName(c.name);
      return nameMatchesInText(cleanName, shotText);
    });

    // BACKGROUND: Find THE background for this scene's location (should be 1, max 2)
    // Match by scene location - each scene has ONE primary location
    const backgrounds = projectData.stage5.filter(bg => {
      const bgNameLower = bg.name.toLowerCase();
      const locationLower = sceneLocation.toLowerCase();

      // Check if background name matches scene location
      if (locationLower && (bgNameLower.includes(locationLower) || locationLower.includes(bgNameLower))) return true;

      // Check significant words overlap
      const bgWords = bgNameLower.split(/[\s\-_,()]+/).filter(w => w.length > 2);
      const locWords = locationLower.split(/[\s\-_,()]+/).filter(w => w.length > 2);
      const matchingWords = bgWords.filter(w => locWords.some(lw => lw.includes(w) || w.includes(lw)));

      return matchingWords.length >= 1;
    }).slice(0, 2); // Max 2 backgrounds per shot

    // ITEMS: Find items mentioned in the shot description or frame content
    const items = projectData.stage6.filter(item => {
      return nameMatchesInText(item.name, shotText);
    });

    return { characters, backgrounds, items };
  };

  const scrollToRef = (elementId: string) => {
    if (elementId.startsWith('char-')) setExpandedSections(prev => ({ ...prev, stage4: true }));
    else if (elementId.startsWith('bg-') || elementId.startsWith('item-')) setExpandedSections(prev => ({ ...prev, stage5: true }));
    else if (elementId.startsWith('frame-')) setExpandedSections(prev => ({ ...prev, stage7: true }));
    else if (elementId.startsWith('anim-')) setExpandedSections(prev => ({ ...prev, stage8: true }));
    else if (elementId.startsWith('shot-')) setExpandedSections(prev => ({ ...prev, stage2: true }));

    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '4px solid #facc15';
        el.style.outlineOffset = '2px';
        setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2500);
      }
    }, 200);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (projectData.stage2?.length > 0) {
      setCurrentStage(2);
      setShowStoryChat(false);
    }
  }, []);

  // Save project handler
  const handleSaveProject = async () => {
    if (!projectData.stage2.length) {
      setSaveMessage('Generate shots first!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    const name = projectName.trim() || `Project ${new Date().toLocaleDateString()}`;
    const project = await createProject(name);
    if (project) {
      setSaveMessage(`Saved "${name}"`);
      setProjectName('');
    }
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Download project
  const downloadProject = () => {
    if (!projectData.stage2?.length) {
      setSaveMessage('Nothing to download');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    const name = projectName.trim() || `Project ${new Date().toLocaleDateString()}`;
    const exportData = {
      name,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      scriptInput,
      configInput,
      projectData,
      batchProgress,
      chatMessages,
      completedPrompts,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaveMessage(`Downloaded "${name}"`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Upload/Import project from file
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // Validate the imported data has expected structure
        if (!importedData.projectData || !importedData.scriptInput === undefined) {
          throw new Error('Invalid project file format');
        }

        // Load the imported data
        if (importedData.scriptInput) setScriptInput(importedData.scriptInput);
        if (importedData.configInput) setConfigInput(importedData.configInput);
        if (importedData.projectData) setProjectData(importedData.projectData);
        if (importedData.batchProgress) setBatchProgress(importedData.batchProgress);
        if (importedData.chatMessages) setChatMessages(importedData.chatMessages);
        if (importedData.completedPrompts) setCompletedPrompts(importedData.completedPrompts);
        if (importedData.name) setProjectName(importedData.name);

        // Determine the current stage from imported data
        const data = importedData.projectData;
        let stage = 0;
        if (data?.stage8?.length > 0) stage = 7;
        else if (data?.stage7?.length > 0) stage = 6;
        else if (data?.stage6?.length > 0 || data?.stage5?.length > 0) stage = 6;
        else if (data?.stage5?.length > 0) stage = 5;
        else if (data?.stage4?.length > 0) stage = 4;
        else if (data?.stage3?.style) stage = 3;
        else if (data?.stage2?.length > 0) stage = 2;

        // Update UI state
        setCurrentStage(stage);
        setShowStoryChat(false);

        // Expand relevant sections
        const sections: Record<string, boolean> = {};
        if (data?.stage2?.length > 0) sections.stage2 = true;
        if (data?.stage3?.style) sections.stage3 = true;
        if (data?.stage4?.length > 0) sections.stage4 = true;
        if (data?.stage5?.length > 0) sections.stage5 = true;
        if (data?.stage6?.length > 0) sections.stage6 = true;
        if (data?.stage7?.length > 0) sections.stage7 = true;
        if (data?.stage8?.length > 0) sections.stage8 = true;
        setExpandedSections(sections);

        setSaveMessage(`Imported "${importedData.name || 'Project'}"`);
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (err) {
        setSaveMessage('Failed to import: Invalid file');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    };
    reader.readAsText(file);

    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatting) return;
    const userMessage = { role: 'user' as const, content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);
    try {
      const data = await callAnthropic({
        max_tokens: 2000,
        system: `You are a creative story development assistant helping users create compelling stories for animated videos. Help users brainstorm and develop their story ideas. Ask clarifying questions about characters, setting, conflict, and resolution. When the user seems satisfied, provide a complete, polished story. Do NOT use markdown formatting like **, ##, or * symbols. Write in plain prose.`,
        messages: [...chatMessages, userMessage].map(m => ({ role: m.role, content: m.content })),
        stage: 'story-chat',
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content?.[0]?.text || 'Sorry, I encountered an error.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your API key in settings.' }]);
    }
    setIsChatting(false);
  };

  const extractFinalStory = async () => {
    if (chatMessages.length === 0) return;
    setIsChatting(true);
    try {
      const conversationContext = chatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
      const data = await callAnthropic({
        max_tokens: 3000,
        system: `Based on the conversation below, write the COMPLETE story ready for animation. Include detailed character descriptions, settings, dialogue, and emotional beats. Do NOT use markdown. Write 400-800+ words.`,
        messages: [{ role: 'user', content: `Story conversation:\n\n${conversationContext}\n\nWrite the complete story.` }],
        stage: 'story-extract',
      });
      setScriptInput(cleanMarkdown(data.content?.[0]?.text || ''));
      setShowStoryChat(false);
      setSaveMessage('Story extracted!');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch {
      setSaveMessage('Failed to extract story.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    setIsChatting(false);
  };

  const useLastAssistantMessage = () => {
    const lastAssistant = [...chatMessages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      setScriptInput(cleanMarkdown(lastAssistant.content));
      setShowStoryChat(false);
      setSaveMessage('Using last response!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Generation functions - Scene Plan
  const generateScenePlan = async (): Promise<ScenePlan> => {
    let targetDuration = parseInt(configInput.expectedDuration) || 60;
    let audioType = configInput.audioType;

    if (configInput.autoDuration || audioType === 'auto') {
      const analysisData = await callAnthropic({
        max_tokens: 500,
        system: `Analyze this story and output ONLY valid JSON: {"recommendedDuration": [number 30-180], "recommendedAudio": "[none/narration/dialogue/both]", "reasoning": "brief"}`,
        messages: [{ role: 'user', content: `Analyze:\n\n${scriptInput}` }],
        stage: 'analysis',
      });
      const analysisText = analysisData.content?.[0]?.text || '';
      const analysisMatch = analysisText.match(/\{[\s\S]*\}/);
      if (analysisMatch) {
        const analysis = JSON.parse(analysisMatch[0]);
        if (configInput.autoDuration) targetDuration = analysis.recommendedDuration || 60;
        if (audioType === 'auto') audioType = analysis.recommendedAudio || 'narration';
        setConfigInput(prev => ({
          ...prev,
          aiRecommendedDuration: analysis.recommendedDuration,
          aiRecommendedAudio: analysis.recommendedAudio,
          aiReasoning: analysis.reasoning,
          resolvedAudioType: audioType,
          resolvedDuration: targetDuration,
        }));
      }
    }

    const data = await callAnthropic({
      max_tokens: 3000,
      system: `Create scene breakdown for EXACTLY ${targetDuration} seconds. Output ONLY valid JSON:
{"scenes": [{"scene": 1, "type": "FAST/MEDIUM/SLOW/MONTAGE", "location": "location", "duration": 8, "summary": "what happens", "audio_mode": "per_shot or scene_level", "story_beat": "SETUP/CONFLICT/CLIMAX/RESOLUTION", "target_shots": 3}], "totalDuration": ${targetDuration}, "audioType": "${audioType}", "totalTargetShots": 12}

SHOT COUNT: Total = duration ÷ 2.5. MONTAGE: 0.5-1.5s/shot. FAST: 1.5-2s. MEDIUM: 2-3s. SLOW: 3-5s.
STORY STRUCTURE: SETUP (15-20%), CONFLICT (25-35%), CLIMAX (25-35%), RESOLUTION (15-25%).`,
      messages: [{ role: 'user', content: `TARGET: ${targetDuration}s, AUDIO: ${audioType}\n\nSTORY:\n${scriptInput}` }],
      stage: 'scene-plan',
      projectId: currentProjectId,
    });

    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]) as ScenePlan;
    parsed.resolvedDuration = targetDuration;
    parsed.resolvedAudioType = audioType;
    if (parsed.scenes) parsed.scenes = parsed.scenes.map((s, i) => ({ ...s, scene: i + 1 }));
    return parsed;
  };

  // Generate shots for scenes
  const generateShotsForScenes = async (scenePlan: ScenePlan, sceneNumbers: number[]): Promise<Shot[]> => {
    const scenesToGen = scenePlan.scenes.filter(s => sceneNumbers.includes(s.scene));
    const scenePrompt = scenesToGen.map(s => {
      const avgShotLength = s.type === 'SLOW' ? 4 : s.type === 'MEDIUM' ? 2.5 : s.type === 'FAST' ? 1.75 : 1;
      const targetShots = s.target_shots || Math.round(s.duration / avgShotLength);
      const timingGuide = s.type === 'SLOW' ? '3-5s per shot' : s.type === 'MEDIUM' ? '2-3s per shot' : s.type === 'FAST' ? '1.5-2s per shot' : '0.5-1.5s per shot';
      return `SCENE ${s.scene} - ${s.type} - ${s.location}\nDuration: ${s.duration}s | Target: ${targetShots} shots (${timingGuide})\nSummary: ${s.summary}`;
    }).join('\n\n');

    const audioType = scenePlan.resolvedAudioType || configInput.audioType;
    let audioInstr = '';
    let audioGuidelines = '';

    if (audioType === 'narration' || audioType === 'both') {
      audioInstr += '\nVO: [emotion] narration text';
      const paceGuide = configInput.narrationPace === 'slow' ? 'Use contemplative, poetic narration with dramatic pauses. Fewer words, more impact.' :
        configInput.narrationPace === 'fast' ? 'Use energetic, quick-paced narration. More words per second, dynamic delivery.' :
        'Use natural reading pace narration. Balanced and conversational.';
      const narrationComplexity = configInput.narrationComplexity || configInput.contentComplexity || 'standard';
      const narrationComplexityGuide = narrationComplexity === 'simple' ? 'Use simple, easy-to-understand language.' :
        narrationComplexity === 'advanced' ? 'Use sophisticated, eloquent vocabulary.' :
        'Use standard language for general audience.';
      audioGuidelines += `\nNARRATION STYLE: ${paceGuide} ${narrationComplexityGuide}`;
    }

    if (audioType === 'dialogue' || audioType === 'both') {
      audioInstr += '\nDIALOGUE: CHARACTER_NAME: [emotion] "spoken words"';
      const amountGuide = configInput.dialogueIntensity === 'minimal'
        ? 'Use sparse dialogue - but include AT LEAST 1-2 lines of essential dialogue in the entire sequence.'
        : configInput.dialogueIntensity === 'heavy'
        ? 'Use lots of dialogue - characters talk frequently in most shots.'
        : 'Use balanced dialogue - natural conversation flow.';
      const dialogueComplexity = configInput.dialogueComplexity || configInput.contentComplexity || 'standard';
      const dialogueComplexityGuide = dialogueComplexity === 'simple' ? 'Use casual, everyday speech patterns.' :
        dialogueComplexity === 'advanced' ? 'Use eloquent, complex dialogue.' :
        'Use natural conversational language.';
      audioGuidelines += `\nDIALOGUE STYLE: ${amountGuide} ${dialogueComplexityGuide} IMPORTANT: When dialogue is requested, you MUST include at least some dialogue lines.`;
    }

    const data = await callAnthropic({
      max_tokens: 4000,
      system: `Generate shots. Format:
SCENE [n]
SHOT [n]
FRAMING: [ECU/CU/MCU/MS/MWS/WS/EWS/OTS/POV/TWO-SHOT]
TIMING: [seconds]
BEAT: [goal]
DESCRIPTION: [action]${audioInstr}

For MONTAGE scenes, add SCENE_VO: [text] after all shots.${audioGuidelines}`,
      messages: [{ role: 'user', content: `Generate shots:\n\n${scenePrompt}` }],
      stage: 'shots',
      projectId: currentProjectId,
    });

    const text = data.content?.[0]?.text || '';
    const shots: Shot[] = [];
    const sceneVOs: Record<number, string> = {};

    const sceneVOMatches = text.matchAll(/SCENE_VO[:\s]+(.+?)(?=SCENE\s+\d|$)/gis);
    for (const match of sceneVOMatches) {
      const beforeText = text.substring(0, match.index);
      const lastSceneMatch = beforeText.match(/SCENE\s+(\d+)/gi);
      if (lastSceneMatch) {
        const sceneNumMatch = lastSceneMatch[lastSceneMatch.length - 1].match(/\d+/);
        if (sceneNumMatch) sceneVOs[parseInt(sceneNumMatch[0])] = match[1].trim();
      }
    }

    const sceneBlocks = text.split(/SCENE\s+(\d+)/i);
    for (let i = 1; i < sceneBlocks.length; i += 2) {
      const sceneNum = parseInt(sceneBlocks[i]);
      const block = sceneBlocks[i + 1] || '';
      const sceneInfo = scenesToGen.find(s => s.scene === sceneNum);
      const isMontage = sceneInfo?.type === 'MONTAGE';
      const shotBlocks = block.split(/SHOT\s+(\d+)/i);

      for (let j = 1; j < shotBlocks.length; j += 2) {
        const shotNum = parseInt(shotBlocks[j]);
        const sb = shotBlocks[j + 1] || '';
        const framingMatch = sb.match(/FRAMING:\s*(.+)/i);
        const timingMatch = sb.match(/TIMING:\s*([\d.]+)/i);
        const beatMatch = sb.match(/BEAT:\s*(.+)/i);
        const descMatch = sb.match(/DESCRIPTION:\s*(.+?)(?=FRAMING:|TIMING:|BEAT:|VO:|DIALOGUE:|SHOT|SCENE|SCENE_VO|$)/is);
        const voMatch = sb.match(/VO:\s*(.+?)(?=FRAMING:|TIMING:|BEAT:|DESCRIPTION:|DIALOGUE:|SHOT|SCENE|SCENE_VO|$)/is);
        const dialogueMatch = sb.match(/DIALOGUE:\s*(.+?)(?=FRAMING:|TIMING:|BEAT:|DESCRIPTION:|VO:|SHOT|SCENE|SCENE_VO|$)/is);

        if (timingMatch) {
          let voText = isMontage ? '' : (voMatch?.[1]?.trim() || '');
          voText = cleanNarration(voText.replace(/^["']|["']$/g, ''));
          let description = descMatch?.[1]?.trim() || '';
          if (!description || description.length < 5) {
            const beat = beatMatch?.[1]?.trim() || '';
            const framing = framingMatch?.[1]?.trim() || 'Medium shot';
            description = beat ? `${framing} showing ${beat.toLowerCase()}.` : `${framing} capturing the action.`;
          }

          const shot: Shot = {
            id: `2.${sceneNum}.${shotNum}`,
            scene: sceneNum,
            shotNumber: shotNum,
            framing: framingMatch?.[1]?.trim() || '',
            timing: parseFloat(timingMatch[1]),
            beat: beatMatch?.[1]?.trim() || '',
            description,
            dialogue: isMontage ? '' : (dialogueMatch?.[1]?.trim() || ''),
            vo: voText,
            isMontage,
          };

          if (shot.vo && !isMontage) {
            const wordCount = shot.vo.split(/\s+/).filter(w => w).length;
            const minDurationForVO = Math.ceil(wordCount / 2.5 * 10) / 10;
            if (shot.timing < minDurationForVO) shot.timing = minDurationForVO;
          }

          if (isMontage) shot.timing = Math.max(0.5, Math.min(1.5, shot.timing));
          else shot.timing = Math.max(1.5, Math.min(6, shot.timing));

          if (isMontage && shotNum === 1 && sceneVOs[sceneNum]) {
            shot.sceneVO = cleanNarration(sceneVOs[sceneNum].replace(/^["']|["']$/g, ''));
          }
          shots.push(shot);
        }
      }
    }
    return shots;
  };

  // Stage 2: Generate Shots
  const generateStage2 = async () => {
    if (!scriptInput.trim()) return;
    setCurrentStage(1);
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress({ current: 0, total: 0, stage: configInput.autoDuration || configInput.audioType === 'auto' ? 'Analyzing story...' : 'Planning scenes...' });

    try {
      const scenePlan = await generateScenePlan();
      if (!scenePlan.scenes?.length) throw new Error('No scenes generated');

      const targetDuration = scenePlan.resolvedDuration || parseInt(configInput.expectedDuration) || 60;
      scenePlan.scenes = scenePlan.scenes.map((s, i) => ({ ...s, scene: i + 1 }));
      setGenerationProgress({ current: 0, total: scenePlan.scenes.length, stage: 'Generating shots...' });

      const allShots: Shot[] = [];
      for (let i = 0; i < scenePlan.scenes.length; i += SCENES_PER_BATCH) {
        const batchScenes = scenePlan.scenes.slice(i, i + SCENES_PER_BATCH).map(s => s.scene);
        setGenerationProgress({ current: i, total: scenePlan.scenes.length, stage: `Generating scenes ${batchScenes.join(', ')}...` });
        const batchShots = await generateShotsForScenes(scenePlan, batchScenes);
        allShots.push(...batchShots);
      }

      // Fix shot numbering
      const fixedShots: Shot[] = [];
      const shotsByScene: Record<number, Shot[]> = {};
      allShots.forEach(shot => {
        if (!shotsByScene[shot.scene]) shotsByScene[shot.scene] = [];
        shotsByScene[shot.scene].push(shot);
      });

      const sceneNumbers = Object.keys(shotsByScene).map(Number).sort((a, b) => a - b);
      sceneNumbers.forEach((oldSceneNum, newSceneIndex) => {
        const newSceneNum = newSceneIndex + 1;
        shotsByScene[oldSceneNum].forEach((shot, shotIndex) => {
          fixedShots.push({ ...shot, scene: newSceneNum, shotNumber: shotIndex + 1, id: `2.${newSceneNum}.${shotIndex + 1}` });
        });
      });

      let totalRuntime = fixedShots.reduce((sum, s) => sum + s.timing, 0);
      const underThreshold = targetDuration * 0.85;
      const overThreshold = targetDuration * 1.30;

      if (totalRuntime < underThreshold || totalRuntime > overThreshold) {
        const ratio = targetDuration / totalRuntime;
        fixedShots.forEach(shot => {
          const newTiming = shot.timing * ratio;
          shot.timing = shot.isMontage
            ? Math.max(0.5, Math.min(1.5, Math.round(newTiming * 10) / 10))
            : Math.max(1.5, Math.min(6, Math.round(newTiming * 10) / 10));
        });
        totalRuntime = fixedShots.reduce((sum, s) => sum + s.timing, 0);
      }

      setProjectData(prev => ({
        ...prev,
        stage1: { script: scriptInput, config: configInput },
        stage2: fixedShots,
        metadata: {
          totalShots: fixedShots.length,
          totalScenes: sceneNumbers.length,
          estimatedRuntime: Math.round(totalRuntime * 10) / 10,
          targetDuration,
          resolvedAudioType: scenePlan.resolvedAudioType || configInput.audioType,
          aspectRatio: configInput.aspectRatio,
          scenePlan,
          aiRecommendations: configInput.autoDuration || configInput.audioType === 'auto'
            ? { duration: configInput.aiRecommendedDuration, audio: configInput.aiRecommendedAudio, reasoning: configInput.aiReasoning }
            : undefined,
        },
      }));

      setExpandedSections({ stage2: true });
      setCurrentStage(2);
    } catch (e) {
      setGenerationError({ message: e instanceof Error ? e.message : 'Generation failed' });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Stage 3: Art Style
  const generateStage3 = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 0, stage: 'Generating art style...' });

    try {
      const styleInput = configInput.stylePreference || 'Modern 2D Animation';
      const data = await callAnthropic({
        max_tokens: 2000,
        system: `Create art style guide. Output:
STYLE: [Name]
PROMPT: Art Style: [400-600 char description with colors, lighting, texturing. End with "Exclude: text, logos, watermarks"]

Do NOT use asterisks, hashtags, or markdown formatting.`,
        messages: [{ role: 'user', content: `Create style guide for: ${styleInput}` }],
        stage: 'style',
        projectId: currentProjectId,
      });

      const out = data.content?.[0]?.text || "";
      const styleMatch = out.match(/STYLE:\s*(.+)/i);
      const promptMatch = out.match(/PROMPT:\s*([\s\S]+?)$/i);

      let styleName = cleanAsterisks(styleMatch?.[1]?.trim() || styleInput);
      let artStylePrompt = cleanAsterisks(promptMatch?.[1]?.trim() || '');
      if (!artStylePrompt) artStylePrompt = `Art Style: ${styleName} with balanced composition. Exclude: text, logos, watermarks`;
      artStylePrompt = ensureArtStylePrefix(artStylePrompt);

      setProjectData(prev => ({ ...prev, stage3: { id: '3.1', style: styleName, aiGenerationPrompt: artStylePrompt } }));
      setExpandedSections(prev => ({ ...prev, stage3: true }));
      setCurrentStage(3);
    } catch (e) {
      setGenerationError({ message: `Art Style failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Stage 4: Characters
  const generateStage4 = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 0, stage: 'Extracting characters...' });

    try {
      const shotContext = projectData.stage2.map(s => `[S${s.scene}.${s.shotNumber}]: ${s.description}`).join('\n');
      const data = await callAnthropic({
        max_tokens: 3000,
        system: `Extract ALL characters (2+ appearances). Include role in brackets.

Format: CHARACTER NAME [ROLE] | Age: [age] | [description]. Exclude: text, logos, watermarks.

CRITICAL NAMING RULES:
- Give each character a UNIQUE, DISTINCTIVE name that can be easily identified in text
- For groups of similar characters (e.g., three flies, two children), give each a unique identifier like "Buzz the Fly", "Scout the Fly", "Zippy the Fly" OR "Fly Alpha", "Fly Beta", "Fly Gamma"
- NEVER use generic numbered names like "Fly 1", "Fly 2" - use memorable distinctive names
- Names should be searchable and unique within the story

Roles: PROTAGONIST, ANTAGONIST, SECONDARY, TERTIARY, ANTIHERO
Include creatures, animated objects, etc. Do NOT use markdown.`,
        messages: [{ role: 'user', content: `Extract recurring characters:\n\n${shotContext}` }],
        stage: 'characters',
        projectId: currentProjectId,
      });

      const out = data.content?.[0]?.text || "";
      const lines = out.split('\n').filter(l => l.includes('|') && l.trim().length > 20);
      const profiles: Character[] = lines.map((line, i) => {
        let name = line.split('|')[0]?.trim().replace(/^\*+|\*+$/g, '').replace(/^[\d\.\-\s]+/, '').trim();
        if (!name || name.length < 2) name = `Character ${i + 1}`;
        return { id: `4.${i + 1}`, name: cleanAsterisks(name), visualPrompt: cleanAsterisks(line).replace(/"/g, '') };
      });

      setProjectData(prev => ({ ...prev, stage4: profiles }));
      setExpandedSections(prev => ({ ...prev, stage4: true }));
      setCurrentStage(4);
    } catch (e) {
      setGenerationError({ message: `Characters failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Stage 5: Backgrounds
  const generateStage5 = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 0, stage: 'Extracting backgrounds...' });

    try {
      const shotContext = projectData.stage2.map(s => `[S${s.scene}.${s.shotNumber}] ${s.framing}: ${s.description}`).join('\n');
      const sceneLocations = projectData.metadata?.scenePlan?.scenes?.map(s => `Scene ${s.scene}: ${s.location}`).join('\n') || '';

      const data = await callAnthropic({
        max_tokens: 3000,
        system: `Extract ALL backgrounds/locations. EMPTY scenes - no people/characters.

Format: LOCATION NAME (Time) | [description]. Exclude: people, characters, figures, text, logos, watermarks.

Same location + different time = separate entries. Do NOT use markdown.`,
        messages: [{ role: 'user', content: `Locations:\n${sceneLocations}\n\nShots:\n${shotContext}` }],
        stage: 'backgrounds',
        projectId: currentProjectId,
      });

      const out = data.content?.[0]?.text || "";
      const lines = out.split('\n').filter(l => l.includes('|') && l.trim().length > 20);
      let backgrounds: Background[] = lines.map((line, i) => {
        let prompt = cleanAsterisks(line);
        if (!prompt.toLowerCase().includes('exclude:')) prompt += ' Exclude: people, characters, figures, text, logos, watermarks.';
        return { id: `5.${i + 1}`, name: cleanAsterisks(line.split('|')[0]?.trim() || `Background ${i + 1}`), visualPrompt: prompt };
      });

      if (backgrounds.length === 0 && projectData.metadata?.scenePlan?.scenes) {
        const uniqueLocations = [...new Set(projectData.metadata.scenePlan.scenes.map(s => s.location).filter(l => l))];
        backgrounds = uniqueLocations.map((location, i) => ({
          id: `5.${i + 1}`,
          name: cleanAsterisks(location),
          visualPrompt: `${cleanAsterisks(location)} | Empty environment. Exclude: people, characters, figures, text, logos, watermarks.`
        }));
      }

      setProjectData(prev => ({ ...prev, stage5: backgrounds }));
      setExpandedSections(prev => ({ ...prev, stage5: true }));
      setCurrentStage(5);
    } catch (e) {
      setGenerationError({ message: `Backgrounds failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Stage 6: Items
  const generateStage6 = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 0, stage: 'Extracting items...' });

    try {
      const shotContext = projectData.stage2.map(s => `[S${s.scene}.${s.shotNumber}] ${s.framing}: ${s.description}`).join('\n');
      const characterNames = projectData.stage4.map(c => getCleanName(c.name)).join(', ');

      const data = await callAnthropic({
        max_tokens: 3000,
        system: `Extract ITEMS (inanimate objects, props). NOT characters.

Format: ITEM NAME | [description on neutral background]. Exclude: text, logos, watermarks.

Characters already extracted: ${characterNames || 'None'}
If no items, output: NO_ITEMS_FOUND`,
        messages: [{ role: 'user', content: `Extract items:\n\n${shotContext}` }],
        stage: 'items',
        projectId: currentProjectId,
      });

      const out = data.content?.[0]?.text || "";
      if (out.includes('NO_ITEMS_FOUND')) {
        setProjectData(prev => ({ ...prev, stage6: [] }));
      } else {
        const lines = out.split('\n').filter(l => l.includes('|') && l.trim().length > 20);
        const items: Item[] = lines.map((line, i) => {
          let prompt = cleanAsterisks(line);
          if (!prompt.toLowerCase().includes('exclude:')) prompt += ' Exclude: text, logos, watermarks.';
          return { id: `6.${i + 1}`, name: cleanAsterisks(line.split('|')[0]?.trim() || `Item ${i + 1}`), visualPrompt: prompt };
        });
        setProjectData(prev => ({ ...prev, stage6: items }));
      }

      setExpandedSections(prev => ({ ...prev, stage6: true }));
      setCurrentStage(6);
    } catch (e) {
      setGenerationError({ message: `Items failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Stage 7: Frames
  const generateStage7 = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 0, stage: 'Generating frames...' });

    try {
      const allScenes = [...new Set(projectData.stage2.map(s => s.scene))].sort((a, b) => a - b);
      const completed = batchProgress.stage7ScenesCompleted;
      const toProcess = allScenes.slice(completed, completed + SCENES_PER_BATCH);

      if (!toProcess.length) {
        setIsGenerating(false);
        return;
      }

      const shots = projectData.stage2.filter(s => toProcess.includes(s.scene));
      const frames: Frame[] = [];

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        setGenerationProgress({ current: i + 1, total: shots.length, stage: `Frame S${shot.scene}.${shot.shotNumber}...` });

        // Find characters, backgrounds, and items relevant to this shot
        // Get all shots in this scene to build full scene context
        const sceneShots = projectData.stage2.filter(s => s.scene === shot.scene);
        const sceneText = sceneShots.map(s => s.description).join(' ');
        const sceneInfo = projectData.metadata?.scenePlan?.scenes?.find(s => s.scene === shot.scene);
        const sceneSummary = sceneInfo?.summary || '';
        const fullSceneContext = `${sceneText} ${sceneSummary}`;

        // Find characters that appear anywhere in this scene (for group references only)
        const sceneChars = projectData.stage4.filter(c => {
          const cleanName = getCleanName(c.name);
          return nameMatchesInText(cleanName, fullSceneContext);
        });

        // STRICT: Only include characters explicitly mentioned BY NAME in this shot
        const shotChars = projectData.stage4.filter(c => {
          const cleanName = getCleanName(c.name);
          return nameMatchesInText(cleanName, shot.description);
        });

        // Only expand to ALL scene characters if shot explicitly says "all three" or similar
        const hasExplicitGroupCount = /\b(all\s+(three|four|five|six|seven|\d+)|the\s+(three|four|five|six|seven|\d+)\s+(of\s+them|characters?|creatures?|flies|birds?))\b/i.test(shot.description);
        const finalChars = shotChars.length > 0 ? shotChars :
          (hasExplicitGroupCount && sceneChars.length > 0 ? sceneChars : []);

        // BACKGROUND: Match scene location to background (1 per scene, max 2)
        const sceneLocation = sceneInfo?.location || '';
        const shotBgs = projectData.stage5.filter(bg => {
          const bgNameLower = bg.name.toLowerCase();
          const locationLower = sceneLocation.toLowerCase();

          // Check if background matches scene location
          if (locationLower && (bgNameLower.includes(locationLower) || locationLower.includes(bgNameLower))) return true;

          // Check significant word overlap
          const bgWords = bgNameLower.split(/[\s\-_,()]+/).filter(w => w.length > 2);
          const locWords = locationLower.split(/[\s\-_,()]+/).filter(w => w.length > 2);
          return bgWords.some(w => locWords.some(lw => lw.includes(w) || w.includes(lw)));
        }).slice(0, 2); // Max 2 backgrounds

        const shotItems = projectData.stage6.filter(item => nameMatchesInText(item.name, shot.description));

        // Build character list for prompt
        const charList = finalChars.length > 0
          ? `\n\nCHARACTERS IN THIS SHOT (always refer to them by exact name):\n${finalChars.map(c => `- ${getCleanName(c.name)}`).join('\n')}`
          : '';
        const bgList = shotBgs.length > 0
          ? `\n\nBACKGROUND: ${shotBgs.map(bg => bg.name).join(', ')}`
          : '';
        const itemList = shotItems.length > 0
          ? `\n\nITEMS IN SHOT: ${shotItems.map(item => item.name).join(', ')}`
          : '';

        const data = await callAnthropic({
          max_tokens: 1500,
          system: `Create FIRST FRAME and LAST FRAME prompts for STILL IMAGES.

CRITICAL: When characters are listed, you MUST refer to each character by their EXACT NAME in the prompts. Never say "three characters" or "the flies" - always use each character's specific name like "Fly One", "Fly Two", "Fly Three".

FIRST FRAME: [400-600 chars - starting composition, poses, lighting. Name each character explicitly.]
LAST FRAME: [200-400 chars - what changed by end. Name each character explicitly.]

No motion verbs. Always provide BOTH.`,
          messages: [{ role: 'user', content: `Framing: ${shot.framing}\nDuration: ${shot.timing}s\nDescription: ${shot.description}${charList}${bgList}${itemList}` }],
          stage: 'frames',
          projectId: currentProjectId,
        });

        const out = data.content?.[0]?.text || "";
        const firstMatch = out.match(/FIRST FRAME:\s*([\s\S]+?)(?=LAST FRAME:|$)/i);
        const lastMatch = out.match(/LAST FRAME:\s*([\s\S]+?)$/i);

        frames.push({
          id: `7.${shot.scene}.${shot.shotNumber}`,
          scene: shot.scene,
          shotNumber: shot.shotNumber,
          duration: shot.timing,
          firstFrame: cleanAsterisks(firstMatch?.[1]?.trim() || `${shot.framing} composition. ${shot.description}`),
          lastFrame: cleanAsterisks(lastMatch?.[1]?.trim() || 'Same composition with subtle progression.'),
          // Store references at generation time for accurate linking
          characterIds: finalChars.map(c => c.id),
          backgroundIds: shotBgs.map(bg => bg.id),
          itemIds: shotItems.map(item => item.id)
        });
      }

      setProjectData(prev => ({ ...prev, stage7: [...(prev.stage7 || []), ...frames] }));
      setBatchProgress(prev => ({ ...prev, stage7ScenesCompleted: completed + toProcess.length }));
      setExpandedSections(prev => ({ ...prev, stage7: true }));
      setCurrentStage(6);
    } catch (e) {
      setGenerationError({ message: `Frames failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Stage 8: Animation
  const generateStage8 = async () => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 0, stage: 'Generating animation prompts...' });

    try {
      const allScenes = [...new Set(projectData.stage2.map(s => s.scene))].sort((a, b) => a - b);
      const completed = batchProgress.stage8ScenesCompleted;
      const toProcess = allScenes.slice(completed, completed + SCENES_PER_BATCH);

      if (!toProcess.length) {
        setIsGenerating(false);
        return;
      }

      const shots = projectData.stage2.filter(s => toProcess.includes(s.scene));
      const anims: Animation[] = [];

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        setGenerationProgress({ current: i + 1, total: shots.length, stage: `Animation ${i + 1}/${shots.length}...` });

        // Find characters relevant to this shot
        const shotChars = projectData.stage4.filter(c => {
          const cleanName = getCleanName(c.name);
          return nameMatchesInText(cleanName, shot.description);
        });

        // Build character list for prompt
        const charList = shotChars.length > 0
          ? `\n\nCHARACTERS IN THIS SHOT (always refer to them by exact name):\n${shotChars.map(c => `- ${getCleanName(c.name)}`).join('\n')}`
          : '';

        const data = await callAnthropic({
          max_tokens: 500,
          system: `Create animation prompt describing motion. One paragraph. CRITICAL: When characters are listed, refer to each character by their EXACT NAME. Never say "the characters" or use generic terms - always use each character's specific name.`,
          messages: [{ role: 'user', content: `Duration: ${shot.timing}s\nDescription: ${shot.description}${charList}` }],
          stage: 'animation',
          projectId: currentProjectId,
        });

        anims.push({
          id: `8.${shot.scene}.${shot.shotNumber}`,
          scene: shot.scene,
          shotNumber: shot.shotNumber,
          duration: shot.timing,
          animationPrompt: cleanAsterisks(data.content?.[0]?.text?.trim() || '')
        });
      }

      setProjectData(prev => ({ ...prev, stage8: [...(prev.stage8 || []), ...anims] }));
      setBatchProgress(prev => ({ ...prev, stage8ScenesCompleted: completed + toProcess.length }));
      setExpandedSections(prev => ({ ...prev, stage8: true }));
      setCurrentStage(7);
    } catch (e) {
      setGenerationError({ message: `Animation failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }

    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, stage: '' });
  };

  // Regeneration functions
  // Regenerate a single shot
  const regenerateShot = async (shot: Shot, instructions = '') => {
    const regenId = `shot-${shot.scene}-${shot.shotNumber}`;
    setRegeneratingId(regenId);
    try {
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const sceneInfo = projectData.metadata?.scenePlan?.scenes?.find(s => s.scene === shot.scene);
      const audioType = projectData.metadata?.resolvedAudioType || configInput.audioType;

      let audioInstr = '';
      if (audioType === 'narration' || audioType === 'both') audioInstr += '\nVO: [emotion] narration text';
      if (audioType === 'dialogue' || audioType === 'both') audioInstr += '\nDIALOGUE: CHARACTER_NAME: [emotion] "spoken words"';

      const data = await callAnthropic({
        max_tokens: 1000,
        system: `Regenerate this shot with fresh ideas. Keep same scene context but create new visuals/action.
Format:
FRAMING: [ECU/CU/MCU/MS/MWS/WS/EWS/OTS/POV/TWO-SHOT]
TIMING: [seconds - similar to original: ${shot.timing}s]
BEAT: [story goal]
DESCRIPTION: [detailed visual action]${audioInstr}

No markdown formatting.`,
        messages: [{ role: 'user', content: `Scene ${shot.scene}, Shot ${shot.shotNumber}
Scene type: ${sceneInfo?.type || 'MEDIUM'}
Scene summary: ${sceneInfo?.summary || 'Part of the story'}
Current shot: ${shot.description}${instructionText}

Create a NEW version of this shot.` }],
        stage: 'shot-regen',
      });

      const out = data.content?.[0]?.text || '';
      const framingMatch = out.match(/FRAMING:\s*(.+)/i);
      const timingMatch = out.match(/TIMING:\s*([\d.]+)/i);
      const beatMatch = out.match(/BEAT:\s*(.+)/i);
      const descMatch = out.match(/DESCRIPTION:\s*(.+?)(?=FRAMING:|TIMING:|BEAT:|VO:|DIALOGUE:|$)/is);
      const voMatch = out.match(/VO:\s*(.+?)(?=FRAMING:|TIMING:|BEAT:|DESCRIPTION:|DIALOGUE:|$)/is);
      const dialogueMatch = out.match(/DIALOGUE:\s*(.+?)(?=FRAMING:|TIMING:|BEAT:|DESCRIPTION:|VO:|$)/is);

      setProjectData(prev => ({
        ...prev,
        stage2: prev.stage2.map(s => s.id === shot.id ? {
          ...s,
          framing: cleanAsterisks(framingMatch?.[1]?.trim() || s.framing),
          timing: parseFloat(timingMatch?.[1] || String(s.timing)) || s.timing,
          beat: cleanAsterisks(beatMatch?.[1]?.trim() || s.beat),
          description: cleanAsterisks(descMatch?.[1]?.trim() || s.description),
          vo: cleanNarration(voMatch?.[1]?.trim()?.replace(/^["']|["']$/g, '') || s.vo),
          dialogue: cleanAsterisks(dialogueMatch?.[1]?.trim() || s.dialogue),
        } : s)
      }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  const regenerateStyle = async (instructions = '') => {
    setRegeneratingId('style');
    try {
      const styleInput = configInput.stylePreference || 'Modern 2D Animation';
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const data = await callAnthropic({
        max_tokens: 2000,
        system: `Create art style guide. Output:\nSTYLE: [Name]\nPROMPT: Art Style: [400-600 char]. End with "Exclude: text, logos, watermarks"\n\nNo markdown.`,
        messages: [{ role: 'user', content: `Create a NEW style guide for: ${styleInput}${instructionText}` }],
        stage: 'style-regen',
      });
      const out = data.content?.[0]?.text || "";
      const styleMatch = out.match(/STYLE:\s*(.+)/i);
      const promptMatch = out.match(/PROMPT:\s*([\s\S]+?)$/i);
      setProjectData(prev => ({
        ...prev,
        stage3: {
          ...prev.stage3,
          style: cleanAsterisks(styleMatch?.[1]?.trim() || styleInput),
          aiGenerationPrompt: ensureArtStylePrefix(cleanAsterisks(promptMatch?.[1]?.trim() || ''))
        }
      }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  const regenerateCharacter = async (char: Character, instructions = '') => {
    setRegeneratingId(char.id);
    try {
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const roleMatch = char.name.match(/\[(PROTAGONIST|ANTAGONIST|SECONDARY|TERTIARY|ANTIHERO)\]/i);
      const role = roleMatch ? roleMatch[1].toUpperCase() : '';
      const cleanName = getCleanName(char.name);

      const data = await callAnthropic({
        max_tokens: 500,
        system: `Create character visual prompt. One line:\nCHARACTER NAME ${role ? `[${role}]` : ''} | Age: [age] | [description]. Exclude: text, logos, watermarks.\n\nNo markdown.`,
        messages: [{ role: 'user', content: `Create NEW visual for: ${cleanName}${role ? ` (${role})` : ''}${instructionText}` }],
        stage: 'character-regen',
      });
      setProjectData(prev => ({
        ...prev,
        stage4: prev.stage4.map(c => c.id === char.id ? { ...c, visualPrompt: cleanAsterisks(data.content?.[0]?.text || "").replace(/"/g, '') } : c)
      }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  const regenerateBackground = async (bg: Background, instructions = '') => {
    setRegeneratingId(bg.id);
    try {
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const data = await callAnthropic({
        max_tokens: 500,
        system: `Create background visual prompt. One line:\nLOCATION NAME | [EMPTY scene description]. Exclude: people, characters, figures, text, logos, watermarks.\n\nNo markdown.`,
        messages: [{ role: 'user', content: `Create NEW visual for location: ${bg.name}${instructionText}` }],
        stage: 'background-regen',
      });
      let out = cleanAsterisks(data.content?.[0]?.text || "");
      if (!out.toLowerCase().includes('no people')) out += ' Exclude: people, characters, figures.';
      setProjectData(prev => ({ ...prev, stage5: prev.stage5.map(b => b.id === bg.id ? { ...b, visualPrompt: out } : b) }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  const regenerateItem = async (item: Item, instructions = '') => {
    setRegeneratingId(item.id);
    try {
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const data = await callAnthropic({
        max_tokens: 500,
        system: `Create item visual prompt. One line:\nITEM NAME | [description, neutral background]. Exclude: text, logos, watermarks.\n\nNo markdown.`,
        messages: [{ role: 'user', content: `Create NEW visual for item: ${item.name}${instructionText}` }],
        stage: 'item-regen',
      });
      setProjectData(prev => ({ ...prev, stage6: prev.stage6.map(i => i.id === item.id ? { ...i, visualPrompt: cleanAsterisks(data.content?.[0]?.text || "") } : i) }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  const regenerateFrame = async (frame: Frame, field: 'firstFrame' | 'lastFrame', instructions = '') => {
    const frameId = `${frame.id}-${field}`;
    setRegeneratingId(frameId);
    try {
      const shot = projectData.stage2.find(s => s.scene === frame.scene && s.shotNumber === frame.shotNumber);
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const data = await callAnthropic({
        max_tokens: 800,
        system: field === 'firstFrame'
          ? `Create FIRST FRAME prompt (400-600 chars) - static pose, composition, lighting. No motion verbs.`
          : `Create LAST FRAME prompt (200-400 chars) - what changed from start. No motion verbs.`,
        messages: [{ role: 'user', content: `Shot: ${shot?.framing}\nDuration: ${frame.duration}s\nDescription: ${shot?.description}${instructionText}` }],
        stage: 'frame-regen',
      });
      setProjectData(prev => ({ ...prev, stage7: prev.stage7.map(f => f.id === frame.id ? { ...f, [field]: cleanAsterisks(data.content?.[0]?.text || "") } : f) }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  const regenerateAnimation = async (anim: Animation, instructions = '') => {
    setRegeneratingId(anim.id);
    try {
      const shot = projectData.stage2.find(s => s.scene === anim.scene && s.shotNumber === anim.shotNumber);
      const instructionText = instructions ? `\n\nUser instructions: ${instructions}` : '';
      const data = await callAnthropic({
        max_tokens: 500,
        system: `Create animation prompt describing motion. One paragraph.`,
        messages: [{ role: 'user', content: `Duration: ${anim.duration}s\nDescription: ${shot?.description}${instructionText}` }],
        stage: 'animation-regen',
      });
      setProjectData(prev => ({ ...prev, stage8: prev.stage8.map(a => a.id === anim.id ? { ...a, animationPrompt: cleanAsterisks(data.content?.[0]?.text || "") } : a) }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate all characters (Stage 4)
  const regenerateAllCharacters = async () => {
    if (!confirm('Regenerate all characters? This will replace all existing character prompts.')) return;
    setRegeneratingId('stage4-all');
    try {
      await generateStage4();
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate all backgrounds (Stage 5)
  const regenerateAllBackgrounds = async () => {
    if (!confirm('Regenerate all backgrounds? This will replace all existing background prompts.')) return;
    setRegeneratingId('stage5-all');
    try {
      await generateStage5();
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate all items (Stage 6)
  const regenerateAllItems = async () => {
    if (!confirm('Regenerate all items? This will replace all existing item prompts.')) return;
    setRegeneratingId('stage6-all');
    try {
      setProjectData(prev => ({ ...prev, stage6: [] }));
      await generateStage6();
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate frames for a specific scene
  const regenerateSceneFrames = async (sceneNum: number) => {
    if (!confirm(`Regenerate all frames for Scene ${sceneNum}?`)) return;
    setRegeneratingId(`scene-${sceneNum}-frames`);
    try {
      const sceneShots = projectData.stage2.filter(s => s.scene === sceneNum);
      const newFrames: Frame[] = [];

      for (const shot of sceneShots) {
        // Find characters for this specific shot only
        const sceneInfo = projectData.metadata?.scenePlan?.scenes?.find(s => s.scene === shot.scene);

        // Only include characters explicitly mentioned in this shot's description
        const shotChars = projectData.stage4.filter(c => {
          const cleanName = getCleanName(c.name);
          return nameMatchesInText(cleanName, shot.description);
        });

        // Only expand to scene characters if shot explicitly says "all three" or similar
        const sceneText = projectData.stage2.filter(s => s.scene === shot.scene).map(s => s.description).join(' ') + ' ' + (sceneInfo?.summary || '');
        const sceneChars = projectData.stage4.filter(c => nameMatchesInText(getCleanName(c.name), sceneText));
        const hasExplicitGroupCount = /\b(all\s+(three|four|five|six|seven|\d+)|the\s+(three|four|five|six|seven|\d+)\s+(of\s+them|characters?|creatures?|flies|birds?))\b/i.test(shot.description);
        const usedChars = shotChars.length > 0 ? shotChars : (hasExplicitGroupCount ? sceneChars : []);

        // BACKGROUND: Match scene location (max 2)
        const sceneLocation = sceneInfo?.location || '';
        const shotBgs = projectData.stage5.filter(bg => {
          const bgNameLower = bg.name.toLowerCase();
          const locationLower = sceneLocation.toLowerCase();
          if (locationLower && (bgNameLower.includes(locationLower) || locationLower.includes(bgNameLower))) return true;
          const bgWords = bgNameLower.split(/[\s\-_,()]+/).filter(w => w.length > 2);
          const locWords = locationLower.split(/[\s\-_,()]+/).filter(w => w.length > 2);
          return bgWords.some(w => locWords.some(lw => lw.includes(w) || w.includes(lw)));
        }).slice(0, 2);

        const shotItems = projectData.stage6.filter(item => nameMatchesInText(item.name, shot.description));

        const charList = usedChars.length > 0 ? `\n\nCHARACTERS IN THIS SHOT:\n${usedChars.map(c => `- ${getCleanName(c.name)}`).join('\n')}` : '';
        const bgList = shotBgs.length > 0 ? `\n\nBACKGROUND: ${shotBgs.map(bg => bg.name).join(', ')}` : '';
        const itemList = shotItems.length > 0 ? `\n\nITEMS: ${shotItems.map(item => item.name).join(', ')}` : '';

        const data = await callAnthropic({
          max_tokens: 1500,
          system: `Create FIRST FRAME and LAST FRAME prompts. CRITICAL: Name each character explicitly.\n\nFIRST FRAME: [400-600 chars]\nLAST FRAME: [200-400 chars]\n\nNo motion verbs.`,
          messages: [{ role: 'user', content: `Framing: ${shot.framing}\nDuration: ${shot.timing}s\nDescription: ${shot.description}${charList}${bgList}${itemList}` }],
          stage: 'frames-regen',
        });

        const out = data.content?.[0]?.text || "";
        const firstMatch = out.match(/FIRST FRAME:\s*([\s\S]+?)(?=LAST FRAME:|$)/i);
        const lastMatch = out.match(/LAST FRAME:\s*([\s\S]+?)$/i);

        newFrames.push({
          id: `7.${shot.scene}.${shot.shotNumber}`,
          scene: shot.scene,
          shotNumber: shot.shotNumber,
          duration: shot.timing,
          firstFrame: cleanAsterisks(firstMatch?.[1]?.trim() || `${shot.framing} composition. ${shot.description}`),
          lastFrame: cleanAsterisks(lastMatch?.[1]?.trim() || 'Same composition with subtle progression.'),
          characterIds: usedChars.map(c => c.id),
          backgroundIds: shotBgs.map(bg => bg.id),
          itemIds: shotItems.map(item => item.id)
        });
      }

      // Replace only this scene's frames
      setProjectData(prev => ({
        ...prev,
        stage7: [...prev.stage7.filter(f => f.scene !== sceneNum), ...newFrames].sort((a, b) => a.scene - b.scene || a.shotNumber - b.shotNumber)
      }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate all frames (Stage 7)
  const regenerateAllFrames = async () => {
    if (!confirm('Regenerate all frames? This will replace all existing frame prompts.')) return;
    setRegeneratingId('stage7-all');
    try {
      setProjectData(prev => ({ ...prev, stage7: [] }));
      setBatchProgress(prev => ({ ...prev, stage7ScenesCompleted: 0 }));
      await generateStage7();
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate animations for a specific scene
  const regenerateSceneAnimations = async (sceneNum: number) => {
    if (!confirm(`Regenerate all animations for Scene ${sceneNum}?`)) return;
    setRegeneratingId(`scene-${sceneNum}-anims`);
    try {
      const sceneShots = projectData.stage2.filter(s => s.scene === sceneNum);
      const newAnims: Animation[] = [];

      for (const shot of sceneShots) {
        const shotChars = projectData.stage4.filter(c => nameMatchesInText(getCleanName(c.name), shot.description));
        const charList = shotChars.length > 0 ? `\n\nCHARACTERS:\n${shotChars.map(c => `- ${getCleanName(c.name)}`).join('\n')}` : '';

        const data = await callAnthropic({
          max_tokens: 500,
          system: `Create animation prompt describing motion. One paragraph. Name each character explicitly.`,
          messages: [{ role: 'user', content: `Duration: ${shot.timing}s\nDescription: ${shot.description}${charList}` }],
          stage: 'animation-regen',
        });

        newAnims.push({
          id: `8.${shot.scene}.${shot.shotNumber}`,
          scene: shot.scene,
          shotNumber: shot.shotNumber,
          duration: shot.timing,
          animationPrompt: cleanAsterisks(data.content?.[0]?.text?.trim() || '')
        });
      }

      setProjectData(prev => ({
        ...prev,
        stage8: [...prev.stage8.filter(a => a.scene !== sceneNum), ...newAnims].sort((a, b) => a.scene - b.scene || a.shotNumber - b.shotNumber)
      }));
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Regenerate all animations (Stage 8)
  const regenerateAllAnimations = async () => {
    if (!confirm('Regenerate all animations? This will replace all existing animation prompts.')) return;
    setRegeneratingId('stage8-all');
    try {
      setProjectData(prev => ({ ...prev, stage8: [] }));
      setBatchProgress(prev => ({ ...prev, stage8ScenesCompleted: 0 }));
      await generateStage8();
    } catch { /* ignore */ }
    setRegeneratingId(null);
  };

  // Save edit function
  const saveEdit = (type: string, id: string, field?: string) => {
    if (type === 'style') {
      setProjectData(prev => ({ ...prev, stage3: { ...prev.stage3, aiGenerationPrompt: editingValue } }));
    } else if (type === 'character') {
      setProjectData(prev => ({ ...prev, stage4: prev.stage4.map(c => c.id === id ? { ...c, visualPrompt: editingValue } : c) }));
    } else if (type === 'background') {
      setProjectData(prev => ({ ...prev, stage5: prev.stage5.map(b => b.id === id ? { ...b, visualPrompt: editingValue } : b) }));
    } else if (type === 'item') {
      setProjectData(prev => ({ ...prev, stage6: prev.stage6.map(i => i.id === id ? { ...i, visualPrompt: editingValue } : i) }));
    } else if (type === 'frame' && field) {
      setProjectData(prev => ({ ...prev, stage7: prev.stage7.map(f => f.id === id ? { ...f, [field]: editingValue } : f) }));
    } else if (type === 'animation') {
      setProjectData(prev => ({ ...prev, stage8: prev.stage8.map(a => a.id === id ? { ...a, animationPrompt: editingValue } : a) }));
    }
    cancelEditing();
  };

  // RegenButton component with local state to prevent cursor issues
  const RegenButton = ({ id, label, onRegenerate }: { id: string; label?: string; onRegenerate: (instructions: string) => void }) => {
    const [localInput, setLocalInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const isRegenerating = regeneratingId === id;

    const handleRegenerate = (useInput: boolean) => {
      onRegenerate(useInput ? localInput : '');
      setLocalInput('');
      setIsOpen(false);
    };

    const handleCancel = () => {
      setLocalInput('');
      setIsOpen(false);
    };

    if (isOpen) {
      return (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1 font-medium">What would you like to change?</p>
          <textarea
            value={localInput}
            onChange={e => setLocalInput(e.target.value)}
            placeholder="e.g., Make the character older..."
            className="w-full p-2 text-sm bg-theme-input border border-theme-primary rounded min-h-[50px] mb-2 text-theme-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => handleRegenerate(true)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />Regenerate
            </button>
            <button onClick={() => handleRegenerate(false)} className="px-3 py-1 bg-theme-tertiary text-theme-secondary text-xs rounded">Random</button>
            <button onClick={handleCancel} className="px-3 py-1 bg-theme-tertiary text-theme-muted text-xs rounded">Cancel</button>
          </div>
        </div>
      );
    }

    return (
      <button onClick={() => setIsOpen(true)} disabled={isRegenerating} className="px-2 py-1 text-xs rounded bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 disabled:opacity-50">
        {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        {isRegenerating ? 'Regenerating...' : (label || 'Regen')}
      </button>
    );
  };

  // PromptEditor component
  const PromptEditor = ({ id, value, type, field, onRegenerate, regenId }: { id: string; value: string; type: string; field?: string; onRegenerate: (instructions: string) => void; regenId?: string }) => {
    const isEditing = editingPrompt === id;
    if (isEditing) {
      return (
        <div className="mt-2">
          <textarea dir="ltr" value={editingValue} onChange={e => setEditingValue(e.target.value)} className="w-full p-2 bg-theme-input border border-theme-primary rounded text-sm font-mono min-h-[100px] text-theme-primary" autoFocus />
          <div className="flex gap-2 mt-2">
            <button onClick={() => saveEdit(type, id, field)} className="px-3 py-1 bg-green-600 text-white text-xs rounded flex items-center gap-1"><Check className="w-3 h-3" />Save</button>
            <button onClick={cancelEditing} className="px-3 py-1 bg-theme-tertiary text-theme-secondary text-xs rounded flex items-center gap-1"><X className="w-3 h-3" />Cancel</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-1 mt-1 flex-wrap">
        <button onClick={() => startEditing(id, value)} className="px-2 py-1 text-xs rounded bg-theme-tertiary hover:bg-theme-tertiary text-theme-secondary flex items-center gap-1"><Edit2 className="w-3 h-3" />Edit</button>
        <RegenButton id={regenId || id} label="Regen" onRegenerate={onRegenerate} />
      </div>
    );
  };

  const stages = [
    { t: 'Concept' }, { t: 'Shots' }, { t: 'Style' }, { t: 'Characters' },
    { t: 'Backgrounds' }, { t: 'Items' }, { t: 'Frames' }, { t: 'Animation' }
  ];

  const totalRuntime = projectData.stage2?.reduce((sum, s) => sum + s.timing, 0) || 0;
  const totalScenes = projectData.metadata?.totalScenes || Object.keys(projectData.stage2.reduce((a: Record<number, boolean>, s) => { a[s.scene] = true; return a; }, {})).length;

  return (
    <div className="p-3">
      <div className="max-w-5xl mx-auto">
        <div className="bg-theme-secondary rounded-xl shadow-lg border border-theme-primary p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">Animation Prompt Generator</h1>
              <p className="text-sm">
                {isSaving && <span className="text-blue-600">Saving...</span>}
                {lastSaved && !isSaving && <span className="text-green-600">Saved {lastSaved.toLocaleTimeString()}</span>}
                {!isSaving && !lastSaved && <span className="text-theme-muted">by IP Ventures</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveMessage && <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-700">{saveMessage}</span>}
              <input
                type="file"
                id="header-file-input"
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button onClick={() => document.getElementById('header-file-input')?.click()} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1">
                <Upload className="w-4 h-4" />Import
              </button>
              <button onClick={newProject} className="px-3 py-1.5 text-sm bg-theme-tertiary rounded-lg hover:bg-theme-tertiary flex items-center gap-1">
                <Plus className="w-4 h-4" />New
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 mb-5 border-b border-theme-primary">
            <button onClick={() => setActiveTab('editor')} className={`px-4 py-2 font-semibold border-b-2 -mb-px ${activeTab === 'editor' ? 'border-purple-600 text-purple-600' : 'border-transparent text-theme-muted'}`}>
              Current Project
            </button>
            <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 font-semibold border-b-2 -mb-px flex items-center gap-2 ${activeTab === 'projects' ? 'border-purple-600 text-purple-600' : 'border-transparent text-theme-muted'}`}>
              <FolderOpen className="w-4 h-4" />
              Saved Projects
            </button>
          </div>

          {/* Projects List Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Saved Projects</h2>
                <button onClick={fetchProjects} className="px-3 py-1.5 text-sm bg-theme-tertiary rounded-lg hover:bg-theme-tertiary flex items-center gap-1">
                  <RefreshCw className={`w-4 h-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : projectsList.length === 0 ? (
                <div className="text-center py-8 bg-theme-tertiary rounded-lg">
                  <FolderOpen className="w-12 h-12 text-theme-muted mx-auto mb-3" />
                  <p className="text-theme-muted">No saved projects yet.</p>
                  <p className="text-sm text-theme-muted mt-1">Create a new project or import one to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectsList.map(project => (
                    <div
                      key={project.id}
                      className={`p-4 rounded-lg border transition-all ${
                        currentProjectId === project.id
                          ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
                          : 'bg-theme-secondary border-theme-primary hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {renamingProjectId === project.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                className="flex-1 px-2 py-1 bg-theme-input border border-theme-primary rounded text-sm text-theme-primary"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveRename(project.id);
                                  if (e.key === 'Escape') setRenamingProjectId(null);
                                }}
                              />
                              <button onClick={() => saveRename(project.id)} className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={() => setRenamingProjectId(null)} className="px-2 py-1 bg-theme-tertiary text-theme-secondary text-xs rounded">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-theme-primary truncate">{project.name}</h3>
                                {currentProjectId === project.id && (
                                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Open</span>
                                )}
                              </div>
                              <div className="text-sm text-theme-muted mt-1">
                                {project.shotCount} shots • {project.sceneCount} scenes • {project.runtime?.toFixed(1) || 0}s
                                <span className="mx-2">•</span>
                                Updated {new Date(project.updatedAt).toLocaleDateString()} {new Date(project.updatedAt).toLocaleTimeString()}
                              </div>
                            </>
                          )}
                        </div>

                        {renamingProjectId !== project.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openProject(project.id)}
                              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                                currentProjectId === project.id
                                  ? 'bg-theme-tertiary text-theme-muted cursor-default'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                              disabled={currentProjectId === project.id}
                            >
                              <FolderOpen className="w-4 h-4" />
                              {currentProjectId === project.id ? 'Current' : 'Open'}
                            </button>
                            <button
                              onClick={() => exportProject(project)}
                              disabled={exportingProjectId === project.id}
                              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                              title="Export as JSON"
                            >
                              {exportingProjectId === project.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              Export
                            </button>
                            {project.isPublic && project.shareId && (
                              <button
                                onClick={() => copyShareLink(project.shareId!)}
                                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                                title="Copy share link"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Copy Link
                              </button>
                            )}
                            <button
                              onClick={() => toggleShare(project)}
                              disabled={sharingProjectId === project.id}
                              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                                project.isPublic
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                  : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary'
                              }`}
                              title={project.isPublic ? 'Stop sharing' : 'Share project'}
                            >
                              {sharingProjectId === project.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                              {project.isPublic ? 'Shared' : 'Share'}
                            </button>
                            <button
                              onClick={() => startRenaming(project)}
                              className="px-3 py-1.5 text-sm bg-theme-tertiary text-theme-secondary rounded-lg hover:bg-theme-tertiary flex items-center gap-1"
                            >
                              <Edit2 className="w-4 h-4" />
                              Rename
                            </button>
                            <button
                              onClick={() => deleteProject(project.id)}
                              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'editor' && (
            <>
              {/* Save/Download bar */}
              {projectData.stage2.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-5 flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    placeholder="Project name"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-theme-input border border-theme-primary rounded-lg text-sm text-theme-primary"
                  />
                  <button onClick={handleSaveProject} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2">
                    <Save className="w-4 h-4" />Save
                  </button>
                  <button onClick={downloadProject} className="px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg flex items-center gap-2 border border-theme-primary">
                    <Download className="w-4 h-4" />Export
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                    <Upload className="w-4 h-4" />Import
                  </button>
                </div>
              )}

              {/* Stage Progress */}
              <div className="flex items-center justify-between mb-5 overflow-x-auto">
                {stages.map((st, i) => (
                  <div key={i} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= currentStage || (i === 1 && projectData.stage2.length > 0) ? 'bg-purple-600 text-white' : 'bg-theme-tertiary text-theme-muted'}`}>
                        {i + 1}
                      </div>
                      <div className="text-xs text-center mt-1 font-semibold">{st.t}</div>
                    </div>
                    {i < 7 && <div className={`flex-1 h-1 mx-1 ${i < currentStage ? 'bg-purple-600' : 'bg-theme-tertiary'}`} />}
                  </div>
                ))}
              </div>

              {/* Processing Banner */}
              {isGenerating && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-5">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900">{generationProgress.stage || 'Processing...'}</h3>
                      {generationProgress.total > 0 && (
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {generationError && (
                <div className="mb-5 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-700">{generationError.message}</p>
                  <button onClick={() => { setGenerationError(null); setCurrentStage(0); }} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Back</button>
                </div>
              )}

              {/* Stage 0: Story Input */}
              {currentStage === 0 && !isGenerating && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600" />Stage 1: Develop Your Story</h2>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setShowStoryChat(true)} className={`px-4 py-2 rounded-lg text-sm font-medium ${showStoryChat ? 'bg-purple-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                      <MessageCircle className="w-4 h-4 inline mr-1" />Story Chat
                    </button>
                    <button onClick={() => setShowStoryChat(false)} className={`px-4 py-2 rounded-lg text-sm font-medium ${!showStoryChat ? 'bg-purple-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                      <Edit2 className="w-4 h-4 inline mr-1" />Direct Input
                    </button>
                  </div>

                  {showStoryChat ? (
                    <div className="border-2 border-purple-200 rounded-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5 text-white" /></div>
                          <div><h3 className="font-bold text-white">Story Development Chat</h3><p className="text-xs text-purple-200">Brainstorm and refine your story</p></div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setScriptInput(''); setShowStoryChat(false); }} className="px-3 py-1.5 bg-white/20 text-white text-sm rounded-lg">I Have My Story</button>
                          {chatMessages.length > 0 && (
                            <>
                              <button onClick={useLastAssistantMessage} className="px-3 py-1.5 bg-white/20 text-white text-sm rounded-lg">Use Last Response</button>
                              <button onClick={extractFinalStory} disabled={isChatting} className="px-4 py-1.5 bg-white text-purple-600 text-sm font-semibold rounded-lg flex items-center gap-1">
                                <Sparkles className="w-4 h-4" />Extract Final Story
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="h-80 overflow-y-auto p-4 space-y-4 bg-theme-tertiary">
                        {chatMessages.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"><Sparkles className="w-8 h-8 text-purple-600" /></div>
                            <h4 className="font-semibold text-theme-primary mb-2">Let&apos;s create your story!</h4>
                            <p className="text-sm text-theme-secondary max-w-md mx-auto mb-4">Share your idea and I&apos;ll help develop it.</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {['A robot learning emotions', 'A chef discovers magic', 'Two friends on adventure'].map((idea, i) => (
                                <button key={i} onClick={() => setChatInput(idea)} className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-full hover:bg-purple-200">{idea}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-theme-secondary border border-theme-primary text-theme-primary shadow-sm'}`}>
                              <p className="text-sm whitespace-pre-wrap">{cleanMarkdown(msg.content)}</p>
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="flex justify-start">
                            <div className="bg-theme-secondary border border-theme-primary rounded-2xl px-4 py-3 shadow-sm">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div className="border-t border-theme-primary bg-theme-secondary p-4">
                        <div className="flex gap-3 items-end">
                          <textarea
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendChatMessage(); } }}
                            placeholder="Describe your story idea... (Ctrl+Enter to send)"
                            className="flex-1 px-4 py-3 bg-theme-input border-2 border-theme-primary rounded-xl resize-none min-h-[52px] text-theme-primary"
                            disabled={isChatting}
                            rows={1}
                          />
                          <button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatting} className="px-5 py-3 bg-purple-600 text-white rounded-xl disabled:bg-theme-tertiary disabled:text-theme-muted h-[52px]">
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2"><Check className="w-5 h-5 text-green-600" /><h3 className="font-bold text-green-800">{scriptInput ? 'Your Story' : 'Enter Your Story'}</h3></div>
                          <button onClick={() => setShowStoryChat(true)} className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg flex items-center gap-1"><MessageCircle className="w-4 h-4" />Back to Chat</button>
                        </div>
                        <textarea
                          className="w-full h-64 p-4 border-2 border-green-200 rounded-lg bg-theme-input text-theme-primary"
                          value={scriptInput}
                          onChange={e => setScriptInput(e.target.value)}
                          placeholder="Paste or write your complete story here..."
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-theme-muted">{scriptInput.split(/\s+/).filter(w => w).length} words</span>
                          <button onClick={() => setScriptInput(cleanMarkdown(scriptInput))} className="text-xs text-green-600 underline">Clean formatting</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-theme-secondary">Style</label>
                          <input type="text" className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-theme-primary" placeholder="e.g., Anime" value={configInput.stylePreference} onChange={e => setConfigInput(p => ({ ...p, stylePreference: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-theme-secondary">Duration (seconds)</label>
                          <div className="flex gap-2">
                            <input type="number" className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-theme-primary" placeholder="60" value={configInput.expectedDuration} onChange={e => setConfigInput(p => ({ ...p, expectedDuration: e.target.value, autoDuration: false }))} disabled={configInput.autoDuration} />
                            <button onClick={() => setConfigInput(p => ({ ...p, autoDuration: !p.autoDuration, expectedDuration: '' }))} className={`px-3 py-2 text-xs rounded-lg whitespace-nowrap ${configInput.autoDuration ? 'bg-purple-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>Auto</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-theme-secondary">Audio</label>
                          <select className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-theme-primary" value={configInput.audioType} onChange={e => setConfigInput(p => ({ ...p, audioType: e.target.value }))}>
                            <option value="auto">Auto</option><option value="none">None</option><option value="narration">Narration</option><option value="dialogue">Dialogue</option><option value="both">Both</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-theme-secondary">Aspect Ratio</label>
                          <select className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-theme-primary" value={configInput.aspectRatio} onChange={e => setConfigInput(p => ({ ...p, aspectRatio: e.target.value }))}>
                            <option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option>
                          </select>
                        </div>
                      </div>

                      {/* Narration Options - show when narration or both is selected */}
                      {(configInput.audioType === 'narration' || configInput.audioType === 'both') && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <h4 className="text-sm font-semibold text-purple-800 mb-2">Narration Settings</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1 text-theme-secondary">Narration Pace</label>
                              <select className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-sm text-theme-primary" value={configInput.narrationPace} onChange={e => setConfigInput(p => ({ ...p, narrationPace: e.target.value }))}>
                                <option value="slow">Slow (contemplative, dramatic pauses)</option>
                                <option value="normal">Normal (natural reading pace)</option>
                                <option value="fast">Fast (energetic, quick delivery)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1 text-theme-secondary">Narration Complexity</label>
                              <select className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-sm text-theme-primary" value={configInput.narrationComplexity || 'standard'} onChange={e => setConfigInput(p => ({ ...p, narrationComplexity: e.target.value }))}>
                                <option value="simple">Simple (easy to understand)</option>
                                <option value="standard">Standard (general audience)</option>
                                <option value="advanced">Advanced (sophisticated vocabulary)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dialogue Options - show when dialogue or both is selected */}
                      {(configInput.audioType === 'dialogue' || configInput.audioType === 'both') && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="text-sm font-semibold text-green-800 mb-2">Dialogue Settings</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1 text-theme-secondary">Dialogue Amount</label>
                              <select className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-sm text-theme-primary" value={configInput.dialogueIntensity} onChange={e => setConfigInput(p => ({ ...p, dialogueIntensity: e.target.value }))}>
                                <option value="minimal">Minimal (sparse, impactful lines)</option>
                                <option value="medium">Medium (balanced conversation)</option>
                                <option value="heavy">Heavy (lots of dialogue)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1 text-theme-secondary">Dialogue Complexity</label>
                              <select className="w-full p-2 bg-theme-input border border-theme-primary rounded-lg text-sm text-theme-primary" value={configInput.dialogueComplexity || 'standard'} onChange={e => setConfigInput(p => ({ ...p, dialogueComplexity: e.target.value }))}>
                                <option value="simple">Simple (casual, everyday speech)</option>
                                <option value="standard">Standard (natural conversation)</option>
                                <option value="advanced">Advanced (eloquent, complex)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={generateStage2}
                        disabled={!scriptInput.trim() || isGenerating || (!configInput.autoDuration && !configInput.expectedDuration)}
                        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-lg font-bold disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <><Loader2 className="w-5 h-5 animate-spin" />{generationProgress.stage || 'Processing...'}</>
                        ) : (
                          <><Sparkles className="w-5 h-5" />Generate Shot List</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 2: Shots */}
              {projectData.stage2.length > 0 && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => toggleSection('stage2')}>
                    <h2 className="text-lg font-semibold text-theme-primary">Stage 2: Shot List ({totalScenes} scenes, {projectData.stage2.length} shots, {totalRuntime.toFixed(1)}s)</h2>
                    {expandedSections.stage2 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  {expandedSections.stage2 && (
                    <>
                      <div className={`p-3 rounded-lg mb-4 ${Math.abs(totalRuntime - (projectData.metadata?.targetDuration || 60)) <= (projectData.metadata?.targetDuration || 60) * 0.1 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-semibold">Total: {totalRuntime.toFixed(1)}s</span>
                            <span className="text-sm text-theme-muted ml-2">/ Target: {projectData.metadata?.targetDuration || 60}s</span>
                          </div>
                          <span className="text-sm text-theme-muted">{projectData.stage2.length} shots (~{(totalRuntime / projectData.stage2.length).toFixed(1)}s avg)</span>
                        </div>
                      </div>

                      {Object.entries(projectData.stage2.reduce((a: Record<number, Shot[]>, s) => {
                        if (!a[s.scene]) a[s.scene] = [];
                        a[s.scene].push(s);
                        return a;
                      }, {})).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([sceneNum, sceneShots]) => {
                        const sceneDuration = sceneShots.reduce((sum, s) => sum + s.timing, 0);
                        const isMontageScene = sceneShots[0]?.isMontage;
                        const sceneVO = sceneShots.find(s => s.sceneVO)?.sceneVO;
                        const beatColors: Record<string, string> = { 'SETUP': 'bg-blue-500', 'CONFLICT': 'bg-orange-500', 'CLIMAX': 'bg-red-500', 'RESOLUTION': 'bg-green-500' };
                        const sceneInfo = projectData.metadata?.scenePlan?.scenes?.find(s => s.scene === parseInt(sceneNum));
                        const storyBeat = sceneInfo?.story_beat;

                        return (
                          <div key={sceneNum} className="mb-4">
                            <div className={`flex items-center justify-between p-2 rounded ${isMontageScene ? 'bg-gradient-to-r from-pink-100 to-purple-100' : 'bg-purple-100'}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-purple-900">SCENE {sceneNum}</h3>
                                {isMontageScene && <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">MONTAGE</span>}
                                {storyBeat && <span className={`text-xs text-white px-2 py-0.5 rounded-full ${beatColors[storyBeat] || 'bg-gray-500'}`}>{storyBeat}</span>}
                              </div>
                              <span className="text-sm text-purple-700">{sceneShots.length} shots - {sceneDuration.toFixed(1)}s</span>
                            </div>

                            {isMontageScene && sceneVO && (
                              <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <span className="text-xs font-bold text-purple-700">SCENE NARRATION</span>
                                <p className="text-sm text-purple-800">{cleanNarration(sceneVO)}</p>
                              </div>
                            )}

                            <div className="space-y-2 mt-2">
                              {sceneShots.map(shot => (
                                <div key={shot.id} id={`shot-${shot.scene}-${shot.shotNumber}`} className={`bg-theme-tertiary p-3 rounded border-l-4 transition-all ${isMontageScene ? 'border-pink-400' : 'border-purple-500'}`}>
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="font-mono text-sm text-purple-600 font-bold">SHOT {shot.shotNumber}</span>
                                    <button onClick={() => hasStage7ForShot(shot.scene, shot.shotNumber) && scrollToRef(`frame-${shot.scene}-${shot.shotNumber}`)} className={`font-mono text-xs px-1.5 py-0.5 rounded ${hasStage7ForShot(shot.scene, shot.shotNumber) ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}>
                                      7.{shot.scene}.{shot.shotNumber}
                                    </button>
                                    <button onClick={() => hasStage8ForShot(shot.scene, shot.shotNumber) && scrollToRef(`anim-${shot.scene}-${shot.shotNumber}`)} className={`font-mono text-xs px-1.5 py-0.5 rounded ${hasStage8ForShot(shot.scene, shot.shotNumber) ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}>
                                      8.{shot.scene}.{shot.shotNumber}
                                    </button>

                                    {editingShotField === `${shot.id}-timing` ? (
                                      <div className="flex items-center gap-1">
                                        <input type="number" step="0.1" value={editingShotValue} onChange={e => setEditingShotValue(e.target.value)} className="w-16 px-1 py-0.5 text-xs bg-theme-input border border-theme-primary rounded text-theme-primary" autoFocus />
                                        <button onClick={() => saveShotEdit(shot.id, 'timing')} className="p-0.5 bg-green-500 text-white rounded"><Check className="w-3 h-3" /></button>
                                        <button onClick={cancelShotEdit} className="p-0.5 bg-theme-tertiary text-theme-secondary rounded"><X className="w-3 h-3" /></button>
                                      </div>
                                    ) : (
                                      <span onClick={() => startShotEdit(shot.id, 'timing', shot.timing)} className={`text-xs px-2 py-0.5 rounded cursor-pointer hover:ring-2 hover:ring-blue-300 ${shot.timing <= 0.5 ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'}`}>{shot.timing}s</span>
                                    )}

                                    {editingShotField === `${shot.id}-framing` ? (
                                      <div className="flex items-center gap-1">
                                        <select value={editingShotValue} onChange={e => setEditingShotValue(e.target.value)} className="px-1 py-0.5 text-xs bg-theme-input border border-theme-primary rounded text-theme-primary" autoFocus>
                                          {['ECU', 'CU', 'MCU', 'MS', 'MWS', 'WS', 'EWS', 'OTS', 'POV', 'TWO-SHOT'].map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        <button onClick={() => saveShotEdit(shot.id, 'framing')} className="p-0.5 bg-green-500 text-white rounded"><Check className="w-3 h-3" /></button>
                                        <button onClick={cancelShotEdit} className="p-0.5 bg-theme-tertiary text-theme-secondary rounded"><X className="w-3 h-3" /></button>
                                      </div>
                                    ) : (
                                      shot.framing && <span onClick={() => startShotEdit(shot.id, 'framing', shot.framing)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded cursor-pointer hover:ring-2 hover:ring-blue-300">{shot.framing}</span>
                                    )}
                                  </div>

                                  {shot.beat && <p className="text-xs text-blue-600 mb-1 font-medium">Beat: {shot.beat}</p>}

                                  {editingShotField === `${shot.id}-description` ? (
                                    <div className="mb-2">
                                      <textarea dir="ltr" value={editingShotValue} onChange={e => setEditingShotValue(e.target.value)} className="w-full p-2 text-sm bg-theme-input border border-theme-primary rounded min-h-[60px] text-theme-primary" autoFocus />
                                      <div className="flex gap-1 mt-1">
                                        <button onClick={() => saveShotEdit(shot.id, 'description')} className="px-2 py-1 bg-green-500 text-white text-xs rounded flex items-center gap-1"><Check className="w-3 h-3" />Save</button>
                                        <button onClick={cancelShotEdit} className="px-2 py-1 bg-theme-tertiary text-theme-secondary text-xs rounded flex items-center gap-1"><X className="w-3 h-3" />Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p onClick={() => startShotEdit(shot.id, 'description', shot.description)} className="text-sm text-theme-secondary cursor-pointer hover:bg-yellow-50 p-1 rounded">{shot.description}</p>
                                  )}

                                  <div className="mt-2 space-y-2">
                                    {editingShotField === `${shot.id}-dialogue` ? (
                                      <div>
                                        <textarea dir="ltr" value={editingShotValue} onChange={e => setEditingShotValue(e.target.value)} className="w-full p-2 text-sm bg-theme-input border border-theme-primary rounded min-h-[40px] text-theme-primary" placeholder="CHARACTER: [emotion] 'Dialogue text'" autoFocus />
                                        <div className="flex gap-1 mt-1">
                                          <button onClick={() => saveShotEdit(shot.id, 'dialogue')} className="px-2 py-1 bg-green-500 text-white text-xs rounded"><Check className="w-3 h-3" /></button>
                                          <button onClick={cancelShotEdit} className="px-2 py-1 bg-theme-tertiary text-theme-secondary text-xs rounded"><X className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div onClick={() => startShotEdit(shot.id, 'dialogue', shot.dialogue)} className={`text-sm p-2 rounded flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300 ${shot.dialogue ? 'bg-green-50 text-green-700' : 'bg-theme-tertiary text-theme-muted'}`}>
                                        <span>Dialog:</span><span>{shot.dialogue || 'Click to add'}</span>
                                      </div>
                                    )}

                                    {editingShotField === `${shot.id}-vo` ? (
                                      <div>
                                        <textarea dir="ltr" value={editingShotValue} onChange={e => setEditingShotValue(e.target.value)} className="w-full p-2 text-sm bg-theme-input border border-theme-primary rounded min-h-[40px] text-theme-primary" placeholder="[emotion] Narration text" autoFocus />
                                        <div className="flex gap-1 mt-1">
                                          <button onClick={() => saveShotEdit(shot.id, 'vo')} className="px-2 py-1 bg-green-500 text-white text-xs rounded"><Check className="w-3 h-3" /></button>
                                          <button onClick={cancelShotEdit} className="px-2 py-1 bg-theme-tertiary text-theme-secondary text-xs rounded"><X className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div onClick={() => startShotEdit(shot.id, 'vo', shot.vo)} className={`text-sm p-2 rounded flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300 ${shot.vo ? 'bg-purple-50 text-purple-700' : 'bg-theme-tertiary text-theme-muted'}`}>
                                        <span>VO:</span><span>{shot.vo ? cleanNarration(shot.vo) : 'Click to add'}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Regenerate Shot Button */}
                                  <div className="mt-3 pt-2 border-t border-theme-primary">
                                    <RegenButton
                                      id={`shot-${shot.scene}-${shot.shotNumber}`}
                                      label="Regenerate Shot"
                                      onRegenerate={(instr) => regenerateShot(shot, instr)}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Audio Summary Card - Show all VO and Dialogue */}
                      {(() => {
                        const allVO = projectData.stage2.filter(s => s.vo).map(s => ({ scene: s.scene, shot: s.shotNumber, text: s.vo }));
                        const allDialogue = projectData.stage2.filter(s => s.dialogue).map(s => ({ scene: s.scene, shot: s.shotNumber, text: s.dialogue }));
                        const sceneVOs = projectData.stage2.filter(s => s.sceneVO).reduce((acc, s) => {
                          if (!acc.find(v => v.scene === s.scene)) acc.push({ scene: s.scene, text: s.sceneVO });
                          return acc;
                        }, [] as { scene: number; text: string | undefined }[]);

                        const hasNarration = allVO.length > 0 || sceneVOs.length > 0;
                        const hasDialogue = allDialogue.length > 0;
                        const hasAudio = hasNarration || hasDialogue;

                        if (!hasAudio) return null;

                        const formatAllNarration = () => {
                          let output = '';
                          sceneVOs.forEach(v => {
                            output += `[Scene ${v.scene} Narration]\n${cleanNarration(v.text)}\n\n`;
                          });
                          allVO.forEach(v => {
                            output += `[S${v.scene}.${v.shot}] ${cleanNarration(v.text)}\n`;
                          });
                          return output.trim();
                        };

                        const formatAllDialogue = () => {
                          let output = '';
                          allDialogue.forEach(d => {
                            output += `[S${d.scene}.${d.shot}] ${d.text}\n`;
                          });
                          return output.trim();
                        };

                        const formatAllAudio = () => {
                          let output = '';
                          if (hasNarration) {
                            output += '=== NARRATION / VOICE OVER ===\n\n';
                            output += formatAllNarration();
                            output += '\n\n';
                          }
                          if (hasDialogue) {
                            output += '=== DIALOGUE ===\n\n';
                            output += formatAllDialogue();
                          }
                          return output.trim();
                        };

                        return (
                          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <h3 className="font-semibold text-indigo-900">Audio Summary</h3>
                              <button
                                onClick={() => copyToClipboard(formatAllAudio(), 'audio-summary-all')}
                                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${copiedId === 'audio-summary-all' ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}
                              >
                                {copiedId === 'audio-summary-all' ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy All</>}
                              </button>
                            </div>

                            {hasNarration && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold text-purple-700">Narration / Voice Over ({allVO.length + sceneVOs.length} entries)</h4>
                                  <button
                                    onClick={() => copyToClipboard(formatAllNarration(), 'audio-summary-narration')}
                                    className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 ${copiedId === 'audio-summary-narration' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'}`}
                                  >
                                    {copiedId === 'audio-summary-narration' ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy Narration</>}
                                  </button>
                                </div>
                                <div className="bg-theme-secondary rounded border border-theme-primary p-3 max-h-40 overflow-y-auto text-sm space-y-1">
                                  {sceneVOs.map((v, i) => (
                                    <div key={`scene-vo-${i}`} className="text-purple-800">
                                      <span className="font-mono text-xs bg-purple-100 px-1 rounded mr-2">Scene {v.scene}</span>
                                      {cleanNarration(v.text)}
                                    </div>
                                  ))}
                                  {allVO.map((v, i) => (
                                    <div key={`vo-${i}`}>
                                      <span className="font-mono text-xs bg-purple-100 px-1 rounded mr-2">S{v.scene}.{v.shot}</span>
                                      {cleanNarration(v.text)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasDialogue && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold text-green-700">Dialogue ({allDialogue.length} lines)</h4>
                                  <button
                                    onClick={() => copyToClipboard(formatAllDialogue(), 'audio-summary-dialogue')}
                                    className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 ${copiedId === 'audio-summary-dialogue' ? 'bg-green-600 text-white' : 'bg-green-600 text-white'}`}
                                  >
                                    {copiedId === 'audio-summary-dialogue' ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy Dialogue</>}
                                  </button>
                                </div>
                                <div className="bg-theme-secondary rounded border border-theme-primary p-3 max-h-40 overflow-y-auto text-sm space-y-1">
                                  {allDialogue.map((d, i) => (
                                    <div key={`dialogue-${i}`}>
                                      <span className="font-mono text-xs bg-green-100 px-1 rounded mr-2">S{d.scene}.{d.shot}</span>
                                      {d.text}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <button onClick={generateStage3} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Generate Art Style</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Stage 3: Style */}
              {projectData.stage3?.style && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => toggleSection('stage3')}>
                    <h2 className="text-lg font-semibold text-theme-primary">Stage 3: Art Style</h2>
                    {expandedSections.stage3 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  {expandedSections.stage3 && (
                    <>
                      <div className="bg-theme-tertiary p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleComplete('style-3.1')} className={`w-6 h-6 rounded border-2 flex items-center justify-center ${completedPrompts['style-3.1'] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                              {completedPrompts['style-3.1'] && <Check className="w-4 h-4" />}
                            </button>
                            <p className="font-semibold text-lg text-purple-800">{projectData.stage3.style}</p>
                          </div>
                          <button onClick={() => copyToClipboard(projectData.stage3.aiGenerationPrompt, '3.1')} className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${copiedId === '3.1' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'}`}>
                            {copiedId === '3.1' ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
                          </button>
                        </div>
                        <p className="text-sm text-theme-secondary font-mono bg-theme-secondary p-3 rounded border border-theme-primary">{projectData.stage3.aiGenerationPrompt}</p>
                        <PromptEditor id="style" value={projectData.stage3.aiGenerationPrompt} type="style" onRegenerate={(instr) => regenerateStyle(instr)} regenId="style" />
                      </div>
                      <button onClick={generateStage4} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Generate Characters</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Stage 4: Characters */}
              {projectData.stage4?.length > 0 && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('stage4')}>
                      <h2 className="text-lg font-semibold text-theme-primary">Stage 4: Characters ({projectData.stage4.length})</h2>
                      {expandedSections.stage4 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateAllCharacters(); }}
                      disabled={isGenerating || regeneratingId === 'stage4-all'}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {regeneratingId === 'stage4-all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regen All
                    </button>
                  </div>
                  {expandedSections.stage4 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {projectData.stage4.map(c => {
                          const shotRefs = getShotsForCharacter(c.name);
                          return (
                            <div key={c.id} id={`char-${c.id}`} className={`p-4 rounded border transition-all ${completedPrompts[c.id] ? 'bg-green-50 border-green-300' : 'bg-theme-tertiary border-theme-primary'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button onClick={() => toggleComplete(c.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center ${completedPrompts[c.id] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                                    {completedPrompts[c.id] && <Check className="w-4 h-4" />}
                                  </button>
                                  <p className="font-semibold text-purple-700">{getCleanName(c.name)}</p>
                                  {getRoleBadge(c.name)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => copyToClipboard(c.visualPrompt, `${c.id}-solo`)} className={`px-2 py-1 text-xs rounded-lg ${copiedId === `${c.id}-solo` ? 'bg-green-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                                    {copiedId === `${c.id}-solo` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  <button onClick={() => copyWithStyle(c.visualPrompt, c.id)} className={`px-2 py-1 text-xs rounded-lg ${copiedId === c.id ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'}`}>
                                    {copiedId === c.id ? <><Check className="w-3 h-3" />!</> : <><Copy className="w-3 h-3" />+Style</>}
                                  </button>
                                </div>
                              </div>
                              {shotRefs.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  <span className="text-xs text-theme-muted">Frames:</span>
                                  {shotRefs.map((ref, i) => (
                                    <button
                                      key={`7-${i}`}
                                      onClick={() => ref.hasStage7 && scrollToRef(`frame-${ref.scene}-${ref.shot}`)}
                                      className={`text-xs px-1.5 py-0.5 rounded ${ref.hasStage7 ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}
                                    >
                                      7.{ref.scene}.{ref.shot}
                                    </button>
                                  ))}
                                  <span className="text-xs text-theme-muted ml-2">Animation:</span>
                                  {shotRefs.map((ref, i) => (
                                    <button
                                      key={`8-${i}`}
                                      onClick={() => ref.hasStage8 && scrollToRef(`anim-${ref.scene}-${ref.shot}`)}
                                      className={`text-xs px-1.5 py-0.5 rounded ${ref.hasStage8 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}
                                    >
                                      8.{ref.scene}.{ref.shot}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <p className="text-sm text-theme-secondary font-mono bg-theme-secondary p-2 rounded border border-theme-primary">{c.visualPrompt}</p>
                              <PromptEditor id={c.id} value={c.visualPrompt} type="character" onRegenerate={(instr) => regenerateCharacter(c, instr)} regenId={c.id} />
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={generateStage5} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Generate Backgrounds</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Stage 5: Backgrounds */}
              {projectData.stage5?.length > 0 && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('stage5')}>
                      <h2 className="text-lg font-semibold text-theme-primary">Stage 5: Backgrounds ({projectData.stage5.length})</h2>
                      {expandedSections.stage5 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateAllBackgrounds(); }}
                      disabled={isGenerating || regeneratingId === 'stage5-all'}
                      className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800/50 disabled:opacity-50 flex items-center gap-1"
                    >
                      {regeneratingId === 'stage5-all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regen All
                    </button>
                  </div>
                  {expandedSections.stage5 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {projectData.stage5.map(bg => {
                          const shotRefs = getShotsForBackground(bg.name);
                          return (
                            <div key={bg.id} id={`bg-${bg.id}`} className={`p-4 rounded border transition-all ${completedPrompts[bg.id] ? 'bg-green-100 border-green-400' : 'bg-green-50 border-green-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => toggleComplete(bg.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center ${completedPrompts[bg.id] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                                    {completedPrompts[bg.id] && <Check className="w-4 h-4" />}
                                  </button>
                                  <p className="font-semibold text-green-800">{bg.name}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => copyToClipboard(bg.visualPrompt, `${bg.id}-solo`)} className={`px-2 py-1 text-xs rounded-lg ${copiedId === `${bg.id}-solo` ? 'bg-green-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                                    {copiedId === `${bg.id}-solo` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  <button onClick={() => copyWithStyle(bg.visualPrompt, bg.id)} className={`px-2 py-1 text-xs rounded-lg ${copiedId === bg.id ? 'bg-green-600 text-white' : 'bg-green-700 text-white'}`}>
                                    {copiedId === bg.id ? <><Check className="w-3 h-3" />!</> : <><Copy className="w-3 h-3" />+Style</>}
                                  </button>
                                </div>
                              </div>
                              {shotRefs.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  <span className="text-xs text-theme-muted">Frames:</span>
                                  {shotRefs.map((ref, i) => (
                                    <button
                                      key={`7-${i}`}
                                      onClick={() => ref.hasStage7 && scrollToRef(`frame-${ref.scene}-${ref.shot}`)}
                                      className={`text-xs px-1.5 py-0.5 rounded ${ref.hasStage7 ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}
                                    >
                                      7.{ref.scene}.{ref.shot}
                                    </button>
                                  ))}
                                  <span className="text-xs text-theme-muted ml-2">Animation:</span>
                                  {shotRefs.map((ref, i) => (
                                    <button
                                      key={`8-${i}`}
                                      onClick={() => ref.hasStage8 && scrollToRef(`anim-${ref.scene}-${ref.shot}`)}
                                      className={`text-xs px-1.5 py-0.5 rounded ${ref.hasStage8 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}
                                    >
                                      8.{ref.scene}.{ref.shot}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <p className="text-sm text-theme-secondary font-mono bg-theme-secondary p-2 rounded border border-theme-primary">{bg.visualPrompt}</p>
                              <PromptEditor id={bg.id} value={bg.visualPrompt} type="background" onRegenerate={(instr) => regenerateBackground(bg, instr)} regenId={bg.id} />
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={generateStage6} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Generate Items</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Stage 6: Items */}
              {currentStage >= 6 && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('stage6')}>
                      <h2 className="text-lg font-semibold text-theme-primary">Stage 6: Items ({projectData.stage6.length})</h2>
                      {expandedSections.stage6 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateAllItems(); }}
                      disabled={isGenerating || regeneratingId === 'stage6-all'}
                      className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {regeneratingId === 'stage6-all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regen All
                    </button>
                  </div>
                  {expandedSections.stage6 && (
                    <>
                      {projectData.stage6.length === 0 ? (
                        <div className="bg-theme-tertiary p-4 rounded-lg text-center">
                          <p className="text-theme-muted">No items found in this story.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {projectData.stage6.map(item => {
                            const shotRefs = getShotsForItem(item.name);
                            return (
                              <div key={item.id} id={`item-${item.id}`} className={`p-4 rounded border transition-all ${completedPrompts[item.id] ? 'bg-amber-100 border-amber-400' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => toggleComplete(item.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center ${completedPrompts[item.id] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                                      {completedPrompts[item.id] && <Check className="w-4 h-4" />}
                                    </button>
                                    <p className="font-semibold text-amber-800">{item.name}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => copyToClipboard(item.visualPrompt, `${item.id}-solo`)} className={`px-2 py-1 text-xs rounded-lg ${copiedId === `${item.id}-solo` ? 'bg-green-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                                      {copiedId === `${item.id}-solo` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    <button onClick={() => copyWithStyle(item.visualPrompt, item.id)} className={`px-2 py-1 text-xs rounded-lg ${copiedId === item.id ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}`}>
                                      {copiedId === item.id ? <><Check className="w-3 h-3" />!</> : <><Copy className="w-3 h-3" />+Style</>}
                                    </button>
                                  </div>
                                </div>
                                {shotRefs.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    <span className="text-xs text-theme-muted">Frames:</span>
                                    {shotRefs.map((ref, i) => (
                                      <button
                                        key={`7-${i}`}
                                        onClick={() => ref.hasStage7 && scrollToRef(`frame-${ref.scene}-${ref.shot}`)}
                                        className={`text-xs px-1.5 py-0.5 rounded ${ref.hasStage7 ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}
                                      >
                                        7.{ref.scene}.{ref.shot}
                                      </button>
                                    ))}
                                    <span className="text-xs text-theme-muted ml-2">Animation:</span>
                                    {shotRefs.map((ref, i) => (
                                      <button
                                        key={`8-${i}`}
                                        onClick={() => ref.hasStage8 && scrollToRef(`anim-${ref.scene}-${ref.shot}`)}
                                        className={`text-xs px-1.5 py-0.5 rounded ${ref.hasStage8 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}
                                      >
                                        8.{ref.scene}.{ref.shot}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <p className="text-sm text-theme-secondary font-mono bg-theme-secondary p-2 rounded border border-theme-primary">{item.visualPrompt}</p>
                                <PromptEditor id={item.id} value={item.visualPrompt} type="item" onRegenerate={(instr) => regenerateItem(item, instr)} regenId={item.id} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <button onClick={() => { setProjectData(p => ({ ...p, stage7: [] })); setBatchProgress(p => ({ ...p, stage7ScenesCompleted: 0 })); generateStage7(); }} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Generate Frames</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Stage 7: Frames */}
              {projectData.stage7?.length > 0 && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('stage7')}>
                      <h2 className="text-lg font-semibold text-theme-primary">Stage 7: Frames ({projectData.stage7.length})</h2>
                      {expandedSections.stage7 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateAllFrames(); }}
                      disabled={isGenerating || regeneratingId === 'stage7-all'}
                      className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {regeneratingId === 'stage7-all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regen All
                    </button>
                  </div>
                  {expandedSections.stage7 && (
                    <>
                      {/* Scene-level regen buttons */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-sm text-theme-muted">Regen by scene:</span>
                        {[...new Set(projectData.stage7.map(f => f.scene))].sort((a, b) => a - b).map(sceneNum => (
                          <button
                            key={sceneNum}
                            onClick={() => regenerateSceneFrames(sceneNum)}
                            disabled={isGenerating || regeneratingId === `scene-${sceneNum}-frames`}
                            className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            {regeneratingId === `scene-${sceneNum}-frames` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Scene {sceneNum}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-4">
                        {projectData.stage7.map(f => {
                          const refs = getReferencesForFrame(f);

                          return (
                          <div key={f.id} id={`frame-${f.scene}-${f.shotNumber}`} className="bg-theme-tertiary p-4 rounded border border-theme-primary transition-all">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="font-semibold text-indigo-700">Scene {f.scene} Shot {f.shotNumber}</span>
                              <span className="font-mono text-xs bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">7.{f.scene}.{f.shotNumber}</span>
                              <button onClick={() => scrollToRef(`shot-${f.scene}-${f.shotNumber}`)} className="font-mono text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded hover:bg-purple-200">Shot</button>
                              <button onClick={() => hasStage8ForShot(f.scene, f.shotNumber) && scrollToRef(`anim-${f.scene}-${f.shotNumber}`)} className={`font-mono text-xs px-1.5 py-0.5 rounded ${hasStage8ForShot(f.scene, f.shotNumber) ? 'bg-purple-200 text-purple-800 hover:bg-purple-300 cursor-pointer' : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'}`}>
                                8.{f.scene}.{f.shotNumber}
                              </button>
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{f.duration}s</span>
                            </div>

                            {/* References: Characters, Backgrounds, Items */}
                            {(refs.characters.length > 0 || refs.backgrounds.length > 0 || refs.items.length > 0) && (
                              <div className="flex flex-wrap gap-2 mb-3 p-2 bg-theme-secondary rounded border border-theme-primary">
                                {refs.characters.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-theme-muted">Character(s):</span>
                                    {refs.characters.map(c => (
                                      <button key={c.id} onClick={() => scrollToRef(`char-${c.id}`)} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded hover:bg-purple-200">
                                        {getCleanName(c.name).split(' ')[0]}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {refs.backgrounds.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-theme-muted">BG{refs.backgrounds.length > 1 ? 's' : ''}:</span>
                                    {refs.backgrounds.map((bg, idx) => (
                                      <button key={bg.id} onClick={() => scrollToRef(`bg-${bg.id}`)} className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800/50">
                                        {refs.backgrounds.length > 1 && <span className="font-semibold mr-1">{idx === 0 ? '1st:' : '2nd:'}</span>}
                                        {bg.name.split(' ').slice(0, 2).join(' ')}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {refs.items.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-theme-muted">Items:</span>
                                    {refs.items.map(item => (
                                      <button key={item.id} onClick={() => scrollToRef(`item-${item.id}`)} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded hover:bg-amber-200">
                                        {item.name.split(' ').slice(0, 2).join(' ')}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className={`rounded border ${completedPrompts[`${f.id}-first`] ? 'bg-green-50 border-green-300' : 'bg-theme-secondary border-theme-primary'}`}>
                                <div className="p-3 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleComplete(`${f.id}-first`)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${completedPrompts[`${f.id}-first`] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                                        {completedPrompts[`${f.id}-first`] && <Check className="w-3 h-3" />}
                                      </button>
                                      <span className="text-sm font-bold text-green-700">FIRST FRAME</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => copyToClipboard(f.firstFrame, `${f.id}-first-solo`)} className={`px-2 py-1 text-xs rounded ${copiedId === `${f.id}-first-solo` ? 'bg-green-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                                        {copiedId === `${f.id}-first-solo` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                      <button onClick={() => copyWithStyle(f.firstFrame, `${f.id}-first`)} className={`px-2 py-1 text-xs rounded ${copiedId === `${f.id}-first` ? 'bg-green-600 text-white' : 'bg-green-600 text-white'}`}>
                                        {copiedId === `${f.id}-first` ? <><Check className="w-3 h-3" />!</> : <><Copy className="w-3 h-3" />+Style</>}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <p className="text-sm text-theme-secondary font-mono">{f.firstFrame}</p>
                                  <PromptEditor id={`${f.id}-first-edit`} value={f.firstFrame} type="frame" field="firstFrame" onRegenerate={(instr) => regenerateFrame(f, 'firstFrame', instr)} regenId={`${f.id}-firstFrame`} />
                                </div>
                              </div>

                              <div className={`rounded border ${completedPrompts[`${f.id}-last`] ? 'bg-green-50 border-green-300' : 'bg-theme-secondary border-theme-primary'}`}>
                                <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleComplete(`${f.id}-last`)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${completedPrompts[`${f.id}-last`] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                                        {completedPrompts[`${f.id}-last`] && <Check className="w-3 h-3" />}
                                      </button>
                                      <span className="text-sm font-bold text-blue-700">LAST FRAME</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => copyToClipboard(f.lastFrame, `${f.id}-last-solo`)} className={`px-2 py-1 text-xs rounded ${copiedId === `${f.id}-last-solo` ? 'bg-green-600 text-white' : 'bg-theme-tertiary text-theme-secondary'}`}>
                                        {copiedId === `${f.id}-last-solo` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                      <button onClick={() => copyWithStyle(f.lastFrame, `${f.id}-last`)} className={`px-2 py-1 text-xs rounded ${copiedId === `${f.id}-last` ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                                        {copiedId === `${f.id}-last` ? <><Check className="w-3 h-3" />!</> : <><Copy className="w-3 h-3" />+Style</>}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <p className="text-sm text-theme-secondary font-mono">{f.lastFrame}</p>
                                  <PromptEditor id={`${f.id}-last-edit`} value={f.lastFrame} type="frame" field="lastFrame" onRegenerate={(instr) => regenerateFrame(f, 'lastFrame', instr)} regenId={`${f.id}-lastFrame`} />
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>

                      {batchProgress.stage7ScenesCompleted < (projectData.metadata?.totalScenes || 0) ? (
                        <button onClick={generateStage7} disabled={isGenerating} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>More Frames</>}
                        </button>
                      ) : (
                        <button onClick={() => { setProjectData(p => ({ ...p, stage8: [] })); setBatchProgress(p => ({ ...p, stage8ScenesCompleted: 0 })); generateStage8(); }} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Generate Animation</>}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Stage 8: Animation */}
              {projectData.stage8?.length > 0 && (
                <div className="mb-5 border border-theme-primary rounded-lg p-4 bg-theme-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('stage8')}>
                      <h2 className="text-lg font-semibold text-theme-primary">Stage 8: Animation ({projectData.stage8.length})</h2>
                      {expandedSections.stage8 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerateAllAnimations(); }}
                      disabled={isGenerating || regeneratingId === 'stage8-all'}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {regeneratingId === 'stage8-all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regen All
                    </button>
                  </div>
                  {expandedSections.stage8 && (
                    <>
                      {/* Scene-level regen buttons */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-sm text-theme-muted">Regen by scene:</span>
                        {[...new Set(projectData.stage8.map(a => a.scene))].sort((a, b) => a - b).map(sceneNum => (
                          <button
                            key={sceneNum}
                            onClick={() => regenerateSceneAnimations(sceneNum)}
                            disabled={isGenerating || regeneratingId === `scene-${sceneNum}-anims`}
                            className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            {regeneratingId === `scene-${sceneNum}-anims` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Scene {sceneNum}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {projectData.stage8.map(a => (
                          <div key={a.id} id={`anim-${a.scene}-${a.shotNumber}`} className={`p-4 rounded border transition-all ${completedPrompts[a.id] ? 'bg-green-50 border-green-300' : 'bg-theme-tertiary border-theme-primary'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => toggleComplete(a.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center ${completedPrompts[a.id] ? 'bg-green-500 border-green-500 text-white' : 'border-theme-primary'}`}>
                                  {completedPrompts[a.id] && <Check className="w-4 h-4" />}
                                </button>
                                <p className="font-semibold text-purple-700">Scene {a.scene} Shot {a.shotNumber}</p>
                                <span className="font-mono text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">8.{a.scene}.{a.shotNumber}</span>
                                <button onClick={() => scrollToRef(`shot-${a.scene}-${a.shotNumber}`)} className="font-mono text-xs bg-theme-tertiary text-theme-secondary px-1.5 py-0.5 rounded hover:bg-theme-tertiary">Shot</button>
                                <button onClick={() => scrollToRef(`frame-${a.scene}-${a.shotNumber}`)} className="font-mono text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-200">7.{a.scene}.{a.shotNumber}</button>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{a.duration}s</span>
                              </div>
                              <button onClick={() => copyToClipboard(a.animationPrompt, a.id)} className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${copiedId === a.id ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'}`}>
                                {copiedId === a.id ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
                              </button>
                            </div>
                            <p className="text-sm text-theme-secondary font-mono bg-theme-secondary p-3 rounded border border-theme-primary">{a.animationPrompt}</p>
                            <PromptEditor id={a.id} value={a.animationPrompt} type="animation" onRegenerate={(instr) => regenerateAnimation(a, instr)} regenId={a.id} />
                          </div>
                        ))}
                      </div>

                      {batchProgress.stage8ScenesCompleted < (projectData.metadata?.totalScenes || 0) && (
                        <button onClick={generateStage8} disabled={isGenerating} className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 disabled:bg-theme-tertiary disabled:text-theme-muted">
                          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>More Animation</>}
                        </button>
                      )}

                      {batchProgress.stage8ScenesCompleted >= (projectData.metadata?.totalScenes || 0) && (
                        <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-300">
                          <h3 className="font-semibold text-green-900">All Stages Complete!</h3>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
