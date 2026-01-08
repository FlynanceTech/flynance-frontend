"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import chatFly from "../../../assets/chat-fly.jpeg";
import dashboardMobile from "../../../assets/dashboard-mobile.png";

// ✅ vídeo principal (coloque em /public/videos/hero.mp4)
const HERO_VIDEO_SRC = "/videos/hero.mp4";

type Slide =
  | { type: "video"; key: string; src: string; poster?: string }
  | { type: "image"; key: string; src: any; alt: string };

const HeroSection = () => {
  const slides: Slide[] = useMemo(
    () => [
      {
        type: "video",
        key: "video",
        src: HERO_VIDEO_SRC,
        // opcional: poster pra antes de carregar
        poster: "/videos/hero-poster.jpg",
      },
      { type: "image", key: "chat", src: chatFly, alt: "Chat da Fly no WhatsApp" },
      { type: "image", key: "dash", src: dashboardMobile, alt: "Dashboard mobile da Flynance" },
    ],
    []
  );

  return (
    <section className="py-8 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-8">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-8 leading-tight">
            Simplifique sua vida financeira com{" "}
            <strong className="text-primary">Inteligência Artificial </strong>
            direto no seu <strong className="text-primary">WhatsApp</strong>
          </h1>

          <p className="text-highlight text-lg md:text-xl font-medium mb-4">
            Você no controle, sem fórmulas mágicas, trace metas e aprenda a cuidar do que é seu
            sem complicação, direto no WhatsApp.
          </p>

          <Link href="#pricing" className="bg-primary hover:bg-primary/90 rounded-full shadow-lg px-10 py-4">
            <span className="text-white flex items-center justify-center text-lg font-semibold">
              Começar agora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        {/* ✅ MOBILE: Slider (video + imagens) */}
        <div className="w-full lg:hidden">
          <PhoneCarousel slides={slides} />
        </div>

        {/* ✅ DESKTOP: mantém duas telas como você já tinha */}
        <div className="hidden lg:flex justify-center gap-4 md:gap-8 overflow-hidden p-4">
          <PhoneFrame tilt="-3">
            <Image
              src={chatFly}
              className="object-contain rounded-2xl"
              alt="Chat da Fly no WhatsApp"
              width={300}
              height={900}
              priority
            />
          </PhoneFrame>

          <PhoneFrame tilt="3">
            <Image
              src={dashboardMobile}
              className="object-contain rounded-2xl"
              alt="Dashboard mobile da Flynance"
              width={300}
              height={900}
            />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

/* ----------------------------- */
/* UI helpers */
/* ----------------------------- */

function PhoneFrame({ children, tilt }: { children: React.ReactNode; tilt: "-3" | "3" | string }) {
  const tiltClass =
    tilt === "-3"
      ? "transform -rotate-3 hover:rotate-0"
      : tilt === "3"
        ? "transform rotate-3 hover:rotate-0"
        : "transform hover:rotate-0";

  return (
    <div
      className={clsx(
        "w-[220px] md:w-[280px] bg-foreground rounded-3xl p-2 shadow-2xl transition-transform duration-300",
        tiltClass
      )}
    >
      {children}
    </div>
  );
}

function clsx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

/* ----------------------------- */
/* Mobile Carousel */
/* ----------------------------- */

function PhoneCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [isTouching, setIsTouching] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const goTo = (i: number) => setIndex((i + slides.length) % slides.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // autoplay (pausa quando usuário está interagindo)
  useEffect(() => {
    if (isTouching) return;
    const t = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(t);
  }, [isTouching, slides.length]);

  // se o slide atual for vídeo: tenta tocar (sem som) e pausa quando sai
  useEffect(() => {
    const slide = slides[index];
    const v = videoRef.current;
    if (!v) return;

    if (slide?.type === "video") {
      v.currentTime = 0;
      // autoplay mobile exige muted + playsInline
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [index, slides]);

  // swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    const dx = touchDeltaX.current;
    const threshold = 40;

    if (dx > threshold) prev();
    else if (dx < -threshold) next();

    touchStartX.current = null;
    touchDeltaX.current = 0;

    // solta o autoplay depois de um tempinho
    setTimeout(() => setIsTouching(false), 900);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div
        className="relative w-[260px] sm:w-[300px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* frame */}
        <div className="bg-foreground rounded-3xl p-2 shadow-2xl">
          <div className="rounded-2xl overflow-hidden bg-black">
            {/* track */}
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(${-index * 100}%)` }}
            >
              {slides.map((s) => (
                <div key={s.key} className="min-w-full">
                  {s.type === "video" ? (
                    <video
                      ref={videoRef}
                      className="w-full h-[520px] object-cover"
                      src={s.src}
                      poster={s.poster}
                      muted
                      playsInline
                      preload="metadata"
                      controls={false}
                    />
                  ) : (
                    <Image
                      src={s.src}
                      alt={s.alt}
                      className="w-full h-[520px] object-contain bg-white"
                      width={360}
                      height={700}
                      priority={s.key === "chat"}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* botões invisíveis (áreas clicáveis) */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={prev}
          className="absolute left-0 top-0 h-full w-1/3"
        />
        <button
          type="button"
          aria-label="Próximo"
          onClick={next}
          className="absolute right-0 top-0 h-full w-1/3"
        />
      </div>

      {/* dots */}
      <div className="flex items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goTo(i)}
            className={clsx(
              "h-2.5 rounded-full transition-all",
              i === index ? "w-7 bg-primary" : "w-2.5 bg-slate-300"
            )}
            aria-label={`Ir para ${i + 1}`}
          />
        ))}
      </div>

      {/* hint */}
      <p className="text-xs text-slate-500">Arraste para o lado para ver mais</p>
    </div>
  );
}
