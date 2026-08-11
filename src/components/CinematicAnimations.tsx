"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function CinematicAnimations() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-hero-eyebrow]", { opacity: 0, y: -16, duration: 0.6 })
        .from("[data-hero-headline]", { opacity: 0, y: 40, duration: 0.9 }, "-=0.3")
        .from("[data-hero-subtitle]", { opacity: 0, y: 24, duration: 0.7 }, "-=0.5")
        .from("[data-hero-cta] > *", { opacity: 0, y: 20, duration: 0.6, stagger: 0.15 }, "-=0.4");

      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el, i) => {
        gsap.to(el, {
          y: -10,
          duration: 3 + (i % 3) * 0.4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.15,
        });

        el.addEventListener("mousemove", (e) => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(el, { rotateY: x * 12, rotateX: -y * 12, duration: 0.4, ease: "power2.out", transformPerspective: 800 });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
        });
      });

      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 48,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
        });
      });

      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
        btn.addEventListener("mousemove", (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: "power2.out" });
        });
        btn.addEventListener("mouseleave", () => {
          gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
