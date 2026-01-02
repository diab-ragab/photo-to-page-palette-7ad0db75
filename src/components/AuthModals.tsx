import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AuthModalsProps {
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  registerOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
}

export const AuthModals = ({ loginOpen, setLoginOpen, registerOpen, setRegisterOpen }: AuthModalsProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Login state
  const [loginData, setLoginData] = useState({ login: "", passwd: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register state
  const [registerData, setRegisterData] = useState({
    login: "",
    passwd: "",
    repasswd: "",
    email: ""
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.login || !loginData.passwd) {
      toast({
        title: "Error",
        description: "Please fill in all fields!",
        variant: "destructive"
      });
      return;
    }

    setLoginLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("login", loginData.login);
      formData.append("passwd", loginData.passwd);

      const response = await fetch("/api/login.php", {
        method: "POST",
        body: formData
      });

      const result = await response.text();
      
      if (result.includes("success") || response.ok) {
        toast({
          title: "Success",
          description: "Login successful!"
        });
        setLoginOpen(false);
        setLoginData({ login: "", passwd: "" });
      } else {
        toast({
          title: "Error",
          description: result || "Login failed!",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Connection error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation matching your PHP
    if (!registerData.login || !registerData.passwd || !registerData.repasswd || !registerData.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields!",
        variant: "destructive"
      });
      return;
    }

    if (registerData.login.length < 4 || registerData.login.length > 10) {
      toast({
        title: "Error",
        description: "The account name must have 4 to 10 characters!",
        variant: "destructive"
      });
      return;
    }

    if (registerData.passwd.length < 3 || registerData.passwd.length > 16) {
      toast({
        title: "Error",
        description: "The password must have 3 to 16 characters!",
        variant: "destructive"
      });
      return;
    }

    if (registerData.passwd !== registerData.repasswd) {
      toast({
        title: "Error",
        description: "Passwords did not match!",
        variant: "destructive"
      });
      return;
    }

    setRegisterLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("login", registerData.login);
      formData.append("passwd", registerData.passwd);
      formData.append("repasswd", registerData.repasswd);
      formData.append("email", registerData.email);

      const response = await fetch("/api/register.php", {
        method: "POST",
        body: formData
      });

      const result = await response.text();
      
      if (result.includes("successfully") || response.ok) {
        toast({
          title: "Success",
          description: "New user added successfully!"
        });
        setRegisterOpen(false);
        setRegisterData({ login: "", passwd: "", repasswd: "", email: "" });
        // Open login modal after successful registration
        setLoginOpen(true);
      } else if (result.includes("already exists")) {
        toast({
          title: "Error",
          description: "User already exists!",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: result || "Registration failed!",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Connection error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <>
      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary text-center">
              Login
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Enter your credentials to access your account
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-foreground">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={loginData.login}
                  onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={loginLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.passwd}
                  onChange={(e) => setLoginData({ ...loginData, passwd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={loginLoading}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginLoading}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setLoginOpen(false);
                  setRegisterOpen(true);
                }}
                className="text-primary hover:underline"
              >
                Register here
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary text-center">
              Create Account
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Register a new game account
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleRegister} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="register-username" className="text-foreground">
                Username <span className="text-xs text-muted-foreground">(4-10 characters)</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-username"
                  type="text"
                  placeholder="Enter your username"
                  value={registerData.login}
                  onChange={(e) => setRegisterData({ ...registerData, login: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={registerLoading}
                  minLength={4}
                  maxLength={10}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="Enter your email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={registerLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-foreground">
                Password <span className="text-xs text-muted-foreground">(3-16 characters)</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Enter your password"
                  value={registerData.passwd}
                  onChange={(e) => setRegisterData({ ...registerData, passwd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={registerLoading}
                  minLength={3}
                  maxLength={16}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-repassword" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-repassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={registerData.repasswd}
                  onChange={(e) => setRegisterData({ ...registerData, repasswd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={registerLoading}
                  minLength={3}
                  maxLength={16}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerLoading}
            >
              {registerLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setRegisterOpen(false);
                  setLoginOpen(true);
                }}
                className="text-primary hover:underline"
              >
                Login here
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
