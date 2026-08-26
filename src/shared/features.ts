// src/shared/features.ts

/**
 * Keystone Licensing Feature-Gating Definitions
 * 
 * CORE MANIFESTO & ETHICAL CODES:
 * 1. Generous Free Tier: The core of Keystone MUST remain genuinely useful indefinitely.
 * 2. Absolutely NO task count limits, project count caps, note storage bottlenecks, or hard artificial barriers.
 * 3. NO intrusive nag screens or locked workflows for daily operations.
 * 4. Trials gracefully expire back to the standard FREE tier without deleting, corrupting, or locking user data.
 * 
 * ANTI-PATTERN GUARDRAILS:
 * - DO NOT ADD task count limits or data throttling gates.
 * - DO NOT REMOVE existing free features in future updates to force upgrades.
 * - KEEP ALL local-first processing hermetically sealed and functional offline.
 */

export type FeatureKey =
  | 'task_management'       // Free: Full offline task lists & custom fields
  | 'nlp_capture'           // Free: Natural language processing parsing for dates
  | 'habits'                // Free: Standard habit tracking logs
  | 'focus_sessions'        // Free: Traditional pomodoro / ambient noise focus blocks
  | 'basic_analytics'       // Free: Basic productivity charts
  | 'basic_notes'           // Free: Local private scratchpads & markdown documents
  | 'assisted_scheduler'    // Pro: Smart AI agenda auto-weighting & scheduling (AI-assisted)
  | 'deep_work_intel'      // Pro: Deep-work performance intelligence analytics
  | 'advanced_analytics'    // Pro: Long-term habit trends, heatmaps, and prediction models
  | 'unlimited_notes'       // Pro: Unlimited structured linked notes databases
  | 'voice_capture'         // Pro: Local hardware voice-to-task dictation parsing
  | 'encrypted_sync'        // Pro: Zero-knowledge peer-to-peer / private target encryption sync
  | 'command_custom'        // Pro: Custom Command Bar actions & script injection shortcut keys
  | 'team_shared_projects'  // Team: Real-time multi-device project synchronization (future)
  | 'team_assigned_tasks';  // Team: Assigned task delegation and multi-peer workflows (future)

export interface FeatureDefinition {
  key: FeatureKey
  name: string
  description: string
  tier: 'free' | 'pro' | 'team'
  upsellDescription: string
}

export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  task_management: {
    key: 'task_management',
    name: 'Unified Offline Tasks',
    description: 'Comprehensive task lists, tag systems, and project boards stored securely on-device.',
    tier: 'free',
    upsellDescription: 'Available for all users.'
  },
  nlp_capture: {
    key: 'nlp_capture',
    name: 'NLP Dynamic Capture',
    description: 'Instantly parse target deadlines, tags, and times using natural phrasing.',
    tier: 'free',
    upsellDescription: 'Available for all users.'
  },
  habits: {
    key: 'habits',
    name: 'Habit Tracker Loop',
    description: 'Log and monitor daily streaks to reinforce constructive routines.',
    tier: 'free',
    upsellDescription: 'Available for all users.'
  },
  focus_sessions: {
    key: 'focus_sessions',
    name: 'Hermetic Focus Timer',
    description: 'Pair flow-state timers with offline ambient noise synthesizer layers.',
    tier: 'free',
    upsellDescription: 'Available for all users.'
  },
  basic_notes: {
    key: 'basic_notes',
    name: 'Markdown Scratchpads',
    description: 'Keep local, lightning-fast private scratchpads with basic editing markers.',
    tier: 'free',
    upsellDescription: 'Available for all users.'
  },
  basic_analytics: {
    key: 'basic_analytics',
    name: 'Local Basic Diagnostics',
    description: 'View essential completion rates and focus logs.',
    tier: 'free',
    upsellDescription: 'Available for all users.'
  },
  assisted_scheduler: {
    key: 'assisted_scheduler',
    name: 'Dynamic Assist Scheduler',
    description: 'AI weights time vectors to generate cohesive agendas based on energy profiles.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro works alongside your focus trends to auto-schedule optimized time blocks.'
  },
  deep_work_intel: {
    key: 'deep_work_intel',
    name: 'Deep Work Intelligence',
    description: 'Identifies peak distraction times, focus degradation markers, and flow intervals.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro monitors offline focus indexes to pinpoint your highest performance hours.'
  },
  advanced_analytics: {
    key: 'advanced_analytics',
    name: 'Multi-Dimensional Analytics',
    description: 'Long-term habit heatmaps, correlation projections, and focus history metrics.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro expands analytics to display high-resolution habit compliance models over unlimited epochs.'
  },
  unlimited_notes: {
    key: 'unlimited_notes',
    name: 'Zettelkasten Linked Notes',
    description: 'Advanced note networks utilizing bidirectional link index graphs and backreferences.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro supports deeply structured linked databases for custom knowledge-base networks.'
  },
  voice_capture: {
    key: 'voice_capture',
    name: 'Local Voice Dictation Parser',
    description: 'Transcribe ambient speech directives into well-structured tasks completely offline.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro parses task dates and priorities directly from offline audio cues.'
  },
  encrypted_sync: {
    key: 'encrypted_sync',
    name: 'Double-Encrypted Sync Targets',
    description: 'Store zero-knowledge encrypted storage buckets on your private server, WebDAV, or local backups folder.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro syncs multi-device databases using solid end-to-end user-side symmetric keys.'
  },
  command_custom: {
    key: 'command_custom',
    name: 'Custom Shortcut Customizer',
    description: 'Enrich Command Bar structures with micro-scripts and personalized macro chains.',
    tier: 'pro',
    upsellDescription: 'Keystone Pro allows you to define complex macro workflows and inject raw javascript shortcuts.'
  },
  team_shared_projects: {
    key: 'team_shared_projects',
    name: 'Shared Team Spaces',
    description: 'Synchronize project files and task boards across collaborative, self-hosted workspaces.',
    tier: 'team',
    upsellDescription: 'Team features let you spin up zero-server sync pools for multiple developers.'
  },
  team_assigned_tasks: {
    key: 'team_assigned_tasks',
    name: 'Task Delegation & Assignment',
    description: 'Assign tasks to team channels or specific colleagues with decentralized verification.',
    tier: 'team',
    upsellDescription: 'Team attributes resolve task dependencies between peer nodes across the same enclave.'
  }
}
