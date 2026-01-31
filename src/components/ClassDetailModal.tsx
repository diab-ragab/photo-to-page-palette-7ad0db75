import { motion, AnimatePresence } from "framer-motion";
import { X, Sword, Shield, Zap, Heart, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClassData } from "@/lib/classData";

interface ClassDetailModalProps {
  classData: ClassData | null;
  isOpen: boolean;
  onClose: () => void;
}

const statIcons = {
  strength: Sword,
  defense: Shield,
  magic: Zap,
  speed: Star,
  health: Heart,
};

const statLabels = {
  strength: "Strength",
  defense: "Defense",
  magic: "Magic Power",
  speed: "Speed",
  health: "Vitality",
};

export const ClassDetailModal = ({ classData, isOpen, onClose }: ClassDetailModalProps) => {
  if (!classData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Header with Image */}
              <div className="relative h-48 md:h-64 overflow-hidden">
                <img
                  src={classData.image}
                  alt={classData.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm hover:bg-background/80"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Class Name */}
                <div className="absolute bottom-4 left-6">
                  <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground">
                    {classData.name}
                  </h2>
                  <p className="text-muted-foreground">{classData.description}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Stats Section */}
                <div>
                  <h3 className="text-lg font-semibold font-display mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Class Stats
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(classData.stats).map(([stat, value]) => {
                      const Icon = statIcons[stat as keyof typeof statIcons];
                      const label = statLabels[stat as keyof typeof statLabels];
                      return (
                        <div key={stat} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">{label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{value}/100</span>
                          </div>
                          <Progress value={value} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Skills Section */}
                <div>
                  <h3 className="text-lg font-semibold font-display mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Skills & Abilities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classData.skills.map((skill, index) => (
                      <motion.div
                        key={skill.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="text-2xl">{skill.icon}</div>
                        <div>
                          <h4 className="font-semibold text-sm">{skill.name}</h4>
                          <p className="text-xs text-muted-foreground">{skill.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Lore Section */}
                <div>
                  <h3 className="text-lg font-semibold font-display mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Lore & Background
                  </h3>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {classData.lore}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-center pt-4">
                  <Button variant="hero" size="lg" className="w-full md:w-auto">
                    Choose {classData.name}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
