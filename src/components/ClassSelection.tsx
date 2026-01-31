import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { classes, ClassData } from "@/lib/classData";
import { ClassDetailModal } from "@/components/ClassDetailModal";


export const ClassSelection = () => {
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleClassClick = (classData: ClassData) => {
    setSelectedClass(classData);
    setIsModalOpen(true);
  };

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <>
      <section id="classes" className="py-16 md:py-24 scroll-mt-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold font-display mb-4">
              Choose Your Path
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              Select from distinct classes, each with unique abilities & skills. Whether you prefer to be a 
              fierce warrior or a powerful mage, there's a class waiting for you.
            </p>
          </motion.div>
        </div>

        {/* Carousel */}
        <div className="w-full px-4 md:px-12 lg:px-20">
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 3000,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {classes.map((classItem, index) => (
                <CarouselItem 
                  key={classItem.name} 
                  className="pl-2 md:pl-4 basis-[280px] md:basis-[300px] lg:basis-[320px]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => handleClassClick(classItem)}
                    className="group relative overflow-hidden rounded-xl cursor-pointer"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={classItem.image}
                        alt={classItem.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold font-display mb-2 text-foreground">
                        {classItem.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {classItem.description}
                      </p>
                      <span className="inline-flex items-center text-primary text-sm font-semibold group-hover:gap-2 transition-all">
                        View Skills <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center items-center gap-4 mt-8">
              <CarouselPrevious className="static translate-y-0" />
              
              {/* Dot Indicators */}
              <div className="flex gap-2">
                {classes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      current === index 
                        ? "bg-primary w-6" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>
      </section>

      <ClassDetailModal
        classData={selectedClass}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
