import React, { useEffect, useState } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { cn, fetcher } from '@/lib/utils';
import type { Session } from 'next-auth';

// Get model icon based on provider and model name
const getModelIcon = (modelId: string, modelName: string) => {
  const provider = modelId.split('/')[0].toLowerCase();
  const name = modelName.toLowerCase();
  
  // Google models - use actual Google icon
  if (provider === 'google' || name.includes('gemini')) {
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
        alt="Google"
        width={32}
        height={32}
        className="rounded-lg"
      />
    );
  }
  
  // OpenAI models - keep the existing one since it's correct
  if (provider === 'openai' || name.includes('gpt')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
        </svg>
      </div>
    );
  }
  
  // Anthropic models
  if (provider === 'anthropic' || name.includes('claude')) {
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg"
        alt="Anthropic"
        width={32}
        height={32}
        className="rounded-lg bg-orange-500 p-1"
        style={{ filter: 'invert(1)' }}
      />
    );
  }
  
  // Meta/Llama models
  if (provider === 'meta' || name.includes('llama')) {
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg"
        alt="Meta"
        width={32}
        height={32}
        className="rounded-lg bg-blue-600 p-1"
        style={{ filter: 'invert(1)' }}
      />
    );
  }
  
  // DeepSeek models
  if (provider === 'deepseek' || name.includes('deepseek')) {
    return (
      <img
        src="https://avatars.githubusercontent.com/u/165393474?s=200&v=4"
        alt="DeepSeek"
        width={32}
        height={32}
        className="rounded-lg"
      />
    );
  }
  
  // XAI/Grok models
  if (provider === 'xai' || provider === 'x-ai' || name.includes('grok')) {
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg"
        alt="X.AI"
        width={32}
        height={32}
        className="rounded-lg bg-black p-1"
        style={{ filter: 'invert(1)' }}
      />
    );
  }
  
  // Mistral models
  if (provider === 'mistral' || name.includes('mistral')) {
    return (
      <img
        src="https://mistral.ai/images/logo_hubc88c4ece131b91c7cb753f40e9e1cc5_2589_256x0_resize_q97_h2_lanczos_3.webp"
        alt="Mistral"
        width={32}
        height={32}
        className="rounded-lg"
      />
    );
  }
  
  // Groq models
  if (provider === 'groq' || name.includes('groq')) {
    return (
      <img
        src="https://groq.com/wp-content/uploads/2024/03/PBG-mark1-color.svg"
        alt="Groq"
        width={32}
        height={32}
        className="rounded-lg"
      />
    );
  }
  
  // Perplexity models
  if (provider === 'perplexity' || name.includes('perplexity')) {
    return (
      <img
        src="https://yt3.googleusercontent.com/dW6to_x5Crmeh7yi-MnV2VhqJBGw_6LylvdsJcsV7i7JBWyWTiVgAoV_cdH3zLVHZpJaHcVOgA=s900-c-k-c0x00ffffff-no-rj"
        alt="Perplexity"
        width={32}
        height={32}
        className="rounded-lg"
      />
    );
  }
  
  // Default fallback
  return (
    <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center text-white text-xs font-medium">
      {provider.charAt(0).toUpperCase()}
    </div>
  );
};

interface ModelSelectorProps {
  session: Session;
  selectedModelId: string;
  onSelect: (id: string) => void;
  className?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  session,
  selectedModelId,
  onSelect,
  className,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetcher('/api/openrouter/models')
      .then((data) => {
        // OpenRouter returns { data: ModelInfo[] }
        setModels(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load models');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className={cn('min-w-[180px]', className)}>Loading models...</div>;
  }
  if (error) {
    return <div className={cn('min-w-[180px] text-red-500', className)}>{error}</div>;
  }

  const selected = models.find((m) => m.id === selectedModelId) || models[0];

  return (
    <Select
      value={selected?.id}
      onValueChange={onSelect}
    >
      <SelectTrigger className={cn('min-w-[180px]', className)}>
        <div className="flex items-center gap-2">
          {selected && getModelIcon(selected.id, selected.name)}
          <span>{selected ? selected.name : 'Select model'}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {getModelIcon(model.id, model.name)}
              <span>{model.name}</span>
            </div>
            {model.description && (
              <div className="text-xs text-muted-foreground ml-2">{model.description}</div>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};