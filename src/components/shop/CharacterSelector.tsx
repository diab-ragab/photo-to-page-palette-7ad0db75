import { useState, useEffect } from "react";
import { User, Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = "https://woiendgame.online/api";

interface Character {
  roleId: number;
  name: string;
  level: number;
  profession: string;
  professionId: number;
  sex: number;
}

interface CharacterSelectorProps {
  onSelect: (roleId: number | null, characterName: string | null) => void;
  selectedRoleId: number | null;
}

export const CharacterSelector = ({ onSelect, selectedRoleId }: CharacterSelectorProps) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem("woi_session_token") || "";
        
        const response = await fetch(`${API_BASE}/user_characters.php`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Token": token,
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
        });

        const data = await response.json();

        if (data.success && data.characters) {
          setCharacters(data.characters);
          
          // Auto-select first character if none selected
          if (data.characters.length > 0 && !selectedRoleId) {
            onSelect(data.characters[0].roleId, data.characters[0].name);
          }
        } else {
          setError(data.message || "Failed to load characters");
        }
      } catch (err) {
        console.error("Failed to fetch characters:", err);
        setError("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const handleSelect = (value: string) => {
    const roleId = parseInt(value, 10);
    const character = characters.find(c => c.roleId === roleId);
    onSelect(roleId, character?.name || null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          Select Character
        </label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="p-3 bg-muted rounded-lg flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm">No characters found. Please create a character in-game first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <User className="w-4 h-4" />
        Deliver to Character
      </label>
      <Select 
        value={selectedRoleId?.toString() || ""} 
        onValueChange={handleSelect}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a character..." />
        </SelectTrigger>
        <SelectContent>
          {characters.map((char) => (
            <SelectItem key={char.roleId} value={char.roleId.toString()}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{char.name}</span>
                <span className="text-muted-foreground text-xs">
                  Lv.{char.level} {char.profession}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Items will be delivered to this character's in-game mailbox
      </p>
    </div>
  );
};
