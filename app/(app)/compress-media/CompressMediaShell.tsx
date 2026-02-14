"use client";

import dynamic from "next/dynamic";

const CompressMediaClient = dynamic(() => import("./CompressMediaClient"), {
  ssr: false,
});

export default function CompressMediaShell() {
  return <CompressMediaClient />;
}
