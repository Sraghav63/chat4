'use client';

import React, { useEffect, useMemo, useState } from "react";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

function getFavorites() {
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

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [favorites, setFavs] = useState<string[]>(getFavorites());
  const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);

  useEffect(() => {
    fetch(OPENROUTER_API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setModels(data.data || []));
  }, []);

  useEffect(() => {
    setFavs(getFavorites());
  }, [open]);

  const filteredModels = useMemo(() => {
    let filtered = models;
    if (search) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  }, [models, search]);

  const favoriteModels = filteredModels.filter((m) => favorites.includes(m.id));
  const otherModels = filteredModels.filter((m) => !favorites.includes(m.id));

  function toggleFavorite(id: string) {
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
    setOptimisticModelId(id);
    saveChatModelAsCookie(id);
  }

  function renderModelCard(model: any) {
    const isSelected = model.id === optimisticModelId;
    const isFavorite = favorites.includes(model.id);
    return (
      <div
        key={model.id}
        className={cn(
          "flex flex-row items-center justify-between rounded-lg border p-3 mb-2 cursor-pointer transition hover:bg-accent",
          isSelected && "border-primary bg-accent"
        )}
        onClick={() => handleSelect(model.id)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{model.name}</span>
            {isSelected && (
              <span className="text-primary"><CheckCircleFillIcon /></span>
            )}
          </div>
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            {model.description}
          </div>
          <div className="flex gap-2 mt-1">
            {model.architecture?.input_modalities?.map((mod: string) => (
              <span key={mod} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {mod}
              </span>
            ))}
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {model.id}
            </span>
          </div>
        </div>
        <button
          className={cn(
            "ml-4 text-lg opacity-60 hover:opacity-100",
            isFavorite && "text-yellow-500"
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(model.id);
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        data-testid="model-selector"
        variant="outline"
        className="md:px-2 md:h-[34px]"
        onClick={() => setOpen((v) => !v)}
      >
        {optimisticModelId || "Select Model"}
        <ChevronDownIcon />
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 w-[400px] max-h-[70vh] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg p-4">
          <input
            type="text"
            placeholder="Search models..."
            className="w-full mb-4 p-2 border rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {favoriteModels.length > 0 && (
            <div className="mb-4">
              <div className="font-bold mb-2">Favorites</div>
              {favoriteModels.map(renderModelCard)}
            </div>
          )}
          <div>
            <div className="font-bold mb-2">Others</div>
            {otherModels.length > 0 ? (
              otherModels.map(renderModelCard)
            ) : (
              <div className="text-muted-foreground text-sm">No models found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
