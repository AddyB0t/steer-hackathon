"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Card = {
  id: number;
  content: React.ReactNode;
  className: string;
  thumbnail?: string;
  preview?: React.ReactNode;
  badge?: React.ReactNode;
};

// The open card is `fixed` rather than `absolute` so it centres in the viewport
// even when the grid is taller than the screen, and its content scrolls because
// review panels are longer than the demo captions.
export const LayoutGrid = ({ cards }: { cards: Card[] }) => {
  const [selected, setSelected] = useState<Card | null>(null);
  const [lastSelected, setLastSelected] = useState<Card | null>(null);

  const handleClick = (card: Card) => {
    setLastSelected(selected);
    setSelected(card);
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  const tile = "bg-white rounded-3xl h-full w-full cursor-pointer shadow-[0_10px_30px_rgba(20,83,45,0.08)] ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(20,83,45,0.14)]";

  return (
    <div className="w-full h-full p-4 sm:p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 auto-rows-[420px] md:auto-rows-[400px] max-w-7xl mx-auto gap-4 md:gap-5 relative">
      {cards.map((card, i) => (
        <div key={i} className={cn(card.className, "")}>
          <motion.div
            onClick={() => handleClick(card)}
            className={cn(
              card.className,
              "relative overflow-hidden",
              selected?.id === card.id
                ? "rounded-3xl cursor-default fixed inset-0 h-fit max-h-[92dvh] md:max-h-[88vh] w-[96vw] md:w-[92vw] xl:w-[80vw] max-w-7xl m-auto z-50 flex justify-center items-center flex-wrap flex-col bg-white shadow-2xl"
                : lastSelected?.id === card.id
                ? cn("z-40", tile)
                : tile
            )}
            layoutId={`card-${card.id}`}
          >
            {selected?.id === card.id && <SelectedCard selected={selected} onClose={handleOutsideClick} />}
            <ImageComponent card={card} />
            {selected?.id !== card.id && card.badge}
          </motion.div>
        </div>
      ))}
      <motion.div
        onClick={handleOutsideClick}
        className={cn(
          "fixed h-full w-full left-0 top-0 bg-forest opacity-0 z-10 backdrop-blur-sm",
          selected?.id ? "pointer-events-auto" : "pointer-events-none"
        )}
        animate={{ opacity: selected?.id ? 0.35 : 0 }}
      />
    </div>
  );
};

const frame = "absolute left-3 right-3 top-3 bottom-[108px] overflow-hidden rounded-2xl bg-gradient-to-b from-mint to-mint-deep";

const ImageComponent = ({ card }: { card: Card }) => {
  if (card.preview) {
    return (
      <motion.div layoutId={`image-${card.id}-image`} className={cn(frame, "flex items-center justify-center p-5")}>
        {card.preview}
      </motion.div>
    );
  }
  return (
    <motion.img
      layoutId={`image-${card.id}-image`}
      src={card.thumbnail}
      height="500"
      width="500"
      className={cn(frame, "h-[calc(100%-120px)] w-[calc(100%-1.5rem)] object-contain p-3 transition duration-200")}
      alt="thumbnail"
    />
  );
};

const SelectedCard = ({ selected, onClose }: { selected: Card | null; onClose: () => void }) => {
  const scroller = useRef<HTMLDivElement>(null);
  // The layout animation can leave the panel part-scrolled; always open at the top.
  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollTo({ top: 0 }), 350);
    return () => clearTimeout(t);
  }, [selected?.id]);

  return (
    <div className="bg-transparent max-h-[92dvh] md:max-h-[88vh] w-full flex flex-col justify-start rounded-3xl relative z-[60]">
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        className="absolute inset-0 h-full w-full bg-white z-10"
      />
      <button
        onClick={(e) => (e.stopPropagation(), onClose())}
        className="absolute right-3 top-3 md:right-5 md:top-5 z-[80] rounded-full bg-mint px-3 py-1 text-sm font-semibold text-forest hover:bg-mint-deep"
      >
        Close
      </button>
      <motion.div
        ref={scroller}
        layoutId={`content-${selected?.id}`}
        initial={{
          opacity: 0,
          y: 100,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: 100,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="relative px-4 sm:px-6 md:px-10 pt-6 md:pt-8 pb-8 z-[70] max-h-[92dvh] md:max-h-[88vh] w-full overflow-y-auto"
      >
        {selected?.content}
      </motion.div>
    </div>
  );
};
