'use client';

import { useState, useEffect } from 'react';
import { Key, Save, Loader2, Check, AlertCircle, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [defaultStyle, setDefaultStyle] = useState('');
  const [defaultDuration, setDefaultDuration] = useState('');
  const [defaultAudioType, setDefaultAudioType] = useState('auto');
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('16:9');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey || false);
        setApiKeyPreview(data.apiKeyPreview || null);
        setDefaultStyle(data.defaultStyle || '');
        setDefaultDuration(data.defaultDuration?.toString() || '');
        setDefaultAudioType(data.defaultAudioType || 'auto');
        setDefaultAspectRatio(data.defaultAspectRatio || '16:9');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicApiKey: apiKey || undefined,
          defaultStyle: defaultStyle || null,
          defaultDuration: defaultDuration ? parseInt(defaultDuration) : null,
          defaultAudioType: defaultAudioType || null,
          defaultAspectRatio: defaultAspectRatio || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey || false);
        setApiKeyPreview(data.apiKeyPreview || null);
        setApiKey('');
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const removeApiKey = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropicApiKey: null }),
      });

      if (response.ok) {
        setHasApiKey(false);
        setApiKeyPreview(null);
        setMessage({ type: 'success', text: 'API key removed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove API key' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-theme-primary mb-6">Settings</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Theme Section */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Sun className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Appearance</h2>
            <p className="text-sm text-theme-muted">Choose your preferred theme</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('auto')}
            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
              theme === 'auto'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-theme-primary hover:border-purple-500/50'
            }`}
          >
            <Monitor className={`w-6 h-6 ${theme === 'auto' ? 'text-purple-400' : 'text-theme-muted'}`} />
            <span className={`text-sm font-medium ${theme === 'auto' ? 'text-purple-400' : 'text-theme-secondary'}`}>
              Auto
            </span>
            <span className="text-xs text-theme-muted">System</span>
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
              theme === 'light'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-theme-primary hover:border-purple-500/50'
            }`}
          >
            <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-purple-400' : 'text-theme-muted'}`} />
            <span className={`text-sm font-medium ${theme === 'light' ? 'text-purple-400' : 'text-theme-secondary'}`}>
              Light
            </span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
              theme === 'dark'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-theme-primary hover:border-purple-500/50'
            }`}
          >
            <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-theme-muted'}`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-400' : 'text-theme-secondary'}`}>
              Dark
            </span>
          </button>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Anthropic API Key</h2>
            <p className="text-sm text-theme-muted">Required to generate prompts</p>
          </div>
        </div>

        {hasApiKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400">API Key Connected</p>
                <p className="text-xs text-green-400/70">{apiKeyPreview}</p>
              </div>
              <button
                onClick={removeApiKey}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="border-t border-theme-primary pt-4">
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Update API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-4 py-3 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-12 text-theme-primary placeholder-theme-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-secondary"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">No API Key Set</p>
                  <p className="text-xs text-yellow-400/70 mt-1">
                    You need an Anthropic API key to generate prompts. Get one at{' '}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-yellow-300"
                    >
                      console.anthropic.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Enter Your API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-4 py-3 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none pr-12 text-theme-primary placeholder-theme-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-secondary"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-theme-muted">
                Your API key is encrypted and stored securely. It is never exposed to the browser.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Default Settings */}
      <div className="bg-theme-secondary rounded-xl border border-theme-primary p-6 mb-6">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">Default Project Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              Default Style
            </label>
            <input
              type="text"
              value={defaultStyle}
              onChange={(e) => setDefaultStyle(e.target.value)}
              placeholder="e.g., Modern 2D Animation, Anime, Pixar-style"
              className="w-full px-4 py-2 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary placeholder-theme-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Default Duration (seconds)
              </label>
              <input
                type="number"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                placeholder="60"
                className="w-full px-4 py-2 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary placeholder-theme-muted"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Default Aspect Ratio
              </label>
              <select
                value={defaultAspectRatio}
                onChange={(e) => setDefaultAspectRatio(e.target.value)}
                className="w-full px-4 py-2 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              Default Audio Type
            </label>
            <select
              value={defaultAudioType}
              onChange={(e) => setDefaultAudioType(e.target.value)}
              className="w-full px-4 py-2 bg-theme-input border border-theme-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-theme-primary"
            >
              <option value="auto">Auto (AI Decides)</option>
              <option value="none">None</option>
              <option value="narration">Narration Only</option>
              <option value="dialogue">Dialogue Only</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={isSaving}
        className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-800 transition-colors flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Settings
          </>
        )}
      </button>
    </div>
  );
}
