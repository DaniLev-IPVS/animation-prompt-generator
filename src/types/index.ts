import { DefaultSession } from 'next-auth';

// User roles enum - mirrors Prisma enum
export enum UserRole {
  REVOKED = 'REVOKED',
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

// Admin-specific types
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  lastActiveAt: Date | null;
  projectCount: number;
  generationCount: number;
  totalTokensUsed: number;
}

export interface AdminUserStats {
  totalUsers: number;
  totalProjects: number;
  totalGenerations: number;
  usersThisMonth: number;
}

export interface ConfigInput {
  stylePreference: string;
  expectedDuration: string;
  audioType: string;
  hook: string;
  aspectRatio: string;
  narrationPace: string;
  narrationComplexity: string;
  dialogueIntensity: string;
  dialogueComplexity: string;
  contentComplexity: string; // kept for backwards compatibility
  autoDuration: boolean;
  aiRecommendedDuration?: number;
  aiRecommendedAudio?: string;
  aiReasoning?: string;
  resolvedAudioType?: string;
  resolvedDuration?: number;
}

export interface Shot {
  id: string;
  scene: number;
  shotNumber: number;
  framing: string;
  timing: number;
  beat: string;
  description: string;
  dialogue: string;
  vo: string;
  isMontage?: boolean;
  sceneVO?: string;
}

export interface Character {
  id: string;
  name: string;
  visualPrompt: string;
}

export interface Background {
  id: string;
  name: string;
  visualPrompt: string;
}

export interface Item {
  id: string;
  name: string;
  visualPrompt: string;
}

export interface Frame {
  id: string;
  scene: number;
  shotNumber: number;
  duration: number;
  firstFrame: string;
  lastFrame: string;
  // References stored at generation time for accurate linking
  characterIds?: string[];
  backgroundIds?: string[];
  itemIds?: string[];
}

export interface Animation {
  id: string;
  scene: number;
  shotNumber: number;
  duration: number;
  animationPrompt: string;
}

export interface SceneInfo {
  scene: number;
  type: string;
  location: string;
  duration: number;
  summary: string;
  audio_mode?: string;
  story_beat?: string;
  target_shots?: number;
}

export interface ScenePlan {
  scenes: SceneInfo[];
  totalDuration: number;
  audioType: string;
  totalTargetShots: number;
  resolvedDuration?: number;
  resolvedAudioType?: string;
}

export interface ProjectMetadata {
  totalShots: number;
  totalScenes: number;
  estimatedRuntime: number;
  targetDuration: number;
  resolvedAudioType: string;
  aspectRatio: string;
  scenePlan?: ScenePlan;
  aiRecommendations?: {
    duration?: number;
    audio?: string;
    reasoning?: string;
  };
}

export interface Stage3Data {
  id?: string;
  style: string;
  aiGenerationPrompt: string;
}

export interface ProjectData {
  stage1: {
    script?: string;
    config?: ConfigInput;
  };
  stage2: Shot[];
  stage3: Stage3Data;
  stage4: Character[];
  stage5: Background[];
  stage6: Item[];
  stage7: Frame[];
  stage8: Animation[];
  metadata?: ProjectMetadata;
}

export interface BatchProgress {
  stage7ScenesCompleted: number;
  stage8ScenesCompleted: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  scriptInput?: string;
  configInput?: ConfigInput;
  projectData?: ProjectData;
  batchProgress?: BatchProgress;
  chatMessages?: ChatMessage[];
  completedPrompts?: Record<string, boolean>;
  isPublic: boolean;
  shareId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationHistory {
  id: string;
  userId: string;
  projectId?: string;
  stage: string;
  prompt: string;
  response: string;
  tokensUsed?: number;
  createdAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  anthropicApiKey?: string;
  defaultStyle?: string;
  defaultDuration?: number;
  defaultAudioType?: string;
  defaultAspectRatio?: string;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
}

export interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}
