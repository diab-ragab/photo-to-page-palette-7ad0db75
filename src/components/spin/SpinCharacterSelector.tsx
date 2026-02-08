import { useState, useEffect } from 'react';
import { User, AlertCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSpinCharacters, type SpinCharacter } from '@/lib/spinWheelApi';

const STORAGE_KEY = 'spin_selected_role_id';

interface SpinCharacterSelectorProps {
  onSelect: (roleId: number | null, characterName: string | null) => void;
  selectedRoleId: number | null;
}

export function SpinCharacterSelector({ onSelect, selectedRoleId }: SpinCharacterSelectorProps) {
  const [characters, setCharacters] = useState<SpinCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const chars = await fetchSpinCharacters();
      setCharacters(chars);

      if (chars.length > 0) {
        // Check for stored selection
        const storedRoleId = localStorage.getItem(STORAGE_KEY);
        const storedId = storedRoleId ? parseInt(storedRoleId, 10) : null;

        // If stored role_id exists and is in the list, use it
        const storedChar = storedId ? chars.find(c => c.RoleID === storedId) : null;
        
        if (storedChar) {
          onSelect(storedChar.RoleID, storedChar.Name);
        } else {
          // Auto-select highest level character
          const bestChar = chars.reduce((best, curr) => 
            curr.Level > best.Level ? curr : best
          , chars[0]);
          onSelect(bestChar.RoleID, bestChar.Name);
          localStorage.setItem(STORAGE_KEY, String(bestChar.RoleID));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch spin characters:', err);
      setError(err.message || 'Failed to load characters');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  const handleSelect = (value: string) => {
    const roleId = parseInt(value, 10);
    const character = characters.find(c => c.RoleID === roleId);
    if (character) {
      onSelect(roleId, character.Name);
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <User className="w-4 h-4" />
          Select Character
        </label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadCharacters}
          className="w-full"
        >
          <Loader2 className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="p-3 bg-muted rounded-lg flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm">No characters found. Create a character in-game first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <User className="w-4 h-4" />
        Reward Receiver
      </label>
      <Select 
        value={selectedRoleId?.toString() || ""} 
        onValueChange={handleSelect}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select a character..." />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border">
          {characters.map((char) => (
            <SelectItem key={char.RoleID} value={char.RoleID.toString()}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{char.Name}</span>
                <span className="text-muted-foreground text-xs">
                  (Lv {char.Level})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
