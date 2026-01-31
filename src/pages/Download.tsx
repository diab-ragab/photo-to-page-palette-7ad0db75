import { motion } from "framer-motion";
import { Download as DownloadIcon, Monitor, Smartphone, CheckCircle2, HardDrive, Cpu, MemoryStick, Wifi, Shield, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

const DownloadPage = () => {
  const downloadUrl = "https://example.com/download/game-client.exe";

  const platforms = [
    {
      name: "Windows",
      icon: Monitor,
      version: "v2.5.1",
      size: "4.2 GB",
      recommended: true,
      downloadUrl: downloadUrl,
      requirements: "Windows 10/11 64-bit"
    },
    {
      name: "macOS",
      icon: Monitor,
      version: "v2.5.1",
      size: "4.5 GB",
      recommended: false,
      downloadUrl: "#",
      requirements: "macOS 12.0+",
      comingSoon: true
    },
    {
      name: "Android",
      icon: Smartphone,
      version: "v2.5.0",
      size: "2.8 GB",
      recommended: false,
      downloadUrl: "#",
      requirements: "Android 10+",
      comingSoon: true
    }
  ];

  const systemRequirements = {
    minimum: [
      { icon: Cpu, label: "CPU", value: "Intel Core i3-6100 / AMD FX-6300" },
      { icon: MemoryStick, label: "RAM", value: "8 GB" },
      { icon: HardDrive, label: "Storage", value: "20 GB SSD" },
      { icon: Monitor, label: "GPU", value: "NVIDIA GTX 750 Ti / AMD R7 360" },
      { icon: Wifi, label: "Network", value: "Broadband Internet" }
    ],
    recommended: [
      { icon: Cpu, label: "CPU", value: "Intel Core i5-9400 / AMD Ryzen 5 3600" },
      { icon: MemoryStick, label: "RAM", value: "16 GB" },
      { icon: HardDrive, label: "Storage", value: "20 GB NVMe SSD" },
      { icon: Monitor, label: "GPU", value: "NVIDIA GTX 1660 / AMD RX 5600 XT" },
      { icon: Wifi, label: "Network", value: "Broadband Internet" }
    ]
  };

  const installationSteps = [
    {
      step: 1,
      title: "Download the Client",
      description: "Click the download button for your platform. The installer will begin downloading automatically."
    },
    {
      step: 2,
      title: "Run the Installer",
      description: "Locate the downloaded file and run it. Follow the on-screen instructions to install the game."
    },
    {
      step: 3,
      title: "Create an Account",
      description: "Launch the game and create a new account or log in with your existing credentials."
    },
    {
      step: 4,
      title: "Start Playing",
      description: "Select your server, create your character, and begin your adventure in the world of immortals!"
    }
  ];

  return (
    <>
      <SEO
        title="Download"
        description="Download WOI Endgame game client free for Windows. Check system requirements, installation guide, and start playing the best World of Illusions private server."
        keywords="WOI Endgame download, game client, World of Illusions download, private server client, free MMORPG download, Windows game"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "WOI Endgame Game Client",
          operatingSystem: "Windows 10, Windows 11",
          applicationCategory: "GameApplication",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD"
          },
          downloadUrl: "https://woiendgame.com/download",
          softwareVersion: "2.5.1",
          fileSize: "4.2 GB"
        }}
      />
      <Navbar />
      
      <main className="min-h-screen pt-20 pb-16">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
          
          <div className="container px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                <FileDown className="w-3 h-3 mr-1" />
                Latest Version 2.5.1
              </Badge>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-display mb-4">
                Download <span className="text-gradient">Game Client</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Get started in minutes. Download the client, install, and join thousands of players in the ultimate War of the Immortals experience.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Download Options */}
        <section className="py-12 md:py-16">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold font-display text-center mb-8">
                Choose Your Platform
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {platforms.map((platform, index) => (
                  <motion.div
                    key={platform.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className={`relative h-full transition-all duration-300 hover:border-primary/50 ${platform.recommended ? 'border-primary/30 bg-primary/5' : ''}`}>
                      {platform.recommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground">
                            Recommended
                          </Badge>
                        </div>
                      )}
                      {platform.comingSoon && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge variant="secondary">
                            Coming Soon
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pt-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <platform.icon className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="font-display">{platform.name}</CardTitle>
                        <CardDescription>{platform.requirements}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                          <span>{platform.version}</span>
                          <span>•</span>
                          <span>{platform.size}</span>
                        </div>
                        <Button
                          className="w-full"
                          variant={platform.recommended ? "default" : "outline"}
                          disabled={platform.comingSoon}
                          onClick={() => !platform.comingSoon && window.open(platform.downloadUrl, '_blank')}
                        >
                          <DownloadIcon className="w-4 h-4 mr-2" />
                          {platform.comingSoon ? 'Coming Soon' : 'Download'}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* System Requirements */}
        <section className="py-12 md:py-16 bg-card/30">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold font-display text-center mb-2">
                System Requirements
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Make sure your system meets these requirements for the best experience
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Minimum Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      Minimum Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {systemRequirements.minimum.map((req) => (
                      <div key={req.label} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <req.icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{req.label}</p>
                          <p className="text-sm text-muted-foreground">{req.value}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recommended Requirements */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      Recommended Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {systemRequirements.recommended.map((req) => (
                      <div key={req.label} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <req.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{req.label}</p>
                          <p className="text-sm text-muted-foreground">{req.value}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Installation Guide */}
        <section className="py-12 md:py-16">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold font-display text-center mb-2">
                Installation Guide
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Follow these simple steps to get started
              </p>
              
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border md:left-1/2 md:-translate-x-1/2" />
                  
                  {installationSteps.map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`relative flex items-start gap-4 mb-8 last:mb-0 ${
                        index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                      }`}
                    >
                      {/* Step number */}
                      <div className="relative z-10 w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2">
                        <span className="font-display font-bold text-primary-foreground">{step.step}</span>
                      </div>
                      
                      {/* Content */}
                      <Card className={`flex-1 md:w-[calc(50%-40px)] ${index % 2 === 0 ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-display">{step.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card p-8 md:p-12 text-center max-w-3xl mx-auto relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />
              
              <h2 className="text-2xl md:text-3xl font-bold font-display mb-4">
                Ready to Begin Your Journey?
              </h2>
              <p className="text-muted-foreground mb-6">
                Download now and join thousands of players in the ultimate War of the Immortals experience!
              </p>
              <Button
                variant="hero"
                size="lg"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download for Windows
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Windows 10/11 • 64-bit • 4.2 GB
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default DownloadPage;