"use client";

import Lottie from "lottie-react";
import loadingAnimation from "../../../assets/animation/plan-loading.json";

export function PlansLoadingParrot() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Lottie
        animationData={loadingAnimation}
        loop
        autoplay
        style={{ width: 180, height: 180 }}
      />
      <span className="text-sm text-slate-500">
        Buscando os melhores planos pra você...
      </span>
    </div>
  );
}
