import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={true}
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-xl group-[.toaster]:border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-sm group-[.toast]:opacity-90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-emerald-500/95 group-[.toaster]:to-green-600/95 group-[.toaster]:text-white group-[.toaster]:border-emerald-400/50 group-[.toaster]:shadow-emerald-500/25",
          error:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-red-500/95 group-[.toaster]:to-rose-600/95 group-[.toaster]:text-white group-[.toaster]:border-red-400/50 group-[.toaster]:shadow-red-500/25",
          warning:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-amber-500/95 group-[.toaster]:to-orange-600/95 group-[.toaster]:text-white group-[.toaster]:border-amber-400/50 group-[.toaster]:shadow-amber-500/25",
          info:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-blue-500/95 group-[.toaster]:to-cyan-600/95 group-[.toaster]:text-white group-[.toaster]:border-blue-400/50 group-[.toaster]:shadow-blue-500/25",
          default:
            "group-[.toaster]:bg-background/95 group-[.toaster]:text-foreground group-[.toaster]:border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
