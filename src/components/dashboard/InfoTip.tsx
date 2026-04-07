"use client";

import { useState } from "react";

interface Props {
  text: string;
}

export default function InfoTip({ text }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-[10px] text-[#5A6A7A] hover:text-[#8899AA] cursor-help select-none"
      >
        i
      </span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-2 bg-[#1A2332] border border-[#1E2A3A] rounded-sm shadow-lg">
          <p className="text-[10px] text-[#E8EAED]/80 leading-relaxed">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#1E2A3A]" />
        </div>
      )}
    </span>
  );
}
