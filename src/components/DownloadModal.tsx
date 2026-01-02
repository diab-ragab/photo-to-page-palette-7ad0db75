import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, HardDrive, Cloud, FileArchive } from "lucide-react";

interface DownloadModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const downloadLinks = [
  {
    name: "MEGA",
    icon: Cloud,
    url: "https://mega.nz/file/x3BCVb6B#2_nAOHbfXNzzAyEEpMg-Yn1wiPJRprs27jOm31_a9gA",
    color: "bg-red-600 hover:bg-red-700",
    description: "Fast & Secure Cloud Storage"
  },
  {
    name: "Google Drive",
    icon: HardDrive,
    url: "https://drive.google.com/file/d/1wYtPOZ5pWw4yVO4_R_wVlKxMvvkgJfJ3/view?usp=sharing",
    color: "bg-blue-600 hover:bg-blue-700",
    description: "Google Cloud Storage"
  },
  {
    name: "File.fm",
    icon: FileArchive,
    url: "https://files.fm/u/czrengvywk",
    color: "bg-emerald-600 hover:bg-emerald-700",
    description: "Alternative Download Mirror"
  }
];

export const DownloadModal = ({ open, setOpen }: DownloadModalProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center flex items-center justify-center gap-2">
            <Download className="h-6 w-6" />
            Download Game Client
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose your preferred download source
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {downloadLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button 
                variant="outline" 
                className={`w-full justify-start gap-3 h-auto py-4 ${link.color} text-white border-0 hover:text-white`}
              >
                <link.icon className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold">{link.name}</div>
                  <div className="text-xs opacity-80">{link.description}</div>
                </div>
                <Download className="h-4 w-4 ml-auto" />
              </Button>
            </a>
          ))}
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          All links contain the same game client. Choose whichever works best for you.
        </p>
      </DialogContent>
    </Dialog>
  );
};
