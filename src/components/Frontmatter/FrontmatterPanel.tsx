import { useState, useCallback } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { 
  COMMON_FRONTMATTER_FIELDS, 
  updateFrontmatterField,
  parseTags,
  formatTags
} from '@/utils/frontmatterParser';
import { cn } from '@/utils/cn';

/**
 * FrontmatterPanel - Collapsible panel for editing document frontmatter
 * 
 * Displays common fields (title, author, date, tags) and allows
 * custom key-value pairs.
 */
export function FrontmatterPanel(): JSX.Element | null {
  const { frontmatter, setFrontmatter } = useEditorStore();
  const [isOpen, setIsOpen] = useState(true);
  const [newFieldKey, setNewFieldKey] = useState('');

  // Don't render if no frontmatter (but allow creating new)
  const hasFrontmatter = frontmatter && Object.keys(frontmatter).length > 0;

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setFrontmatter(updateFrontmatterField(frontmatter, key, value));
  }, [frontmatter, setFrontmatter]);

  const handleAddField = useCallback(() => {
    if (!newFieldKey.trim()) return;
    
    const key = newFieldKey.trim().toLowerCase().replace(/\s+/g, '_');
    // Use a space placeholder - empty string would be removed by updateFrontmatterField
    // The field will appear and user can edit it
    const newFrontmatter = { ...(frontmatter || {}), [key]: '' };
    setFrontmatter(newFrontmatter);
    setNewFieldKey('');
  }, [newFieldKey, frontmatter, setFrontmatter]);

  const handleRemoveField = useCallback((key: string) => {
    if (!frontmatter) return;
    const { [key]: _removed, ...rest } = frontmatter;
    void _removed; // Intentionally unused - we're removing this key
    setFrontmatter(Object.keys(rest).length > 0 ? rest : null);
  }, [frontmatter, setFrontmatter]);

  const handleCreateFrontmatter = useCallback(() => {
    setFrontmatter({ title: '' });
  }, [setFrontmatter]);

  // Get custom fields (not in common fields list)
  const customFields = frontmatter 
    ? Object.keys(frontmatter).filter(
        key => !COMMON_FRONTMATTER_FIELDS.some(f => f.key === key)
      )
    : [];

  if (!hasFrontmatter) {
    return (
      <div className="frontmatter-panel border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
        <button
          onClick={handleCreateFrontmatter}
          className={cn(
            "flex items-center gap-2 w-full px-4 py-2",
            "text-sm text-[var(--theme-text-muted)]",
            "hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-secondary)]",
            "transition-colors"
          )}
        >
          <Plus size={14} />
          <span>Add frontmatter</span>
        </button>
      </div>
    );
  }

  return (
    <div className="frontmatter-panel border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 w-full px-4 py-2",
          "text-sm font-medium text-[var(--theme-text-secondary)]",
          "hover:bg-[var(--theme-bg-hover)]",
          "transition-colors"
        )}
      >
        <ChevronDown 
          size={14} 
          className={cn(
            "transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
        <span>Frontmatter</span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Common fields */}
            {COMMON_FRONTMATTER_FIELDS.map(field => (
              <FieldEditor
                key={field.key}
                field={field}
                value={frontmatter?.[field.key]}
                onChange={(value) => handleFieldChange(field.key, value)}
              />
            ))}
            
            {/* Custom fields */}
            {customFields.map(key => (
              <div key={key} className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={String(frontmatter?.[key] ?? '')}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm rounded",
                      "bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)]",
                      "text-[var(--theme-text-primary)]",
                      "focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]"
                    )}
                  />
                </div>
                <button
                  onClick={() => handleRemoveField(key)}
                  className="self-end p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--color-error)] transition-colors"
                  title="Remove field"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom field */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
              placeholder="New field name (e.g. category)"
              title="Type a field name and press Enter or click + to add"
              className={cn(
                "flex-1 px-2 py-1.5 text-sm rounded",
                "bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)]",
                "text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)]",
                "focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]"
              )}
            />
            <button
              onClick={handleAddField}
              disabled={!newFieldKey.trim()}
              title="Add custom field"
              className={cn(
                "px-2 py-1.5 text-sm rounded transition-colors",
                "bg-[var(--theme-accent-primary)] text-white",
                "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldEditorProps {
  field: typeof COMMON_FRONTMATTER_FIELDS[number];
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldEditor({ field, value, onChange }: FieldEditorProps): JSX.Element {
  // For tags, we need local state to allow typing commas
  // Only parse and save on blur
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const displayValue = field.type === 'tags' 
    ? formatTags(value as string[] | undefined)
    : String(value ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field.type === 'tags') {
      // Store raw input locally while editing
      setLocalValue(e.target.value);
    } else {
      onChange(e.target.value);
    }
  };

  const handleFocus = () => {
    if (field.type === 'tags') {
      setIsEditing(true);
      setLocalValue(displayValue);
    }
  };

  const handleBlur = () => {
    if (field.type === 'tags') {
      setIsEditing(false);
      onChange(parseTags(localValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (field.type === 'tags' && e.key === 'Enter') {
      e.preventDefault();
      onChange(parseTags(localValue));
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div>
      <label className="block text-xs text-[var(--theme-text-muted)] mb-1">
        {field.label}
      </label>
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        value={field.type === 'tags' && isEditing ? localValue : displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={field.placeholder}
        className={cn(
          "w-full px-2 py-1.5 text-sm rounded",
          "bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)]",
          "text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]"
        )}
      />
    </div>
  );
}
