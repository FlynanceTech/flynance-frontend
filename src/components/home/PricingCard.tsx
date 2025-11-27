import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

interface BenefitProps {
  active: boolean;
  text: string;
}

const Benefit: React.FC<BenefitProps> = ({ active, text }) => {
  return (
    <div className="flex gap-2 items-center mt-5 w-full">
      <div

      >
       <Check color="#15B8A6" size="24"/>
      </div>
      <div
        className={`flex-1 shrink self-stretch my-auto text-md md:text-lg ${
          active ? "text-gray-700" : "text-neutral-300"
        } basis-4`}
      >
        {text}
      </div>
    </div>
  );
};

interface PricingCardProps {
  title: string;
  price: React.ReactNode;
  popular?: boolean;
  discount?: string;
  benefits: { text: string; active: boolean }[];
  buttonStyle?: "primary" | "secondary";
  buttonTitle?: string
  planType: string
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  popular = false,
  discount,
  benefits,
  buttonStyle = "secondary",
  buttonTitle= "Testar Gratuitamente",
  planType
}) => {
  return (
    <article className="relative w-full bg-white rounded-lg  basis-0  max-w-[500px]">
      {discount && (
        <span className="absolute bg-secondary right-0 gap-2.5 self-stretch px-8 py-2 my-auto text-lg font-medium text-white  rounded-tl-0 rounded-tr-lg rounded-bl-2xl">
          {discount}
        </span>
      )}
       {popular && (
            <span className="absolute bg-secondary right-0 z-10 gap-2.5 self-stretch px-8 py-2 my-auto text-lg font-medium text-white rounded-tl-0 rounded-tr-lg rounded-bl-2xl">
              Popular
            </span>
          )}
      <div className="flex flex-col items-center px-8 pt-8 pb-4 w-full font-bold text-gray-700 max-md:px-5">
        <div className="flex gap-10 justify-between items-center w-full">
          <h3 className="self-stretch my-auto text-2xl font-bold text-gray-700">
            {title}
          </h3>
        </div>
        <div className="mt-8 min-h-[92px]">{price}</div>
        <Link
          href={`/cadastro/checkout?plano=${planType}`}
          className={`flex items-center justify-center gap-2.5 self-stretch px-16 py-3 mt-8 w-full text-xl font-semibold rounded-[99px] max-md:px-5 cursor-pointer relative overflow-hidden transition-all duration-500
            ${
              buttonStyle === "primary"
                ? "text-white bg-gradient-to-r from-secondary via-[#3B82F5] to-secondary bg-[length:200%_200%] animate-gradient"
                : "text-neutral-500 border border-solid border-neutral-500"
            }`}
        >
          {buttonTitle}
        </Link>
      </div>
      <div className="px-8 pt-4 pb-8 w-full max-md:px-5">
        <h4 className="text-xl font-medium text-gray-700">Benefícios</h4>
        {benefits.map((benefit, index) => (
          <Benefit key={index} active={benefit.active} text={benefit.text} />
        ))}
      </div>
    </article>
  );
};

export default PricingCard;
