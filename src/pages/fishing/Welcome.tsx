import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Trophy, Radar, MapPin, Fish, BellRing, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Welcome() {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  const requestPushPermission = async () => {
    try {
      if (!("Notification" in window)) {
        toast.error("הדפדפן שלך לא תומך בהתראות פוש");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushEnabled(true);
        toast.success("מעולה! תקבל התראות על חלונות דייג.");
        new Notification("ברוך הבא לדיגון! 🎣", {
          body: "ככה ייראו ההתראות שתקבל כשהחברים שלך יתפסו דגים.",
          icon: "/fishing_sunset_bg.jpg" // fallback icon
        });
      } else {
        toast.error("ההתראות נחסמו. תוכל לשנות זאת בהגדרות הדפדפן.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/");
  };

  const nextSlide = () => {
    if (emblaApi) emblaApi.scrollNext();
  };

  const slides = [
    {
      title: "ברוך הבא לדיגון",
      desc: "אפליקציית הדייג המתקדמת בישראל. הקהילה שלנו מחכה לתפיסות שלך!",
      icon: <Fish className="w-16 h-16 text-cyan-400 mx-auto animate-bounce" />,
      color: "from-cyan-900 to-slate-950"
    },
    {
      title: "מערכת דירוג ומוניטין",
      desc: "שתף את התפיסות שלך, קבל לייקים מהקהילה, וטפס בסולם הדרגות מדייג מתחיל ועד לפוסידון!",
      icon: <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />,
      color: "from-amber-900 to-slate-950"
    },
    {
      title: "מנתח נקודות בינה מלאכותית",
      desc: "שמור את התפיסות שלך כדיסקרטיות, וה-AI שלנו ינתח עבורך מתי כדאי לחזור לאותה נקודה.",
      icon: <Radar className="w-16 h-16 text-emerald-400 mx-auto" />,
      color: "from-emerald-900 to-slate-950"
    },
    {
      title: "הישארו מעודכנים",
      desc: "קבלו התראות פוש כשיש חלונות דייג פסיכיים או כשחברים מגיבים לכם על תפיסות.",
      icon: <BellRing className="w-16 h-16 text-rose-400 mx-auto animate-pulse" />,
      color: "from-rose-900 to-slate-950",
      action: (
        <Button 
          onClick={requestPushPermission}
          disabled={pushEnabled}
          variant="outline"
          className="mt-6 border-white/20 bg-white/10 text-white rounded-2xl h-14 font-black w-full"
        >
          {pushEnabled ? <><ShieldCheck className="w-5 h-5 ml-2 text-emerald-400" /> התראות מופעלות</> : "אשר קבלת התראות PUSH"}
        </Button>
      )
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-black text-white relative flex flex-col max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-[url('/fishing_sunset_bg.jpg')] bg-cover bg-center opacity-20"></div>
      
      <div className="flex-1 relative z-10 flex flex-col justify-center">
        <div className="overflow-hidden w-full h-full flex flex-col justify-center" ref={emblaRef}>
          <div className="flex h-full items-center">
            {slides.map((slide, index) => (
              <div className="flex-[0_0_100%] min-w-0 px-8 text-center" key={index}>
                <div
                  className={`transition-all duration-500 transform ${selectedIndex === index ? "opacity-100 scale-100" : "opacity-0 scale-90"} bg-gradient-to-b ${slide.color} border border-white/10 p-8 rounded-[3rem] shadow-2xl backdrop-blur-xl`}
                >
                  <div className="bg-white/5 w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/20">
                    {slide.icon}
                  </div>
                  <h2 className="text-3xl font-black mb-4 tracking-tight drop-shadow-md">{slide.title}</h2>
                  <p className="text-slate-300 text-base leading-relaxed font-medium">
                    {slide.desc}
                  </p>
                  {slide.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 relative z-10 bg-gradient-to-t from-black via-black to-transparent pt-12">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-500 ${i === selectedIndex ? "w-8 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" : "w-2 bg-white/20"}`}
            />
          ))}
        </div>
        
        {selectedIndex === slides.length - 1 ? (
          <Button 
            onClick={handleFinish}
            className="w-full h-16 rounded-3xl bg-cyan-500 hover:bg-cyan-600 text-xl font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.3)] animate-in slide-in-from-bottom-4 zoom-in-95"
          >
            <Sparkles className="w-6 h-6 ml-2" />
            קדימה, בואו נדוג!
          </Button>
        ) : (
          <Button 
            onClick={nextSlide}
            variant="outline"
            className="w-full h-16 rounded-3xl border-white/20 bg-white/5 hover:bg-white/10 text-lg font-bold text-white"
          >
            המשך <ArrowRight className="w-5 h-5 mr-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
