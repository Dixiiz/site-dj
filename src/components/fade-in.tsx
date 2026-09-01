"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const MotionSection = motion.section;
const MotionAside = motion.aside;
const MotionDiv = motion.div;

export function FadeIn({
  children,
  delay = 0,
  className,
  y = 24,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: "div" | "section" | "aside";
}) {
  const MotionTag = as === "section" ? MotionSection : as === "aside" ? MotionAside : MotionDiv;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </MotionTag>
  );
}
