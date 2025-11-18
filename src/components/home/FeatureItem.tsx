import Image, { StaticImageData } from "next/image";
import React from "react";

interface FeatureItemProps {
  icon: StaticImageData;
  title: string;
  description: string;
  iconSize?: "small" | "medium" | "large";
  iconBgColor?: string;
  widthIcon?: number;
  heightIcon?: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  icon,
  title,
  description,
  iconBgColor = "bg-secondary",
  widthIcon = 28,
  heightIcon = 28,
}) => {


  return (
    <div className="flex gap-4 items-start">
      <div
        className={`flex items-center justify-center  ${iconBgColor} rounded-[999px] min-w-16 min-h-16`}
      >
        <Image
          src={icon}
          alt={title}
          width={widthIcon}
          height={heightIcon}
          className=""
        />
      </div>
      <div className="flex flex-col">
        <h3 className="text-xl font-semibold text-gray-700">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-5 text-gray-700">{description}</p>
      </div>
    </div>
  );
};

export default FeatureItem;
