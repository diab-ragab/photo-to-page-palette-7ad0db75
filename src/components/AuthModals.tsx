import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Mail, ArrowLeft, KeyRound, Shield, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema, 
  forgotPasswordSchema,
  checkRateLimit,
  getRateLimitRemainingTime
} from "@/lib/validation";

interface AuthModalsProps {
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  registerOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
  forgotPasswordOpen: boolean;
  setForgotPasswordOpen: (open: boolean) => void;
  changePasswordOpen: boolean;
  setChangePasswordOpen: (open: boolean) => void;
}

export const AuthModals = ({ 
  loginOpen, 
  setLoginOpen, 
  registerOpen, 
  setRegisterOpen,
  forgotPasswordOpen,
  setForgotPasswordOpen,
  changePasswordOpen,
  setChangePasswordOpen
}: AuthModalsProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Login state
  const [loginData, setLoginData] = useState({ login: "", passwd: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register state
  const [registerData, setRegisterData] = useState({
    login: "",
    passwd: "",
    repasswd: "",
    email: ""
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  // Forgot password state
  const [forgotData, setForgotData] = useState({ login: "", email: "", newPasswd: "", confirmPasswd: "" });
  const [forgotLoading, setForgotLoading] = useState(false);

  // Change password state
  const [changeData, setChangeData] = useState({ oldPasswd: "", newPasswd: "", confirmPasswd: "" });
  const [changeLoading, setChangeLoading] = useState(false);

  const [showGMChoice, setShowGMChoice] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit("login", 5, 60000)) {
      const remaining = getRateLimitRemainingTime("login");
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${remaining} seconds before trying again.`,
        variant: "destructive"
      });
      return;
    }

    // Validate input with zod
    const validation = loginSchema.safeParse(loginData);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Invalid input",
        variant: "destructive"
      });
      return;
    }

    setLoginLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("action", "login");
      formData.append("login", validation.data.login);
      formData.append("passwd", validation.data.passwd);

      const response = await fetch("https://woiendgame.online/api/auth.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        login(validation.data.login, result.user?.email || "", rememberMe);
        
        // Check if user is GM
        try {
          const gmResponse = await fetch(
            `https://woiendgame.online/api/check_gm.php?user=${encodeURIComponent(validation.data.login)}`
          );
          const gmData = await gmResponse.json();
          
          if (gmData.is_gm) {
            setShowGMChoice(true);
            setLoginData({ login: "", passwd: "" });
            setRememberMe(false);
            return;
          }
        } catch (gmError) {
          // Security: Don't expose GM check errors to console in production
        }
        
        toast({
          title: "Success",
          description: "Login successful!"
        });
        setLoginOpen(false);
        setLoginData({ login: "", passwd: "" });
        setRememberMe(false);
        navigate("/dashboard");
      } else {
        toast({
          title: "Error",
          description: result.message || "Invalid credentials",
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

  const handleGMChoice = (goToGM: boolean) => {
    setShowGMChoice(false);
    setLoginOpen(false);
    toast({
      title: "Success",
      description: "Login successful!"
    });
    navigate(goToGM ? "/gm-panel" : "/dashboard");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit("register", 3, 300000)) {
      const remaining = getRateLimitRemainingTime("register");
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${Math.ceil(remaining / 60)} minutes before trying again.`,
        variant: "destructive"
      });
      return;
    }

    // Validate input with zod
    const validation = registerSchema.safeParse(registerData);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Invalid input",
        variant: "destructive"
      });
      return;
    }

    setRegisterLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("action", "register");
      formData.append("username", validation.data.login);
      formData.append("password", validation.data.passwd);
      formData.append("email", validation.data.email);

      const response = await fetch("https://woiendgame.online/api/auth.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Account created successfully!"
        });
        setRegisterOpen(false);
        setRegisterData({ login: "", passwd: "", repasswd: "", email: "" });
        setLoginOpen(true);
      } else {
        toast({
          title: "Error",
          description: result.message || "Registration failed!",
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit("forgot", 3, 300000)) {
      const remaining = getRateLimitRemainingTime("forgot");
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${Math.ceil(remaining / 60)} minutes before trying again.`,
        variant: "destructive"
      });
      return;
    }

    // Validate input with zod
    const validation = forgotPasswordSchema.safeParse(forgotData);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Invalid input",
        variant: "destructive"
      });
      return;
    }

    setForgotLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("action", "reset");
      formData.append("login", validation.data.login);
      formData.append("email", validation.data.email);
      formData.append("newpasswd", validation.data.newPasswd);

      const response = await fetch("https://woiendgame.online/api/auth.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Password reset successfully!"
        });
        setForgotPasswordOpen(false);
        setForgotData({ login: "", email: "", newPasswd: "", confirmPasswd: "" });
        setLoginOpen(true);
      } else {
        toast({
          title: "Error",
          description: result.message || "Password reset failed!",
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
      setForgotLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit("change_password", 3, 300000)) {
      const remaining = getRateLimitRemainingTime("change_password");
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${Math.ceil(remaining / 60)} minutes before trying again.`,
        variant: "destructive"
      });
      return;
    }

    // Validate input with zod
    const validation = changePasswordSchema.safeParse(changeData);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Invalid input",
        variant: "destructive"
      });
      return;
    }

    setChangeLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("login", user?.username || "");
      formData.append("oldpasswd", validation.data.oldPasswd);
      formData.append("newpasswd", validation.data.newPasswd);

      const response = await fetch("https://woiendgame.online/api/change_password.php", {
        method: "POST",
        body: formData
      });

      const result = await response.text();
      
      if (result.includes("success") || response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully!"
        });
        setChangePasswordOpen(false);
        setChangeData({ oldPasswd: "", newPasswd: "", confirmPasswd: "" });
      } else {
        toast({
          title: "Error",
          description: "Password change failed! Check your current password.",
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
      setChangeLoading(false);
    }
  };

  return (
    <>
      {/* GM Choice - Mobile Drawer / Desktop Dialog */}
      {isMobile ? (
        <Drawer open={showGMChoice} onOpenChange={setShowGMChoice}>
          <DrawerContent>
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-2xl font-display text-primary">
                Welcome, GM!
              </DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                Where would you like to go?
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="space-y-3 p-4 pb-8">
              <Button 
                className="w-full" 
                onClick={() => handleGMChoice(true)}
              >
                <Shield className="mr-2 h-4 w-4" />
                Go to GM Panel
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleGMChoice(false)}
              >
                <User className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={(open) => {
        setLoginOpen(open);
        if (!open) setShowGMChoice(false);
      }}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          {showGMChoice && !isMobile ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-primary text-center">
                  Welcome, GM!
                </DialogTitle>
                <DialogDescription className="text-center text-muted-foreground">
                  Where would you like to go?
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3 mt-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleGMChoice(true)}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Go to GM Panel
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleGMChoice(false)}
                >
                  <User className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </>
          ) : (
            <>
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loginLoading}
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Remember me for 7 days
                  </Label>
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

                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginOpen(false);
                      setForgotPasswordOpen(true);
                    }}
                    className="text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
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
                </div>
              </form>
            </>
          )}
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

      {/* Forgot Password Modal */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary text-center">
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Enter your username and email to reset your password
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-username" className="text-foreground">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-username"
                  type="text"
                  placeholder="Enter your username"
                  value={forgotData.login}
                  onChange={(e) => setForgotData({ ...forgotData, login: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={forgotLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={forgotData.email}
                  onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={forgotLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgot-newpasswd" className="text-foreground">
                New Password <span className="text-xs text-muted-foreground">(3-16 characters)</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-newpasswd"
                  type="password"
                  placeholder="Enter new password"
                  value={forgotData.newPasswd}
                  onChange={(e) => setForgotData({ ...forgotData, newPasswd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={forgotLoading}
                  minLength={3}
                  maxLength={16}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgot-confirmpasswd" className="text-foreground">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-confirmpasswd"
                  type="password"
                  placeholder="Confirm new password"
                  value={forgotData.confirmPasswd}
                  onChange={(e) => setForgotData({ ...forgotData, confirmPasswd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={forgotLoading}
                  minLength={3}
                  maxLength={16}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
            
            <button
              type="button"
              onClick={() => {
                setForgotPasswordOpen(false);
                setLoginOpen(true);
              }}
              className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary text-center">
              Change Password
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Update your account password
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="change-oldpasswd" className="text-foreground">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="change-oldpasswd"
                  type="password"
                  placeholder="Enter current password"
                  value={changeData.oldPasswd}
                  onChange={(e) => setChangeData({ ...changeData, oldPasswd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={changeLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-newpasswd" className="text-foreground">
                New Password <span className="text-xs text-muted-foreground">(3-16 characters)</span>
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="change-newpasswd"
                  type="password"
                  placeholder="Enter new password"
                  value={changeData.newPasswd}
                  onChange={(e) => setChangeData({ ...changeData, newPasswd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={changeLoading}
                  minLength={3}
                  maxLength={16}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-confirmpasswd" className="text-foreground">Confirm New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="change-confirmpasswd"
                  type="password"
                  placeholder="Confirm new password"
                  value={changeData.confirmPasswd}
                  onChange={(e) => setChangeData({ ...changeData, confirmPasswd: e.target.value })}
                  className="pl-10 bg-background border-border focus:border-primary"
                  disabled={changeLoading}
                  minLength={3}
                  maxLength={16}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={changeLoading}
            >
              {changeLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
