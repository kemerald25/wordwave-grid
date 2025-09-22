import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Users, Clock, Hash, Sparkles } from 'lucide-react';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (roomData: {
    name: string;
    maxPlayers: number;
    roundTime: number;
    rounds: number;
  }) => void;
}

export function CreateRoomModal({ open, onClose, onCreate }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roundTime, setRoundTime] = useState([15]);
  const [rounds, setRounds] = useState(10);

  const handleCreate = () => {
    if (!roomName.trim()) return;
    
    onCreate({
      name: roomName.trim(),
      maxPlayers,
      roundTime: roundTime[0],
      rounds
    });
    
    // Reset form
    setRoomName('');
    setMaxPlayers(4);
    setRoundTime([15]);
    setRounds(10);
    onClose();
  };

  const generateRandomName = () => {
    const adjectives = ['Cyber', 'Neon', 'Electric', 'Digital', 'Quantum', 'Neural', 'Plasma', 'Holographic'];
    const nouns = ['Arena', 'Nexus', 'Zone', 'Grid', 'Chamber', 'Circuit', 'Portal', 'Matrix'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    setRoomName(`${adj} ${noun}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-brand-500/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-500 text-center">
            Create New Room
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="roomName" className="text-foreground">Room Name</Label>
            <div className="flex gap-2">
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name..."
                className="bg-input border-border focus:border-brand-500 focus:ring-brand-500"
                maxLength={30}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateRandomName}
                className="shrink-0 border-brand-500/30 hover:border-brand-500"
                title="Generate random name"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Max Players */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              Max Players
            </Label>
            <Select value={maxPlayers.toString()} onValueChange={(value) => setMaxPlayers(parseInt(value))}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel border-brand-500/20">
                {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} players
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Round Time */}
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              Round Time: {roundTime[0]} seconds
            </Label>
            <Slider
              value={roundTime}
              onValueChange={setRoundTime}
              min={10}
              max={30}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10s (Fast)</span>
              <span>20s (Normal)</span>
              <span>30s (Relaxed)</span>
            </div>
          </div>

          {/* Number of Rounds */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Hash className="w-4 h-4 text-brand-500" />
              Number of Rounds
            </Label>
            <Select value={rounds.toString()} onValueChange={(value) => setRounds(parseInt(value))}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel border-brand-500/20">
                {[5, 10, 15, 20, 25].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} rounds
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border hover:border-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!roomName.trim()}
              className="btn-neon flex-1"
            >
              Create Room
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}