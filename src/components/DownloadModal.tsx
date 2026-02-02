import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, HardDrive, Cloud, FileArchive, Loader2 } from "lucide-react";
import { getSiteSettings } from "@/lib/siteSettingsApi";

interface DownloadModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface DownloadLink {
  name: string;
  icon: typeof Cloud;
  url: string;
  color: string;
  description: string;
}

export const DownloadModal = ({ open, setOpen }: DownloadModalProps) => {
  const [loading, setLoading] = useState(true);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);

  useEffect(() => {
    if (!open) return;
    
    setLoading(true);
    getSiteSettings().then(settings => {
      setDownloadLinks([
        {
          name: "MEGA",
          icon: Cloud,
          url: settings.download_mega,
          color: "bg-red-600 hover:bg-red-700",
          description: "Fast & Secure Cloud Storage"
        },
        {
          name: "Google Drive",
          icon: HardDrive,
          url: settings.download_gdrive,
          color: "bg-blue-600 hover:bg-blue-700",
          description: "Google Cloud Storage"
        },
        {
          name: "File.fm",
          icon: FileArchive,
          url: settings.download_filefm,
          color: "bg-emerald-600 hover:bg-emerald-700",
          description: "Alternative Download Mirror"
        }
      ]);
      setLoading(false);
    });
  }, [open]);

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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            downloadLinks.map((link) => (
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
            ))
          )}
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          All links contain the same game client. Choose whichever works best for you.
        </p>
      </DialogContent>
    </Dialog>
  );
};
