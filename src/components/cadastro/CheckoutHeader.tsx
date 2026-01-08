"use client";

import Image from "next/image";
import { Undo2, User, UserCheck, CreditCard, Check } from "lucide-react";
import clsx from "clsx";
import logo from "../../../assets/fly-logo.png";
import { CHECKOUT_STEPS } from "./checkoutSteps";
import { useRouter } from "next/navigation";


type CheckoutHeaderProps = {
  step: number; // índice atual (0, 1, 2)
};

export default function CheckoutHeader({ step }: CheckoutHeaderProps) {
  const router = useRouter()
  const clampedStep = Math.min(
    Math.max(step, 0),
    CHECKOUT_STEPS.length - 1
  );

  const switchIconSteps = (i: number) =>
    i === 0
      ? clampedStep > 0
        ? <UserCheck size={20} />
        : <User size={20} />
      : i === 1
        ? <CreditCard size={20} />
        : <Check size={20} />;

        
  const handleBack = () => {
    router.push('/'); 
  };

  return (
    <header className="bg-primary text-white lg:p-8 p-4 flex flex-col justify-start items-center gap-4 h-[200px]">
      {/* Linha superior: voltar + logo */}
      <div className="w-full max-w-6xl mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack} className="flex gap-4 items-center cursor-pointer">
            <Undo2 size={32} />
            <span className="font-semibold">Voltar</span>
          </button>
        </div>
        <Image
          src={logo}
          className="object-contain aspect-[1.86] w-[130px]"
          alt="Flynance Logo"
          width={130}
          height={50}
        />
      </div>

      {/* Stepper visual */}
{/*       <div className="max-w-6xl flex p-4 justify-between text-sm bg-secondary w-full rounded-md">
        {CHECKOUT_STEPS.map((label, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 text-center w-full"
          >
            <div
              className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center",
                clampedStep >= i
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {switchIconSteps(i)}
            </div>
            <span className="text-xs text-gray-100 font-medium">
              {label}
            </span>
          </div>
        ))}
      </div> */}
    </header>
  );
}
