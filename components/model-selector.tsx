'use client';

import React, { useEffect, useMemo, useState } from "react";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
  };
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("openrouter_favorites") || "[]");
  } catch {
    return [];
  }
}

function setFavorites(favs: string[]) {
  localStorage.setItem("openrouter_favorites", JSON.stringify(favs));
}

function getProviderFromId(id: string): string {
  return id.split('/')[0] || 'unknown';
}

function getProviderIcon(provider: string) {
  const icons: Record<string, string> = {
    'openai': '🤖',
    'anthropic': '🧠', 
    'google': '🟡',
    'meta': '🦙',
    'mistral': '🌟',
    'cohere': '🔷',
    'perplexity': '🔍',
    'x-ai': '❌',
    'microsoft': '🔷',
  };
  return icons[provider] || '⚡';
}

function getCapabilityIcon(modality: string) {
  const icons: Record<string, string> = {
    'text': '📝',
    'image': '🖼️', 
    'file': '📎',
    'vision': '👁️',
  };
  return icons[modality] || '⚙️';
}

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [search, setSearch] = useState("");
  const [favorites, setFavs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFavs(getFavorites());
  }, []);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        const response = await fetch(OPENROUTER_API_URL);
        const data = await response.json();
        setModels(data.data || []);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  const filteredModels = useMemo(() => {
    let filtered = models;
    if (search) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  }, [models, search]);

  const favoriteModels = filteredModels.filter((m) => favorites.includes(m.id));
  const otherModels = filteredModels.filter((m) => !favorites.includes(m.id));

  // Group other models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, OpenRouterModel[]> = {};
    otherModels.forEach(model => {
      const provider = getProviderFromId(model.id);
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(model);
    });
    return groups;
  }, [otherModels]);

  function toggleFavorite(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    let favs = getFavorites();
    if (favs.includes(id)) {
      favs = favs.filter((f: string) => f !== id);
    } else {
      favs.push(id);
    }
    setFavorites(favs);
    setFavs(favs);
  }

  function handleSelect(id: string) {
    setOpen(false);
    saveChatModelAsCookie(id);
  }

  function renderModelCard(model: OpenRouterModel, isCompact = false) {
    const isSelected = model.id === selectedModelId;
    const isFavorite = favorites.includes(model.id);
    const provider = getProviderFromId(model.id);

    return (
      <div
        key={model.id}
        className={cn(
          "relative rounded-xl border border-border bg-card p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md",
          isSelected && "border-primary bg-primary/5 shadow-sm",
          isCompact ? "min-h-[120px]" : "min-h-[140px]",
          "flex flex-col justify-between"
        )}
        onClick={() => handleSelect(model.id)}
      >
        {/* Header with name and favorite */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getProviderIcon(provider)}</span>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{model.name}</h3>
              {isSelected && (
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircleFillIcon />
                  <span className="text-xs text-primary">Selected</span>
                </div>
              )}
            </div>
          </div>
          <button
            className={cn(
              "text-lg transition-colors",
              isFavorite ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-yellow-500"
            )}
            onClick={(e) => toggleFavorite(model.id, e)}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
          {model.description}
        </p>

        {/* Capabilities and model ID */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {model.architecture?.input_modalities?.slice(0, 3).map((mod: string) => (
              <div key={mod} className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1">
                <span className="text-xs">{getCapabilityIcon(mod)}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/30 rounded px-2 py-1">
            <span className="text-xs font-mono text-muted-foreground">{model.id}</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className={cn("relative", className)}>
      <Button
        data-testid="model-selector"
        variant="outline"
        className="md:px-2 md:h-[34px]"
        onClick={() => setOpen(!open)}
      >
        {selectedModel?.name || selectedModelId || "Select Model"}
        <ChevronDownIcon />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/50" onClick={() => setOpen(false)}>
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold">Select Model</h2>
                <button 
                  onClick={() => setOpen(false)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search models..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading models...</div>
              ) : (
                <>
                  {/* Favorites */}
                  {favoriteModels.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">⭐</span>
                        <h3 className="font-semibold text-lg">Favorites</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {favoriteModels.map(model => renderModelCard(model, true))}
                      </div>
                    </div>
                  )}

                  {/* Others grouped by provider */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Others</h3>
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{getProviderIcon(provider)}</span>
                          <h4 className="font-medium capitalize">{provider}</h4>
                          <span className="text-sm text-muted-foreground">({providerModels.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {providerModels.slice(0, 8).map(model => renderModelCard(model, true))}
                        </div>
                        {providerModels.length > 8 && (
                          <div className="text-center mt-3">
                            <span className="text-sm text-muted-foreground">
                              +{providerModels.length - 8} more models
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {filteredModels.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      No models found matching your search.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
